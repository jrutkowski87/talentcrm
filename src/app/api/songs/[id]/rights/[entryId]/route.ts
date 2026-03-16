import { NextResponse } from 'next/server';
import { updateSongRightsEntry, removeSongRightsEntry } from '@/lib/db/song-rights';

export async function PUT(request: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const entry = updateSongRightsEntry(params.entryId, body);
    if (!entry) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: entry });
  } catch (error: unknown) {
    console.error('Failed to update song rights entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const ok = removeSongRightsEntry(params.entryId);
    if (!ok) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete song rights entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
