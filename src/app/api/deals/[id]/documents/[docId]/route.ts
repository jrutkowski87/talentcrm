import { NextResponse } from 'next/server';
import { getDocumentById, deleteDocument } from '@/lib/db/documents';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = process.cwd();
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'data', 'uploads');

export async function GET(
  _request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const doc = getDocumentById(params.docId);
    if (!doc || doc.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const doc = getDocumentById(params.docId);
    if (!doc || doc.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, params.id, doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete DB record
    deleteDocument(doc.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
