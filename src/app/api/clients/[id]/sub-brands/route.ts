import { NextResponse } from 'next/server';
import { createSubBrand } from '@/lib/db/clients';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const subBrand = createSubBrand({ ...body, client_id: params.id });
    return NextResponse.json({ success: true, data: subBrand }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
