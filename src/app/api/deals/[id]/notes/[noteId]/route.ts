import { NextResponse } from 'next/server';
import { updateNote, deleteNote } from '@/lib/db/notes';
import { getDb } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string; noteId: string } }) {
  try {
    // Verify the note belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_notes WHERE id = ?').get(params.noteId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }
    const note = updateNote(params.noteId, body.content.trim());
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: note });
  } catch (error: unknown) {
    console.error('Failed to update note:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; noteId: string } }) {
  try {
    // Verify the note belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_notes WHERE id = ?').get(params.noteId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    const deleted = deleteNote(params.noteId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
