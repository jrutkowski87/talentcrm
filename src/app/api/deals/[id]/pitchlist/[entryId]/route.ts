import { NextResponse } from 'next/server';
import { updatePitchEntry, removeFromPitchlist } from '@/lib/db/song-pitchlist';
import { updateDeal } from '@/lib/db/deals';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    // Verify the entry belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_song_pitchlist WHERE id = ?').get(params.entryId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const entry = updatePitchEntry(params.entryId, body);
    if (!entry) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });

    // When a song is selected, set deal.song_id
    if (body.pitch_status === 'selected' && entry.song_id) {
      updateDeal(params.id, { song_id: entry.song_id } as any);
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error: unknown) {
    console.error('Failed to update pitch entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    // Verify the entry belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_song_pitchlist WHERE id = ?').get(params.entryId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }
    const ok = removeFromPitchlist(params.entryId);
    if (!ok) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete pitch entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
