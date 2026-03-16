import { NextResponse } from 'next/server';
import { getTimelineByDeal, addTimelineEntry } from '@/lib/db/timeline';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const entries = getTimelineByDeal(params.id);
    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    console.error('Failed to fetch timeline:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const entry = addTimelineEntry({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create timeline entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
