import { getDb, generateId, getCurrentTimestamp } from './index';

export interface Rep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agency: string | null;
  role: string;
  notes: string | null;
  avg_response_days: number | null;
  deals_offered: number;
  deals_closed: number;
  created_at: string;
  updated_at: string;
}

export interface RepWithTalent extends Rep {
  talent: { id: string; name: string; category: string; relationship_type: string; is_primary: boolean }[];
}

export function getAllReps(): Rep[] {
  const db = getDb();
  return db.prepare('SELECT * FROM reps ORDER BY name ASC').all() as Rep[];
}

export function getRepById(id: string): RepWithTalent | null {
  const db = getDb();
  const rep = db.prepare('SELECT * FROM reps WHERE id = ?').get(id) as Rep | undefined;
  if (!rep) return null;

  const talent = db.prepare(
    `SELECT t.id, t.name, t.category, tr.relationship_type, tr.is_primary
     FROM talent_reps tr
     INNER JOIN talent t ON tr.talent_id = t.id
     WHERE tr.rep_id = ?
     ORDER BY t.name ASC`
  ).all(id) as any[];

  return { ...rep, talent };
}

export function createRep(data: Partial<Rep>): Rep {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    `INSERT INTO reps (id, name, email, phone, agency, role, notes, avg_response_days, deals_offered, deals_closed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.name ?? '', data.email ?? null, data.phone ?? null, data.agency ?? null, data.role ?? 'agent', data.notes ?? null, data.avg_response_days ?? null, data.deals_offered ?? 0, data.deals_closed ?? 0, now, now);

  return db.prepare('SELECT * FROM reps WHERE id = ?').get(id) as Rep;
}

export function updateRep(id: string, data: Partial<Rep>): Rep | null {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM reps WHERE id = ?').get(id);
  if (!existing) return null;

  const now = getCurrentTimestamp();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.agency !== undefined) { fields.push('agency = ?'); values.push(data.agency); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.avg_response_days !== undefined) { fields.push('avg_response_days = ?'); values.push(data.avg_response_days); }
  if (data.deals_offered !== undefined) { fields.push('deals_offered = ?'); values.push(data.deals_offered); }
  if (data.deals_closed !== undefined) { fields.push('deals_closed = ?'); values.push(data.deals_closed); }

  if (fields.length === 0) return db.prepare('SELECT * FROM reps WHERE id = ?').get(id) as Rep;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE reps SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM reps WHERE id = ?').get(id) as Rep;
}

export function deleteRep(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM reps WHERE id = ?').run(id).changes > 0;
}

export function linkTalentToRep(talentId: string, repId: string, relationshipType: string, isPrimary: boolean = false): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO talent_reps (talent_id, rep_id, relationship_type, is_primary) VALUES (?, ?, ?, ?)`
  ).run(talentId, repId, relationshipType, isPrimary ? 1 : 0);
}

export function unlinkTalentFromRep(talentId: string, repId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM talent_reps WHERE talent_id = ? AND rep_id = ?').run(talentId, repId);
}
