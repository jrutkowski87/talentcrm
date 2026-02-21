import { getDb, generateId, getCurrentTimestamp } from './index';

export interface ShortlistEntry {
  id: string;
  deal_id: string;
  talent_id: string;
  submitted_by_rep_id: string | null;
  estimated_rate: string | null;
  availability: string | null;
  availability_status: string;
  interest_level: string;
  rep_notes: string | null;
  your_notes: string | null;
  red_flags: string | null;
  fit_score: number | null;
  fit_scorecard: any;
  status: string;
  passed_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShortlistEntryWithDetails extends ShortlistEntry {
  talent_name: string;
  talent_category: string;
  talent_social_handles: any;
  talent_location: string | null;
  talent_rate_range: string | null;
  rep_name: string | null;
  rep_agency: string | null;
}

function parseRow(row: any): ShortlistEntryWithDetails {
  if (!row) return row;
  const p = { ...row };
  if (typeof p.fit_scorecard === 'string') try { p.fit_scorecard = JSON.parse(p.fit_scorecard); } catch {}
  if (typeof p.talent_social_handles === 'string') try { p.talent_social_handles = JSON.parse(p.talent_social_handles); } catch {}
  return p;
}

export function getShortlistByDeal(dealId: string): ShortlistEntryWithDetails[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT s.*, t.name AS talent_name, t.category AS talent_category, t.social_handles AS talent_social_handles, t.location AS talent_location, t.rate_range AS talent_rate_range, r.name AS rep_name, r.agency AS rep_agency
     FROM deal_talent_shortlist s
     INNER JOIN talent t ON s.talent_id = t.id
     LEFT JOIN reps r ON s.submitted_by_rep_id = r.id
     WHERE s.deal_id = ? ORDER BY s.created_at DESC`
  ).all(dealId) as any[];
  return rows.map(parseRow);
}

export function addToShortlist(data: Partial<ShortlistEntry> & { deal_id: string; talent_id: string }): ShortlistEntryWithDetails {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare(
    `INSERT INTO deal_talent_shortlist (id, deal_id, talent_id, submitted_by_rep_id, estimated_rate, availability, availability_status, interest_level, rep_notes, your_notes, red_flags, fit_score, fit_scorecard, status, passed_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.deal_id, data.talent_id, data.submitted_by_rep_id ?? null, data.estimated_rate ?? null, data.availability ?? null, data.availability_status ?? 'unknown', data.interest_level ?? 'unknown', data.rep_notes ?? null, data.your_notes ?? null, data.red_flags ?? null, data.fit_score ?? null, JSON.stringify(data.fit_scorecard ?? {}), data.status ?? 'considering', data.passed_reason ?? null, now, now);

  const row = db.prepare(
    `SELECT s.*, t.name AS talent_name, t.category AS talent_category, t.social_handles AS talent_social_handles, t.location AS talent_location, t.rate_range AS talent_rate_range, r.name AS rep_name, r.agency AS rep_agency
     FROM deal_talent_shortlist s INNER JOIN talent t ON s.talent_id = t.id LEFT JOIN reps r ON s.submitted_by_rep_id = r.id WHERE s.id = ?`
  ).get(id) as any;
  return parseRow(row);
}

export function updateShortlistEntry(id: string, data: Partial<ShortlistEntry>): ShortlistEntryWithDetails | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM deal_talent_shortlist WHERE id = ?').get(id)) return null;
  const now = getCurrentTimestamp();
  const fields: string[] = []; const values: unknown[] = [];
  if (data.estimated_rate !== undefined) { fields.push('estimated_rate = ?'); values.push(data.estimated_rate); }
  if (data.availability !== undefined) { fields.push('availability = ?'); values.push(data.availability); }
  if (data.availability_status !== undefined) { fields.push('availability_status = ?'); values.push(data.availability_status); }
  if (data.interest_level !== undefined) { fields.push('interest_level = ?'); values.push(data.interest_level); }
  if (data.rep_notes !== undefined) { fields.push('rep_notes = ?'); values.push(data.rep_notes); }
  if (data.your_notes !== undefined) { fields.push('your_notes = ?'); values.push(data.your_notes); }
  if (data.red_flags !== undefined) { fields.push('red_flags = ?'); values.push(data.red_flags); }
  if (data.fit_score !== undefined) { fields.push('fit_score = ?'); values.push(data.fit_score); }
  if (data.fit_scorecard !== undefined) { fields.push('fit_scorecard = ?'); values.push(JSON.stringify(data.fit_scorecard)); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.passed_reason !== undefined) { fields.push('passed_reason = ?'); values.push(data.passed_reason); }
  if (fields.length > 0) { fields.push('updated_at = ?'); values.push(now); values.push(id); db.prepare(`UPDATE deal_talent_shortlist SET ${fields.join(', ')} WHERE id = ?`).run(...values); }

  const row = db.prepare(
    `SELECT s.*, t.name AS talent_name, t.category AS talent_category, t.social_handles AS talent_social_handles, t.location AS talent_location, t.rate_range AS talent_rate_range, r.name AS rep_name, r.agency AS rep_agency
     FROM deal_talent_shortlist s INNER JOIN talent t ON s.talent_id = t.id LEFT JOIN reps r ON s.submitted_by_rep_id = r.id WHERE s.id = ?`
  ).get(id) as any;
  return parseRow(row);
}

export function removeFromShortlist(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_talent_shortlist WHERE id = ?').run(id).changes > 0;
}
