import { NextResponse } from 'next/server';
import { resolveChange } from '@/lib/db/changes';

export async function PUT(request: Request, { params }: { params: { id: string; changeId: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { status, reviewed_by } = body;
    const change = resolveChange(params.changeId, status, reviewed_by ?? 'user');
    if (!change) return NextResponse.json({ success: false, error: 'Change not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: change });
  } catch (error: unknown) {
    console.error('Failed to resolve change:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
