import { NextResponse } from 'next/server';
import { getChangesByDeal, createChange } from '@/lib/db/changes';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const changes = getChangesByDeal(params.id);
    return NextResponse.json({ success: true, data: changes });
  } catch (error: unknown) {
    console.error('Failed to fetch changes:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const change = createChange({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: change }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create change:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
