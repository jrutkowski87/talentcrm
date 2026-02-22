import { getDb, generateId, getCurrentTimestamp } from './index';

export interface DealNote {
  id: string;
  deal_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function getNotesByDeal(dealId: string): DealNote[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM deal_notes WHERE deal_id = ? ORDER BY created_at DESC'
  ).all(dealId) as DealNote[];
}

export function addNote(data: { deal_id: string; content: string; created_by?: string }): DealNote {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare(
    'INSERT INTO deal_notes (id, deal_id, content, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.deal_id, data.content, data.created_by ?? null, now, now);
  return db.prepare('SELECT * FROM deal_notes WHERE id = ?').get(id) as DealNote;
}

export function updateNote(id: string, content: string): DealNote | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM deal_notes WHERE id = ?').get(id)) return null;
  db.prepare('UPDATE deal_notes SET content = ? WHERE id = ?').run(content, id);
  return db.prepare('SELECT * FROM deal_notes WHERE id = ?').get(id) as DealNote;
}

export function deleteNote(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_notes WHERE id = ?').run(id).changes > 0;
}
