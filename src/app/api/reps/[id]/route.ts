import { NextResponse } from 'next/server';
import { getRepById, updateRep, deleteRep } from '@/lib/db/reps';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rep = getRepById(params.id);
    if (!rep) return NextResponse.json({ success: false, error: 'Rep not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: rep });
  } catch (error: unknown) {
    console.error('Failed to fetch rep:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const rep = updateRep(params.id, body);
    if (!rep) return NextResponse.json({ success: false, error: 'Rep not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: rep });
  } catch (error: unknown) {
    console.error('Failed to update rep:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteRep(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Rep not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete rep:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
