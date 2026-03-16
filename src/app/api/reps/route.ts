import { NextResponse } from 'next/server';
import { getAllReps, createRep } from '@/lib/db/reps';
import { validate, validationError, repCreateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const reps = getAllReps();
    return NextResponse.json({ success: true, data: reps });
  } catch (error: unknown) {
    console.error('Failed to fetch reps:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return validationError(['Invalid JSON body']); }

    const result = validate(body, repCreateSchema);
    if (!result.valid) return validationError(result.errors);

    const rep = createRep(result.data);
    return NextResponse.json({ success: true, data: rep }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create rep:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
