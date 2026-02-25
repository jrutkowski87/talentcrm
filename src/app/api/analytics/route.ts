import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TALENT_PIPELINE_STAGES, MUSIC_PIPELINE_STAGES, STAGE_LABELS } from '@/lib/db/deals';

export async function GET() {
  try {
    const db = getDb();

    // 1. Pipeline value — SUM of fee_total grouped by status
    const pipelineValue = db.prepare(`
      SELECT status, COUNT(*) as deal_count, COALESCE(SUM(fee_total), 0) as total_value
      FROM deals
      WHERE status NOT IN ('archived', 'dead')
      GROUP BY status
    `).all() as { status: string; deal_count: number; total_value: number }[];

    // 2. Win/loss rate
    const statusCounts = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status IN ('dead', 'archived') THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN status NOT IN ('complete', 'dead', 'archived') THEN 1 ELSE 0 END) as active,
        COUNT(*) as total
      FROM deals
    `).get() as { won: number; lost: number; active: number; total: number };

    // 3. Deal velocity — avg time spent in each stage (from entering to leaving)
    const stageVelocity = db.prepare(`
      SELECT
        old_value as stage,
        AVG(
          CAST(
            julianday(created_at) -
            julianday(
              (SELECT MAX(t2.created_at) FROM deal_timeline t2
               WHERE t2.deal_id = deal_timeline.deal_id
               AND t2.event_type = 'status_change'
               AND t2.new_value = deal_timeline.old_value
               AND t2.created_at < deal_timeline.created_at)
            ) AS REAL
          )
        ) as avg_days,
        COUNT(*) as count
      FROM deal_timeline
      WHERE event_type = 'status_change'
        AND old_value IS NOT NULL
      GROUP BY old_value
      HAVING avg_days IS NOT NULL AND avg_days > 0
    `).all() as { stage: string; avg_days: number; count: number }[];

    // 4. Revenue by client — top clients by completed deal value
    const revenueByClient = db.prepare(`
      SELECT c.name as client_name, COUNT(*) as deal_count, COALESCE(SUM(d.fee_total), 0) as total_revenue
      FROM deals d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.status = 'complete' AND d.fee_total > 0
      GROUP BY d.client_id
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all() as { client_name: string; deal_count: number; total_revenue: number }[];

    // 5. Conversion funnel — count of deals that reached each pipeline stage
    const funnelData: { stage: string; label: string; count: number }[] = [];

    for (const stage of TALENT_PIPELINE_STAGES) {
      // Deals currently at or past this stage
      const stageIdx = TALENT_PIPELINE_STAGES.indexOf(stage);
      const stagesAtOrPast = TALENT_PIPELINE_STAGES.slice(stageIdx);
      const placeholders = stagesAtOrPast.map(() => '?').join(',');

      // Count deals currently at this stage or that transitioned through it
      const currentCount = (db.prepare(
        `SELECT COUNT(DISTINCT id) as count FROM deals
         WHERE deal_type != 'music' AND status IN (${placeholders})`
      ).get(...stagesAtOrPast) as { count: number }).count;

      const historicalCount = (db.prepare(
        `SELECT COUNT(DISTINCT deal_id) as count FROM deal_timeline
         WHERE event_type = 'status_change' AND (new_value = ? OR old_value = ?)`
      ).get(stage, stage) as { count: number }).count;

      funnelData.push({
        stage,
        label: STAGE_LABELS[stage] || stage,
        count: Math.max(currentCount, historicalCount),
      });
    }

    // 6. Deal type distribution
    const dealTypeDistribution = db.prepare(`
      SELECT deal_type, COUNT(*) as count, COALESCE(SUM(fee_total), 0) as total_value
      FROM deals
      WHERE status NOT IN ('archived', 'dead')
      GROUP BY deal_type
    `).all() as { deal_type: string; count: number; total_value: number }[];

    // 7. Summary stats
    const totalPipelineValue = pipelineValue.reduce((sum, p) => sum + p.total_value, 0);
    const winRate = statusCounts.total > 0
      ? Math.round((statusCounts.won / ((statusCounts.won + statusCounts.lost) || 1)) * 100)
      : 0;
    const avgVelocityDays = stageVelocity.length > 0
      ? Math.round(stageVelocity.reduce((sum, s) => sum + s.avg_days, 0) / stageVelocity.length)
      : 0;

    // 8. Monthly deal creation trend (last 12 months)
    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as deals_created,
        COALESCE(SUM(fee_total), 0) as total_value
      FROM deals
      WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all() as { month: string; deals_created: number; total_value: number }[];

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPipelineValue,
          winRate,
          avgVelocityDays,
          activeDeals: statusCounts.active,
          totalDeals: statusCounts.total,
          wonDeals: statusCounts.won,
          lostDeals: statusCounts.lost,
        },
        pipelineValue,
        stageVelocity: stageVelocity.map(s => ({
          ...s,
          label: STAGE_LABELS[s.stage] || s.stage,
        })),
        revenueByClient,
        conversionFunnel: funnelData,
        dealTypeDistribution,
        monthlyTrend,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
