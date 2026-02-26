import { NextResponse } from 'next/server';
import { getDealById, updateDeal } from '@/lib/db/deals';
import { getCurrentTimestamp } from '@/lib/db';
import { addTimelineEntry } from '@/lib/db/timeline';

/**
 * POST /api/deals/[id]/execute-contract
 * Marks the contract as fully executed (signed by both parties).
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

    if (deal.contract_executed_at) {
      return NextResponse.json(
        { success: false, error: 'Contract has already been executed.' },
        { status: 409 }
      );
    }

    if (!deal.offer_accepted_at) {
      return NextResponse.json(
        { success: false, error: 'Offer must be accepted before contract can be executed.' },
        { status: 422 }
      );
    }

    const now = getCurrentTimestamp();

    const updated = updateDeal(params.id, {
      contract_executed_at: now,
    } as any);

    // Log timeline event
    try {
      addTimelineEntry({
        deal_id: params.id,
        event_type: 'document_signed',
        title: 'Contract executed',
        description: 'Contract fully executed (signed by both parties).',
      });
    } catch {
      // swallow
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
