import { NextResponse } from 'next/server';
import { getDealById, updateDealStatus, updateDeal, type DealStatus } from '@/lib/db/deals';
import { getDb, generateId, getCurrentTimestamp } from '@/lib/db';
import { addTimelineEntry } from '@/lib/db/timeline';
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
const TALENT_PIPELINE: DealStatus[] = [
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

const MUSIC_PIPELINE: DealStatus[] = [
  'music_brief',
  'song_pitching',
  'song_selection',
  'rights_negotiation',
  'license_drafting',
  'music_admin',
  'delivery',
  'complete',
];

/** All valid statuses across both pipelines. */
const ALL_VALID_STATUSES = new Set([...TALENT_PIPELINE, ...MUSIC_PIPELINE, 'archived', 'dead']);

function stageIndex(status: DealStatus, dealType?: string): number {
  const pipeline = dealType === 'music' ? MUSIC_PIPELINE : TALENT_PIPELINE;
  return pipeline.indexOf(status);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { status, approval_by, approval_notes, force } = body;

    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Validate the status is a known pipeline stage
    if (!ALL_VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
    }

    const targetIdx = stageIndex(status as DealStatus, deal.deal_type);

    // Allow moving to 'archived' or 'dead' from anywhere
    if (status !== 'archived' && status !== 'dead' && !force) {
      // Gate 1: Cannot advance past approval_to_offer without approval (talent pipeline only)
      if (
        deal.deal_type !== 'music' &&
        targetIdx >= stageIndex('negotiation', deal.deal_type) &&
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
            addTimelineEntry({
              deal_id: params.id,
              event_type: 'approval_granted',
              title: 'Approval granted',
              description: `Approval to engage granted by ${approval_by}${approval_notes ? ': ' + approval_notes : ''}`,
            });
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

      // Gate 2: Cannot advance past talent_buyin without offer acceptance (talent pipeline only)
      if (
        deal.deal_type !== 'music' &&
        targetIdx >= stageIndex('contract_drafting', deal.deal_type) &&
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

      // Gate 3: Cannot advance past contract_drafting without contract execution (talent pipeline only)
      if (
        deal.deal_type !== 'music' &&
        targetIdx >= stageIndex('admin_logistics', deal.deal_type) &&
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
  } catch (error: unknown) {
    console.error('Failed to update deal status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
