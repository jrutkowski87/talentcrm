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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const entry = addRightsHolderToSong({ ...body, song_id: params.id });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
