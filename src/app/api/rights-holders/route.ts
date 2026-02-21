import { NextResponse } from 'next/server';
import { getAllRightsHolders, createRightsHolder, searchRightsHolders } from '@/lib/db/rights-holders';
import { validate, validationError, rightsHolderCreateSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const holders = q ? searchRightsHolders(q) : getAllRightsHolders();
    return NextResponse.json({ success: true, data: holders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return validationError(['Invalid JSON body']); }

    const result = validate(body, rightsHolderCreateSchema);
    if (!result.valid) return validationError(result.errors);

    const holder = createRightsHolder(result.data);
    return NextResponse.json({ success: true, data: holder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
