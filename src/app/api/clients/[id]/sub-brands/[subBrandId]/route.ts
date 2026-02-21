import { NextResponse } from 'next/server';
import { updateSubBrand, deleteSubBrand } from '@/lib/db/clients';

export async function PUT(request: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    const body = await request.json();
    const subBrand = updateSubBrand(params.subBrandId, body);
    if (!subBrand) return NextResponse.json({ success: false, error: 'Sub-brand not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: subBrand });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    const ok = deleteSubBrand(params.subBrandId);
    if (!ok) return NextResponse.json({ success: false, error: 'Sub-brand not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
