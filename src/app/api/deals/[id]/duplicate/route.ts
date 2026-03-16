import { NextResponse } from 'next/server';
import { duplicateDeal } from '@/lib/db/deals';
import { addTimelineEntry } from '@/lib/db/timeline';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const newDeal = duplicateDeal(params.id);

    try {
      addTimelineEntry({
        deal_id: newDeal.id,
        event_type: 'note_added',
        title: 'Deal duplicated',
        description: `Duplicated from original deal`,
      });
    } catch { /* best effort */ }

    return NextResponse.json({ success: true, data: newDeal }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to duplicate deal:', error);
    const is404 = error instanceof Error && error.message === 'Source deal not found';
    return NextResponse.json({ success: false, error: is404 ? 'Source deal not found' : 'Internal server error' }, { status: is404 ? 404 : 500 });
  }
}
