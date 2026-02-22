import { NextResponse } from 'next/server';
import { getAllViews, createView } from '@/lib/db/views';

export async function GET() {
  try {
    const views = getAllViews();
    return NextResponse.json({ success: true, data: views });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
