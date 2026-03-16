import { NextResponse } from 'next/server';
import { getPitchlistByDeal, addToPitchlist } from '@/lib/db/song-pitchlist';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const entries = getPitchlistByDeal(params.id);
    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    console.error('Failed to fetch pitchlist:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const entry = addToPitchlist({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to add to pitchlist:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
