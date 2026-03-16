import { NextResponse } from 'next/server';
import { getDealById, updateDeal, deleteDeal } from '@/lib/db/deals';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const deal = getDealById(params.id);
    if (!deal) return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: deal });
  } catch (error: unknown) {
    console.error('Failed to fetch deal:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const deal = updateDeal(params.id, body);
    if (!deal) return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: deal });
  } catch (error: unknown) {
    console.error('Failed to update deal:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteDeal(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete deal:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
