import { NextResponse } from 'next/server';
import { getViewById, updateView, deleteView } from '@/lib/db/views';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const view = getViewById(params.id);
    if (!view) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: view });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, description, filter_data, is_default } = body;

    const updated = updateView(params.id, { name, description, filter_data, is_default });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = deleteView(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
