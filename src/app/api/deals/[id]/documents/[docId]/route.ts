import { NextResponse } from 'next/server';
import { getDocumentById, deleteDocument } from '@/lib/db/documents';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = process.cwd();
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'data', 'uploads');
const UUID_RE = /^[a-f0-9-]{36}$/;

export async function GET(
  _request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    if (!UUID_RE.test(params.id) || !UUID_RE.test(params.docId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }
    const doc = getDocumentById(params.docId);
    if (!doc || doc.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (error: unknown) {
    console.error('Document fetch failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    if (!UUID_RE.test(params.id) || !UUID_RE.test(params.docId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }
    const doc = getDocumentById(params.docId);
    if (!doc || doc.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete file from disk — resolve and verify path stays within uploads dir
    const filePath = path.resolve(UPLOADS_DIR, params.id, doc.filename);
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 });
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete DB record
    deleteDocument(doc.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Document delete failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
