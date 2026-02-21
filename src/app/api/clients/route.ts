import { NextResponse } from 'next/server';
import { getAllClients, createClient } from '@/lib/db/clients';
import { validate, validationError, clientCreateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const clients = getAllClients();
    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return validationError(['Invalid JSON body']); }

    const result = validate(body, clientCreateSchema);
    if (!result.valid) return validationError(result.errors);

    const client = createClient(result.data);
    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
