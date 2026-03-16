import { NextResponse } from 'next/server';
import { getAllViews, createView } from '@/lib/db/views';

export async function GET() {
  try {
    const views = getAllViews();
    return NextResponse.json({ success: true, data: views });
  } catch (error: unknown) {
    console.error('Failed to fetch views:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { name, description, filter_data, is_default } = body;

    if (!name || !filter_data) {
      return NextResponse.json(
        { success: false, error: 'name and filter_data are required' },
        { status: 400 }
      );
    }

    const view = createView({
      name,
      description,
      filter_data,
      is_default,
    });

    return NextResponse.json({ success: true, data: view }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create view:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
