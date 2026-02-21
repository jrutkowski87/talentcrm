import { NextResponse } from 'next/server';
import { createCastingFramework, updateCastingFramework } from '@/lib/db/clients';

export async function POST(request: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    const body = await request.json();
    const framework = createCastingFramework({ ...body, sub_brand_id: params.subBrandId });
    return NextResponse.json({ success: true, data: framework }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const framework = updateCastingFramework(id, data);
    if (!framework) return NextResponse.json({ success: false, error: 'Casting framework not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: framework });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
