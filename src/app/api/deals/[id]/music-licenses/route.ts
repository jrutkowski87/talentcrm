import { NextResponse } from 'next/server';
import { getLicensesByDeal, createLicense, populateLicensesFromSong } from '@/lib/db/music-licenses';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const licenses = getLicensesByDeal(params.id);
    return NextResponse.json({ success: true, data: licenses });
  } catch (error: unknown) {
    console.error('Failed to fetch music licenses:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }

    // If action is 'populate', auto-create from song rights holders
    if (body.action === 'populate' && body.song_id) {
      const licenses = populateLicensesFromSong(params.id, body.song_id);
      return NextResponse.json({ success: true, data: licenses }, { status: 201 });
    }

    // Otherwise create a single license entry
    const license = createLicense({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: license }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create music license:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
