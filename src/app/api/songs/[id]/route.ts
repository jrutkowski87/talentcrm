import { NextResponse } from 'next/server';
import { getSongById, updateSong, deleteSong } from '@/lib/db/songs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const song = getSongById(params.id);
    if (!song) return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: song });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const song = updateSong(params.id, body);
    if (!song) return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: song });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteSong(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
