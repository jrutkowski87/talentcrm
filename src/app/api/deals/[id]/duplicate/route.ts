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
  } catch (error: any) {
    const status = error.message === 'Source deal not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
