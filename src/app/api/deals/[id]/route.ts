import { NextResponse } from 'next/server';
import { getDealById, updateDeal, deleteDeal } from '@/lib/db/deals';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const deal = getDealById(params.id);
    if (!deal) return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: deal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const deal = updateDeal(params.id, body);
    if (!deal) return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: deal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteDeal(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
