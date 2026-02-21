import { NextResponse } from 'next/server';
import { getAllTalent, createTalent, searchTalent } from '@/lib/db/talent';
import { validate, validationError, talentCreateSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const data = search ? searchTalent(search) : getAllTalent();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return validationError(['Invalid JSON body']); }

    const result = validate(body, talentCreateSchema);
    if (!result.valid) return validationError(result.errors);

    const talent = createTalent(result.data as any);
    return NextResponse.json({ success: true, data: talent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
