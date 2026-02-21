import { getDb, generateId, getCurrentTimestamp } from './index';

export interface TimelineEntry {
  id: string;
  deal_id: string;
  event_type: string;
  title: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  created_by: string | null;
  created_at: string;
}

function parseRow(row: any): TimelineEntry {
  if (!row) return row;
  const p = { ...row };
  if (typeof p.metadata === 'string') try { p.metadata = JSON.parse(p.metadata); } catch {}
  return p;
}

export function getTimelineByDeal(dealId: string): TimelineEntry[] {
  const db = getDb();
  return (db.prepare('SELECT * FROM deal_timeline WHERE deal_id = ? ORDER BY created_at DESC').all(dealId) as any[]).map(parseRow);
}

export function addTimelineEntry(data: Partial<TimelineEntry> & { deal_id: string; event_type: string }): TimelineEntry {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare('INSERT INTO deal_timeline (id, deal_id, event_type, title, description, metadata, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.deal_id, data.event_type, data.title ?? '', data.description ?? null, JSON.stringify(data.metadata ?? {}), data.created_by ?? null, now);
  return parseRow(db.prepare('SELECT * FROM deal_timeline WHERE id = ?').get(id) as any);
}

export function deleteTimelineEntry(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_timeline WHERE id = ?').run(id).changes > 0;
}
