import { NextResponse } from 'next/server';
import { getAllDeals, createDeal } from '@/lib/db/deals';
import { validate, validationError, dealCreateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const deals = getAllDeals();
    return NextResponse.json({ success: true, data: deals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return validationError(['Invalid JSON body']); }

    const result = validate(body, dealCreateSchema);
    if (!result.valid) return validationError(result.errors);

    const deal = createDeal(result.data);
    return NextResponse.json({ success: true, data: deal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
