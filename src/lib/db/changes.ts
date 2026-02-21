import { getDb, generateId, getCurrentTimestamp } from './index';

export interface ChangeEntry {
  id: string;
  deal_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function getChangesByDeal(dealId: string): ChangeEntry[] {
  return getDb().prepare('SELECT * FROM deal_changes WHERE deal_id = ? ORDER BY created_at DESC').all(dealId) as ChangeEntry[];
}

export function createChange(data: Partial<ChangeEntry> & { deal_id: string; field_name: string; source: string }): ChangeEntry {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare('INSERT INTO deal_changes (id, deal_id, field_name, old_value, new_value, source, status, reviewed_by, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.deal_id, data.field_name, data.old_value ?? null, data.new_value ?? null, data.source, data.status ?? 'pending_review', data.reviewed_by ?? null, data.reviewed_at ?? null, now);
  return db.prepare('SELECT * FROM deal_changes WHERE id = ?').get(id) as ChangeEntry;
}

export function resolveChange(id: string, status: string, reviewedBy: string): ChangeEntry | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM deal_changes WHERE id = ?').get(id)) return null;
  db.prepare('UPDATE deal_changes SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?').run(status, reviewedBy, getCurrentTimestamp(), id);
  return db.prepare('SELECT * FROM deal_changes WHERE id = ?').get(id) as ChangeEntry;
}

export function getPendingChanges(dealId: string): ChangeEntry[] {
  return getDb().prepare("SELECT * FROM deal_changes WHERE deal_id = ? AND status = 'pending_review' ORDER BY created_at DESC").all(dealId) as ChangeEntry[];
}
