import { NextResponse } from 'next/server';
import { getTimelineByDeal, addTimelineEntry } from '@/lib/db/timeline';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const entries = getTimelineByDeal(params.id);
    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const entry = addTimelineEntry({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
