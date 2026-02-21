import { NextResponse } from 'next/server';
import { resolveChange } from '@/lib/db/changes';

export async function PUT(request: Request, { params }: { params: { id: string; changeId: string } }) {
  try {
    const { status, reviewed_by } = await request.json();
    const change = resolveChange(params.changeId, status, reviewed_by ?? 'user');
    if (!change) return NextResponse.json({ success: false, error: 'Change not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: change });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
