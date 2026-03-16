import { NextResponse } from 'next/server';
import { recalculateFees } from '@/lib/db/music-licenses';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const licenses = recalculateFees(params.id);
    return NextResponse.json({ success: true, data: licenses });
  } catch (error: unknown) {
    console.error('Failed to recalculate license fees:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
