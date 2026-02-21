import { getDb, generateId, getCurrentTimestamp } from './index';

export interface Talent {
  id: string;
  name: string;
  category:
    | 'actor'
    | 'musician'
    | 'athlete'
    | 'influencer'
    | 'model'
    | 'creator'
    | 'comedian'
    | 'chef'
    | 'photographer'
    | 'artist'
    | 'other';
  bio: string | null;
  notes: string | null;
  social_handles: Record<string, string>;
  social_followers: Record<string, number>;
  location: string | null;
  loan_out_company: string | null;
  loan_out_address: string | null;
  rate_range: string | null;
  categories_worked: string[];
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface Rep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agency: string | null;
  role: 'agent' | 'manager' | 'publicist' | 'lawyer' | 'other';
  notes: string | null;
  avg_response_days: number | null;
  deals_offered: number;
  deals_closed: number;
  created_at: string;
  updated_at: string;
}

export interface TalentWithReps extends Talent {
  reps: (Rep & { relationship_type: string; is_primary: boolean })[];
}

function safeJsonParse(val: unknown, fallback: unknown): unknown {
  if (!val || typeof val !== 'string') return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function parseTalentRow(row: Record<string, unknown>): Talent {
  return {
    ...row,
    social_handles: safeJsonParse(row.social_handles, {}),
    social_followers: safeJsonParse(row.social_followers, {}),
    categories_worked: safeJsonParse(row.categories_worked, []),
  } as Talent;
}

function parseRepRow(row: Record<string, unknown>): Rep {
  return row as unknown as Rep;
}

export function getAllTalent(): Talent[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM talent ORDER BY name ASC').all() as Record<string, unknown>[];
  return rows.map(parseTalentRow);
}

export function getTalentById(id: string): TalentWithReps | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM talent WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;

  const talent = parseTalentRow(row);

  const repRows = db
    .prepare(
      `SELECT r.*, tr.relationship_type, tr.is_primary
       FROM reps r
       INNER JOIN talent_reps tr ON tr.rep_id = r.id
       WHERE tr.talent_id = ?`
    )
    .all(id) as (Record<string, unknown> & { relationship_type: string; is_primary: number })[];

  const reps = repRows.map((r) => ({
    ...parseRepRow(r),
    relationship_type: r.relationship_type as string,
    is_primary: Boolean(r.is_primary),
  }));

  return { ...talent, reps };
}

export function createTalent(
  data: Omit<Talent, 'id' | 'created_at' | 'updated_at'>
): Talent {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  const stmt = db.prepare(
    `INSERT INTO talent (id, name, category, bio, notes, social_handles, social_followers, location, loan_out_company, loan_out_address, rate_range, categories_worked, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.run(
    id,
    data.name,
    data.category,
    data.bio ?? null,
    data.notes ?? null,
    JSON.stringify(data.social_handles ?? {}),
    JSON.stringify(data.social_followers ?? {}),
    data.location ?? null,
    data.loan_out_company ?? null,
    data.loan_out_address ?? null,
    data.rate_range ?? null,
    JSON.stringify(data.categories_worked ?? []),
    data.rating ?? null,
    now,
    now
  );

  return getTalentById(id) as unknown as Talent;
}

export function updateTalent(
  id: string,
  data: Partial<Omit<Talent, 'id' | 'created_at' | 'updated_at'>>
): Talent | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM talent WHERE id = ?').get(id);
  if (!existing) return null;

  const now = getCurrentTimestamp();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.category !== undefined) {
    fields.push('category = ?');
    values.push(data.category);
  }
  if (data.bio !== undefined) {
    fields.push('bio = ?');
    values.push(data.bio);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes);
  }
  if (data.social_handles !== undefined) {
    fields.push('social_handles = ?');
    values.push(JSON.stringify(data.social_handles));
  }
  if (data.social_followers !== undefined) {
    fields.push('social_followers = ?');
    values.push(JSON.stringify(data.social_followers));
  }
  if (data.location !== undefined) {
    fields.push('location = ?');
    values.push(data.location);
  }
  if (data.loan_out_company !== undefined) {
    fields.push('loan_out_company = ?');
    values.push(data.loan_out_company);
  }
  if (data.loan_out_address !== undefined) {
    fields.push('loan_out_address = ?');
    values.push(data.loan_out_address);
  }
  if (data.rate_range !== undefined) {
    fields.push('rate_range = ?');
    values.push(data.rate_range);
  }
  if (data.categories_worked !== undefined) {
    fields.push('categories_worked = ?');
    values.push(JSON.stringify(data.categories_worked));
  }
  if (data.rating !== undefined) {
    fields.push('rating = ?');
    values.push(data.rating);
  }

  if (fields.length === 0) {
    return parseTalentRow(existing as Record<string, unknown>);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE talent SET ${fields.join(', ')} WHERE id = ?`).run(
    ...values
  );

  const updated = db.prepare('SELECT * FROM talent WHERE id = ?').get(id) as Record<string, unknown>;
  return parseTalentRow(updated);
}

export function deleteTalent(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM talent WHERE id = ?').run(id);
  return result.changes > 0;
}

export function searchTalent(query: string): Talent[] {
  const db = getDb();
  const pattern = `%${query}%`;
  const rows = db
    .prepare(
      `SELECT * FROM talent
       WHERE name LIKE ? OR category LIKE ? OR location LIKE ?
       ORDER BY name ASC`
    )
    .all(pattern, pattern, pattern) as Record<string, unknown>[];
  return rows.map(parseTalentRow);
}

export function getTalentDealHistory(talentId: string): Record<string, unknown>[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM deals WHERE talent_id = ? ORDER BY created_at DESC')
    .all(talentId) as Record<string, unknown>[];
  return rows;
}
