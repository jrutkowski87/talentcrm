import { NextResponse } from 'next/server';
import { getDealById, updateDealStatus, updateDeal, type DealStatus } from '@/lib/db/deals';
import { getDb, generateId, getCurrentTimestamp } from '@/lib/db';
import { createTask } from '@/lib/db/tasks';

// Auto-generated tasks per pipeline stage
const STAGE_TASKS: Record<string, { title: string; priority?: string; daysFromNow?: number }[]> = {
  negotiation: [
    { title: 'Send initial offer to talent rep', priority: 'high', daysFromNow: 2 },
    { title: 'Follow up on offer response', priority: 'medium', daysFromNow: 7 },
  ],
  contract_drafting: [
    { title: 'Draft contract', priority: 'high', daysFromNow: 5 },
    { title: 'Send contract for legal review', priority: 'medium', daysFromNow: 10 },
  ],
  admin_logistics: [
    { title: 'Collect W-9/tax forms', priority: 'high', daysFromNow: 3 },
    { title: 'Set up payment schedule', priority: 'medium', daysFromNow: 5 },
    { title: 'Coordinate logistics', priority: 'medium', daysFromNow: 7 },
  ],
  fulfillment: [
    { title: 'Confirm deliverables received', priority: 'high', daysFromNow: 14 },
    { title: 'Review final assets', priority: 'medium', daysFromNow: 21 },
  ],
  rights_negotiation: [
    { title: 'Send license quote request', priority: 'high', daysFromNow: 3 },
    { title: 'Follow up on rights holder response', priority: 'medium', daysFromNow: 7 },
  ],
  license_drafting: [
    { title: 'Draft music license agreement', priority: 'high', daysFromNow: 5 },
    { title: 'Send license for counter-signature', priority: 'medium', daysFromNow: 10 },
  ],
};

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

    // Auto-generate tasks for the new stage
    try {
      const stageTasks = STAGE_TASKS[status];
      if (stageTasks) {
        for (const taskDef of stageTasks) {
          const dueDate = taskDef.daysFromNow
            ? new Date(Date.now() + taskDef.daysFromNow * 86400000).toISOString().split('T')[0]
            : undefined;
          createTask({
            deal_id: params.id,
            title: taskDef.title,
            priority: (taskDef.priority as any) || 'medium',
            due_date: dueDate,
            auto_generated: true,
          });
        }
      }
    } catch {
      // swallow auto-task error — don't block status change
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
