import { NextResponse } from 'next/server';
import { getViewById, updateView, deleteView } from '@/lib/db/views';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const view = getViewById(params.id);
    if (!view) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: view });
  } catch (error: unknown) {
    console.error('Failed to fetch view:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { name, description, filter_data, is_default } = body;

    const updated = updateView(params.id, { name, description, filter_data, is_default });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Failed to update view:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = deleteView(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete view:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
