/**
 * Document text extraction engine.
 * Extracts plain text from PDF, DOCX, DOC, and TXT files.
 */

export async function extractText(
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt' | 'doc'
): Promise<string> {
  switch (fileType) {
    case 'pdf': {
      const pdfParse = (await import('pdf-parse') as any).default;
      const data = await pdfParse(buffer);
      return (data?.text || '').trim();
    }
    case 'docx':
    case 'doc': {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return (result?.value || '').trim();
    }
    case 'txt':
      return buffer.toString('utf-8').trim();
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Detect file type from extension.
 */
export function getFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'doc' | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'docx': return 'docx';
    case 'doc': return 'doc';
    case 'txt': return 'txt';
    default: return null;
  }
}
