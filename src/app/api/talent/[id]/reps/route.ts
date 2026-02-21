import { NextResponse } from 'next/server';
import { linkTalentToRep, unlinkTalentFromRep } from '@/lib/db/reps';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { rep_id, relationship_type, is_primary } = await request.json();
    linkTalentToRep(params.id, rep_id, relationship_type, is_primary ?? false);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { rep_id } = await request.json();
    unlinkTalentFromRep(params.id, rep_id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
