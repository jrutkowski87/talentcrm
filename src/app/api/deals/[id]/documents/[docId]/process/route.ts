import { NextResponse } from 'next/server';
import { getDocumentById, updateDocument } from '@/lib/db/documents';
import { extractText } from '@/lib/engine/document-extractor';
import { parseBrief } from '@/lib/engine/brief-parser';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = process.cwd();
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'data', 'uploads');

export async function POST(
  _request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const doc = getDocumentById(params.docId);
    if (!doc || doc.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Step 1: Extract text from file
    updateDocument(doc.id, { upload_status: 'extracting' });

    const filePath = path.join(UPLOADS_DIR, params.id, doc.filename);
    if (!fs.existsSync(filePath)) {
      updateDocument(doc.id, { upload_status: 'error', error_message: 'File not found on disk' });
      return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 });
    }

    let extractedText: string;
    try {
      const buffer = fs.readFileSync(filePath);
      extractedText = await extractText(buffer, doc.file_type as 'pdf' | 'docx' | 'txt' | 'doc');
    } catch (err: any) {
      updateDocument(doc.id, {
        upload_status: 'error',
        error_message: `Text extraction failed: ${err.message}`,
      });
      return NextResponse.json(
        { success: false, error: `Text extraction failed: ${err.message}` },
        { status: 500 }
      );
    }

    if (!extractedText || extractedText.length === 0) {
      updateDocument(doc.id, {
        upload_status: 'error',
        error_message: 'No text could be extracted from this file. It may be a scanned/image-only document.',
      });
      return NextResponse.json(
        { success: false, error: 'No text could be extracted from this file.' },
        { status: 422 }
      );
    }

    updateDocument(doc.id, { extracted_text: extractedText, upload_status: 'extracted' });

    // Step 2: Parse with AI (or rule-based fallback)
    updateDocument(doc.id, { upload_status: 'parsing' });

    let parsedData: any;
    try {
      parsedData = await parseBrief(extractedText, { useAI: true });
    } catch (err: any) {
      // Fallback to rule-based if AI fails
      try {
        parsedData = await parseBrief(extractedText, { useAI: false });
      } catch (err2: any) {
        updateDocument(doc.id, {
          upload_status: 'error',
          error_message: `Parsing failed: ${err2.message}`,
        });
        return NextResponse.json(
          { success: false, error: `Parsing failed: ${err2.message}` },
          { status: 500 }
        );
      }
    }

    const updated = updateDocument(doc.id, {
      parsed_data: parsedData,
      upload_status: 'parsed',
      error_message: null,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
