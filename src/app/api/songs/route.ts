import { NextResponse } from 'next/server';
import { getAllSongs, createSong, searchSongs } from '@/lib/db/songs';
import { validate, validationError, songCreateSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const songs = q ? searchSongs(q) : getAllSongs();
    return NextResponse.json({ success: true, data: songs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return validationError(['Invalid JSON body']); }

    const result = validate(body, songCreateSchema);
    if (!result.valid) return validationError(result.errors);

    const song = createSong(result.data);
    return NextResponse.json({ success: true, data: song }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
