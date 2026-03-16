import { NextResponse } from 'next/server';
import { getTalentById, updateTalent, deleteTalent } from '@/lib/db/talent';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const talent = getTalentById(params.id);
    if (!talent) return NextResponse.json({ success: false, error: 'Talent not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: talent });
  } catch (error: unknown) {
    console.error('Failed to fetch talent:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const talent = updateTalent(params.id, body);
    if (!talent) return NextResponse.json({ success: false, error: 'Talent not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: talent });
  } catch (error: unknown) {
    console.error('Failed to update talent:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteTalent(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Talent not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete talent:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
