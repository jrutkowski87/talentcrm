import { NextResponse } from 'next/server';
import { getSongById, updateSong, deleteSong } from '@/lib/db/songs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const song = getSongById(params.id);
    if (!song) return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: song });
  } catch (error: unknown) {
    console.error('Failed to fetch song:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const song = updateSong(params.id, body);
    if (!song) return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: song });
  } catch (error: unknown) {
    console.error('Failed to update song:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteSong(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete song:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
