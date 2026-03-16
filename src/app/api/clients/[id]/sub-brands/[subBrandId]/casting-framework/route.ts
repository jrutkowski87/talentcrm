import { NextResponse } from 'next/server';
import { createCastingFramework, updateCastingFramework } from '@/lib/db/clients';
import { getDb } from '@/lib/db';

export async function POST(request: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const framework = createCastingFramework({ ...body, sub_brand_id: params.subBrandId });
    return NextResponse.json({ success: true, data: framework }, { status: 201 });
  } catch (error: unknown) {
    console.error('Casting framework create failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string; subBrandId: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }

    // Look up framework by sub-brand — never trust the body's ID
    const db = getDb();
    const existing = db.prepare('SELECT id FROM casting_frameworks WHERE sub_brand_id = ?').get(params.subBrandId) as { id: string } | undefined;
    if (!existing) return NextResponse.json({ success: false, error: 'Casting framework not found' }, { status: 404 });

    const { id: _bodyId, sub_brand_id: _sbid, ...data } = body;
    const framework = updateCastingFramework(existing.id, data);
    if (!framework) return NextResponse.json({ success: false, error: 'Casting framework not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: framework });
  } catch (error: unknown) {
    console.error('Casting framework update failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
