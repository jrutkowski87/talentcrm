import { NextResponse } from 'next/server';
import { createSubBrand } from '@/lib/db/clients';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const subBrand = createSubBrand({ ...body, client_id: params.id });
    return NextResponse.json({ success: true, data: subBrand }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create sub-brand:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
