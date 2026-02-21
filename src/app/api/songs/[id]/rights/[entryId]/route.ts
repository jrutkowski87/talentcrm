import { NextResponse } from 'next/server';
import { updateSongRightsEntry, removeSongRightsEntry } from '@/lib/db/song-rights';

export async function PUT(request: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const body = await request.json();
    const entry = updateSongRightsEntry(params.entryId, body);
    if (!entry) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const ok = removeSongRightsEntry(params.entryId);
    if (!ok) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
