import { NextResponse } from 'next/server';
import { updateNote, deleteNote } from '@/lib/db/notes';

export async function PUT(req: Request, { params }: { params: { id: string; noteId: string } }) {
  try {
    const body = await req.json();
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }
    const note = updateNote(params.noteId, body.content.trim());
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: note });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; noteId: string } }) {
  try {
    const deleted = deleteNote(params.noteId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
