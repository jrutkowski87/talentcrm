import { NextResponse } from 'next/server';
import { updateSubBrand, deleteSubBrand } from '@/lib/db/clients';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    // Verify the sub-brand belongs to this client
    const existing = getDb().prepare('SELECT client_id FROM sub_brands WHERE id = ?').get(params.subBrandId) as { client_id: string } | undefined;
    if (!existing || existing.client_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Sub-brand not found' }, { status: 404 });
    }

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const subBrand = updateSubBrand(params.subBrandId, body);
    if (!subBrand) return NextResponse.json({ success: false, error: 'Sub-brand not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: subBrand });
  } catch (error: unknown) {
    console.error('Failed to update sub-brand:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    // Verify the sub-brand belongs to this client
    const existing = getDb().prepare('SELECT client_id FROM sub_brands WHERE id = ?').get(params.subBrandId) as { client_id: string } | undefined;
    if (!existing || existing.client_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Sub-brand not found' }, { status: 404 });
    }
    const ok = deleteSubBrand(params.subBrandId);
    if (!ok) return NextResponse.json({ success: false, error: 'Sub-brand not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete sub-brand:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
