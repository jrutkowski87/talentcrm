import { NextResponse } from 'next/server';
import { getChangesByDeal, createChange } from '@/lib/db/changes';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const changes = getChangesByDeal(params.id);
    return NextResponse.json({ success: true, data: changes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const change = createChange({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: change }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
