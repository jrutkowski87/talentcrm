import { getDb, generateId, getCurrentTimestamp } from './index';

export interface DealDocument {
  id: string;
  deal_id: string;
  filename: string;
  original_name: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'doc';
  doc_category: string;
  file_size: number;
  extracted_text: string | null;
  parsed_data: any;
  upload_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function parseRow(row: any): DealDocument {
  if (!row) return row;
  const p = { ...row };
  if (typeof p.parsed_data === 'string') {
    try { p.parsed_data = JSON.parse(p.parsed_data); } catch { /* leave as string */ }
  }
  return p;
}

export function getDocumentsByDeal(dealId: string): DealDocument[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT * FROM deal_documents WHERE deal_id = ? ORDER BY created_at DESC`
  ).all(dealId) as any[];
  return rows.map(parseRow);
}

export function getDocumentById(id: string): DealDocument | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM deal_documents WHERE id = ?').get(id) as any;
  return row ? parseRow(row) : null;
}

export function createDocument(data: {
  deal_id: string;
  filename: string;
  original_name: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'doc';
  doc_category: string;
  file_size: number;
}): DealDocument {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare(
    `INSERT INTO deal_documents (id, deal_id, filename, original_name, file_type, doc_category, file_size, upload_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?)`
  ).run(id, data.deal_id, data.filename, data.original_name, data.file_type, data.doc_category, data.file_size, now, now);

  const doc = getDocumentById(id);
  if (!doc) throw new Error(`Failed to retrieve document after creation: ${id}`);
  return doc;
}

export function updateDocument(id: string, data: Partial<DealDocument>): DealDocument | null {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM deal_documents WHERE id = ?').get(id);
  if (!existing) return null;

  const now = getCurrentTimestamp();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.extracted_text !== undefined) { fields.push('extracted_text = ?'); values.push(data.extracted_text); }
  if (data.parsed_data !== undefined) { fields.push('parsed_data = ?'); values.push(typeof data.parsed_data === 'string' ? data.parsed_data : JSON.stringify(data.parsed_data)); }
  if (data.upload_status !== undefined) { fields.push('upload_status = ?'); values.push(data.upload_status); }
  if (data.error_message !== undefined) { fields.push('error_message = ?'); values.push(data.error_message); }
  if (data.doc_category !== undefined) { fields.push('doc_category = ?'); values.push(data.doc_category); }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    db.prepare(`UPDATE deal_documents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getDocumentById(id);
}

export function deleteDocument(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_documents WHERE id = ?').run(id).changes > 0;
}
