import { NextResponse } from 'next/server';
import { getNotesByDeal, addNote } from '@/lib/db/notes';
import { addTimelineEntry } from '@/lib/db/timeline';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const notes = getNotesByDeal(params.id);
    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }
    const note = addNote({ deal_id: params.id, content: body.content.trim(), created_by: body.created_by });

    // Log to timeline
    try {
      addTimelineEntry({
        deal_id: params.id,
        event_type: 'note_added',
        title: 'Note added',
        description: body.content.trim().substring(0, 200),
      });
    } catch { /* best effort */ }

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
