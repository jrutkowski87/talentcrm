import { NextResponse } from 'next/server';
import { linkTalentToRep, unlinkTalentFromRep } from '@/lib/db/reps';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { rep_id, relationship_type, is_primary } = body;
    linkTalentToRep(params.id, rep_id, relationship_type, is_primary ?? false);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to link talent to rep:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { rep_id } = body;
    unlinkTalentFromRep(params.id, rep_id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to unlink talent from rep:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
