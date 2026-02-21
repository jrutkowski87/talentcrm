import { NextResponse } from 'next/server';
import { getDealById, updateDeal } from '@/lib/db/deals';
import { getDb, generateId, getCurrentTimestamp } from '@/lib/db';

/**
 * POST /api/deals/[id]/accept-offer
 * Marks the offer as accepted by talent. Creates a snapshot of the current
 * deal terms and timestamps the acceptance.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    if (deal.offer_accepted_at) {
      return NextResponse.json(
        { success: false, error: 'Offer has already been accepted.' },
        { status: 409 }
      );
    }

    const now = getCurrentTimestamp();

    // Create a snapshot of the key deal terms at acceptance
    const snapshot = {
      snapshot_taken_at: now,
      deal_name: deal.deal_name,
      campaign_name: deal.campaign_name,
      talent_id: deal.talent_id,
      talent_name: deal.talent_name,
      client_name: deal.client_name,
      fee_total: deal.fee_total,
      fee_currency: deal.fee_currency,
      fee_structure: deal.fee_structure,
      fee_payments: deal.fee_payments,
      fee_net_terms: deal.fee_net_terms,
      fee_mfn: deal.fee_mfn,
      fee_mfn_details: deal.fee_mfn_details,
      fee_revenue_share: deal.fee_revenue_share,
      fee_ancillary: deal.fee_ancillary,
      term_duration: deal.term_duration,
      term_duration_weeks: deal.term_duration_weeks,
      term_start_trigger: deal.term_start_trigger,
      term_start_date: deal.term_start_date,
      term_end_date: deal.term_end_date,
      exclusivity_category: deal.exclusivity_category,
      exclusivity_brands: deal.exclusivity_brands,
      exclusivity_duration: deal.exclusivity_duration,
      service_days: deal.service_days,
      social_posts: deal.social_posts,
      media_opportunities: deal.media_opportunities,
      ambassador_duties: deal.ambassador_duties,
      permitted_usage: deal.permitted_usage,
      travel: deal.travel,
      hmu: deal.hmu,
      materials_stills_count: deal.materials_stills_count,
      materials_videos: deal.materials_videos,
      materials_edits_versions: deal.materials_edits_versions,
      governing_law: deal.governing_law,
      non_union: deal.non_union,
      confidential: deal.confidential,
      morals_clause: deal.morals_clause,
      offer_sheet_version: deal.offer_sheet_version,
    };

    const updated = updateDeal(params.id, {
      offer_accepted_at: now,
      offer_snapshot: snapshot,
    } as any);

    // Log timeline event
    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO deal_timeline (id, deal_id, event_type, description, created_at)
         VALUES (?, ?, 'offer_accepted', ?, ?)`
      ).run(
        generateId(),
        params.id,
        `Offer accepted${deal.talent_name ? ' by ' + deal.talent_name : ''}. Snapshot locked at v${deal.offer_sheet_version}.`,
        now
      );
    } catch {
      // swallow
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
