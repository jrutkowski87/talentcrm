import { NextResponse } from 'next/server';
import { recalculateFees } from '@/lib/db/music-licenses';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const licenses = recalculateFees(params.id);
    return NextResponse.json({ success: true, data: licenses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
