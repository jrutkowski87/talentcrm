import { NextResponse } from 'next/server';
import { getDealById, updateDealStatus, updateDeal, type DealStatus } from '@/lib/db/deals';
import { getDb, generateId, getCurrentTimestamp } from '@/lib/db';

// Pipeline order for gate enforcement
const PIPELINE_ORDER: DealStatus[] = [
  'creative_brief',
  'outreach',
  'shortlist',
  'approval_to_offer',
  'negotiation',
  'talent_buyin',
  'contract_drafting',
  'admin_logistics',
  'fulfillment',
  'complete',
];

function stageIndex(status: DealStatus): number {
  return PIPELINE_ORDER.indexOf(status);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status, approval_by, approval_notes, force } = body;

    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const currentIdx = stageIndex(deal.status as DealStatus);
    const targetIdx = stageIndex(status as DealStatus);

    // Allow moving to 'archived' or 'dead' from anywhere
    if (status !== 'archived' && status !== 'dead' && !force) {
      // Gate 1: Cannot advance past approval_to_offer without approval
      if (
        targetIdx >= stageIndex('negotiation') &&
        !deal.approval_to_engage_at
      ) {
        // If approval credentials are provided, grant approval and proceed
        if (approval_by) {
          const now = getCurrentTimestamp();
          updateDeal(params.id, {
            approval_to_engage_at: now,
            approval_to_engage_by: approval_by,
            approval_notes: approval_notes || null,
          } as any);

          // Log approval timeline event
          try {
            const db = getDb();
            db.prepare(
              `INSERT INTO deal_timeline (id, deal_id, event_type, description, created_at)
               VALUES (?, ?, 'approval_granted', ?, ?)`
            ).run(
              generateId(),
              params.id,
              `Approval to engage granted by ${approval_by}${approval_notes ? ': ' + approval_notes : ''}`,
              now
            );
          } catch {
            // swallow timeline error
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Approval to engage is required before advancing to this stage. Please provide approval.',
              gate: 'approval_to_engage',
            },
            { status: 422 }
          );
        }
      }

      // Gate 2: Cannot advance past talent_buyin without offer acceptance
      if (
        targetIdx >= stageIndex('contract_drafting') &&
        !deal.offer_accepted_at
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Offer must be accepted by talent before advancing to Contract Drafting.',
            gate: 'offer_acceptance',
          },
          { status: 422 }
        );
      }

      // Gate 3: Cannot advance past contract_drafting without contract execution
      if (
        targetIdx >= stageIndex('admin_logistics') &&
        !deal.contract_executed_at
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Contract must be executed before advancing to Admin & Logistics.',
            gate: 'contract_execution',
          },
          { status: 422 }
        );
      }
    }

    const updated = updateDealStatus(params.id, status);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
