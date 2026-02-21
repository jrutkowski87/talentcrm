import { NextRequest, NextResponse } from 'next/server';
import { getDealById } from '@/lib/db/deals';
import { createDocument } from '@/lib/db/documents';
import { getFileType } from '@/lib/engine/document-extractor';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = process.cwd();
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'data', 'uploads');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const docCategory = (formData.get('doc_category') as string) || 'other';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload a PDF, DOCX, DOC, or TXT file.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 20MB.' },
        { status: 413 }
      );
    }

    // Create upload directory for this deal
    const dealUploadDir = path.join(UPLOADS_DIR, params.id);
    if (!fs.existsSync(dealUploadDir)) {
      fs.mkdirSync(dealUploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const { v4: uuidv4 } = await import('uuid');
    const storedFilename = `${uuidv4()}.${ext}`;

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dealUploadDir, storedFilename), buffer);

    // Create DB record
    const doc = createDocument({
      deal_id: params.id,
      filename: storedFilename,
      original_name: file.name,
      file_type: fileType,
      doc_category: docCategory,
      file_size: file.size,
    });

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
