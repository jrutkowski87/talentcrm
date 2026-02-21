import { getDb, generateId, getCurrentTimestamp } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RightsHolderType = 'label' | 'publisher' | 'administrator' | 'songwriter' | 'other';

export interface RightsHolder {
  id: string;
  name: string;
  type: RightsHolderType;
  parent_company: string | null;
  pro_affiliation: string | null;
  ipi_number: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_title: string | null;
  address: string | null;
  notes: string | null;
  avg_response_days: number | null;
  deals_offered: number;
  deals_closed: number;
  created_at: string;
  updated_at: string;
}

export interface RightsHolderWithSongs extends RightsHolder {
  songs: {
    id: string;
    song_id: string;
    song_title: string;
    artist_name: string;
    side: string;
    share_percentage: number;
    role: string;
  }[];
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

export function getAllRightsHolders(): RightsHolder[] {
  const db = getDb();
  return db.prepare('SELECT * FROM rights_holders ORDER BY updated_at DESC').all() as RightsHolder[];
}

export function getRightsHolderById(id: string): RightsHolderWithSongs | undefined {
  const db = getDb();
  const rh = db.prepare('SELECT * FROM rights_holders WHERE id = ?').get(id) as RightsHolder | undefined;
  if (!rh) return undefined;

  const songs = db.prepare(
    `SELECT srh.id, srh.song_id, s.title AS song_title, s.artist_name, srh.side, srh.share_percentage, srh.role
     FROM song_rights_holders srh
     INNER JOIN songs s ON srh.song_id = s.id
     WHERE srh.rights_holder_id = ?
     ORDER BY s.title`
  ).all(id) as RightsHolderWithSongs['songs'];

  return { ...rh, songs };
}

export function createRightsHolder(data: Partial<RightsHolder>): RightsHolder {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    `INSERT INTO rights_holders (id, name, type, parent_company, pro_affiliation, ipi_number, email, phone, contact_name, contact_title, address, notes, avg_response_days, deals_offered, deals_closed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name ?? '',
    data.type ?? 'publisher',
    data.parent_company ?? null,
    data.pro_affiliation ?? null,
    data.ipi_number ?? null,
    data.email ?? null,
    data.phone ?? null,
    data.contact_name ?? null,
    data.contact_title ?? null,
    data.address ?? null,
    data.notes ?? null,
    data.avg_response_days ?? null,
    data.deals_offered ?? 0,
    data.deals_closed ?? 0,
    now,
    now
  );

  return db.prepare('SELECT * FROM rights_holders WHERE id = ?').get(id) as RightsHolder;
}

export function updateRightsHolder(id: string, data: Partial<RightsHolder>): RightsHolder | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM rights_holders WHERE id = ?').get(id);
  if (!existing) return undefined;

  const { id: _id, created_at: _ca, updated_at: _ua, ...updateData } = data as any;
  const now = getCurrentTimestamp();

  const fields = Object.keys(updateData);
  if (fields.length === 0) return db.prepare('SELECT * FROM rights_holders WHERE id = ?').get(id) as RightsHolder;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updateData[f]);

  db.prepare(`UPDATE rights_holders SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);
  return db.prepare('SELECT * FROM rights_holders WHERE id = ?').get(id) as RightsHolder;
}

export function deleteRightsHolder(id: string): boolean {
  return getDb().prepare('DELETE FROM rights_holders WHERE id = ?').run(id).changes > 0;
}

export function searchRightsHolders(query: string): RightsHolder[] {
  const db = getDb();
  const pattern = `%${query}%`;
  return db.prepare(
    `SELECT * FROM rights_holders WHERE name LIKE ? OR parent_company LIKE ? OR contact_name LIKE ? ORDER BY updated_at DESC`
  ).all(pattern, pattern, pattern) as RightsHolder[];
}
