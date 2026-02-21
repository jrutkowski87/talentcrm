import { NextResponse } from 'next/server';
import { updatePitchEntry, removeFromPitchlist } from '@/lib/db/song-pitchlist';
import { updateDeal } from '@/lib/db/deals';

export async function PUT(request: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const body = await request.json();
    const entry = updatePitchEntry(params.entryId, body);
    if (!entry) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });

    // When a song is selected, set deal.song_id
    if (body.pitch_status === 'selected' && entry.song_id) {
      updateDeal(params.id, { song_id: entry.song_id } as any);
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const ok = removeFromPitchlist(params.entryId);
    if (!ok) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
