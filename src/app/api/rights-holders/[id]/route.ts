import { NextResponse } from 'next/server';
import { getRightsHolderById, updateRightsHolder, deleteRightsHolder } from '@/lib/db/rights-holders';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const holder = getRightsHolderById(params.id);
    if (!holder) return NextResponse.json({ success: false, error: 'Rights holder not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: holder });
  } catch (error: unknown) {
    console.error('Failed to fetch rights holder:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const holder = updateRightsHolder(params.id, body);
    if (!holder) return NextResponse.json({ success: false, error: 'Rights holder not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: holder });
  } catch (error: unknown) {
    console.error('Failed to update rights holder:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteRightsHolder(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Rights holder not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete rights holder:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
