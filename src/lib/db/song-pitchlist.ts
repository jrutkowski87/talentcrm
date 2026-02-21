import { getDb, generateId, getCurrentTimestamp } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PitchStatus = 'considering' | 'pitched' | 'client_reviewing' | 'selected' | 'rejected' | 'on_hold';

export interface PitchlistEntry {
  id: string;
  deal_id: string;
  song_id: string;
  pitch_status: PitchStatus;
  client_notes: string | null;
  internal_notes: string | null;
  fit_score: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  song_title?: string;
  artist_name?: string;
  genre?: string;
  duration_seconds?: number | null;
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

const SELECT_WITH_SONG = `
  SELECT p.*, s.title AS song_title, s.artist_name, s.genre, s.duration_seconds
  FROM deal_song_pitchlist p
  INNER JOIN songs s ON p.song_id = s.id
`;

export function getPitchlistByDeal(dealId: string): PitchlistEntry[] {
  const db = getDb();
  return db.prepare(
    `${SELECT_WITH_SONG} WHERE p.deal_id = ? ORDER BY p.created_at DESC`
  ).all(dealId) as PitchlistEntry[];
}

export function addToPitchlist(data: {
  deal_id: string;
  song_id: string;
  pitch_status?: PitchStatus;
  client_notes?: string;
  internal_notes?: string;
  fit_score?: number;
}): PitchlistEntry {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    `INSERT INTO deal_song_pitchlist (id, deal_id, song_id, pitch_status, client_notes, internal_notes, fit_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.deal_id,
    data.song_id,
    data.pitch_status ?? 'considering',
    data.client_notes ?? null,
    data.internal_notes ?? null,
    data.fit_score ?? null,
    now,
    now
  );

  return db.prepare(`${SELECT_WITH_SONG} WHERE p.id = ?`).get(id) as PitchlistEntry;
}

export function updatePitchEntry(id: string, data: Partial<PitchlistEntry>): PitchlistEntry | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM deal_song_pitchlist WHERE id = ?').get(id);
  if (!existing) return undefined;

  const { id: _id, created_at: _ca, updated_at: _ua, song_title: _st, artist_name: _an, genre: _g, duration_seconds: _ds, ...updateData } = data as any;
  const now = getCurrentTimestamp();

  const fields = Object.keys(updateData);
  if (fields.length === 0) return db.prepare(`${SELECT_WITH_SONG} WHERE p.id = ?`).get(id) as PitchlistEntry;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updateData[f]);

  db.prepare(`UPDATE deal_song_pitchlist SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);
  return db.prepare(`${SELECT_WITH_SONG} WHERE p.id = ?`).get(id) as PitchlistEntry;
}

export function removeFromPitchlist(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_song_pitchlist WHERE id = ?').run(id).changes > 0;
}
