import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const STALENESS_THRESHOLDS: Record<string, number> = {
  creative_brief: 14,
  outreach: 10,
  shortlist: 14,
  approval_to_offer: 7,
  negotiation: 14,
  talent_buyin: 7,
  contract_drafting: 14,
  admin_logistics: 10,
  fulfillment: 21,
  music_brief: 14,
  song_pitching: 10,
  song_selection: 14,
  rights_negotiation: 14,
  license_drafting: 14,
  music_admin: 10,
  delivery: 21,
};

export async function GET() {
  try {
    const db = getDb();
    const alerts: any[] = [];

    for (const [status, thresholdDays] of Object.entries(STALENESS_THRESHOLDS)) {
      const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000).toISOString();
      const staleDeals = db.prepare(`
        SELECT d.id, d.deal_name, d.status, d.deal_type, d.updated_at,
               c.name AS client_name
        FROM deals d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.status = ? AND d.updated_at < ?
        ORDER BY d.updated_at ASC
      `).all(status, cutoff) as any[];

      for (const deal of staleDeals) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        alerts.push({
          type: 'stale_deal',
          severity: daysSinceUpdate > thresholdDays * 2 ? 'high' : 'medium',
          deal_id: deal.id,
          deal_name: deal.deal_name,
          deal_type: deal.deal_type,
          client_name: deal.client_name,
          status: deal.status,
          days_in_stage: daysSinceUpdate,
          threshold_days: thresholdDays,
          message: `${deal.deal_name} has been in ${status.replace(/_/g, ' ')} for ${daysSinceUpdate} days`,
        });
      }
    }

    alerts.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
      return b.days_in_stage - a.days_in_stage;
    });

    return NextResponse.json({ success: true, data: alerts, count: alerts.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
