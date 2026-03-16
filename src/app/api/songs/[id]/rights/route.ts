import { NextResponse } from 'next/server';
import { getRightsBySong, addRightsHolderToSong, validateSharePercentages } from '@/lib/db/song-rights';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const entries = getRightsBySong(params.id);
    const masterValidation = validateSharePercentages(params.id, 'master');
    const publishingValidation = validateSharePercentages(params.id, 'publishing');
    return NextResponse.json({
      success: true,
      data: entries,
      validation: { master: masterValidation, publishing: publishingValidation },
    });
  } catch (error: unknown) {
    console.error('Failed to fetch song rights:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const entry = addRightsHolderToSong({ ...body, song_id: params.id });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to add song rights entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
