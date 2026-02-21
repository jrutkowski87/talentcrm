import { getDb, generateId, getCurrentTimestamp } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SongRightsEntry {
  id: string;
  song_id: string;
  rights_holder_id: string;
  side: 'master' | 'publishing';
  share_percentage: number;
  role: string;
  controlled_by_id: string | null;
  territory: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  rights_holder_name?: string;
  rights_holder_type?: string;
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

export function getRightsBySong(songId: string): SongRightsEntry[] {
  const db = getDb();
  return db.prepare(
    `SELECT srh.*, rh.name AS rights_holder_name, rh.type AS rights_holder_type
     FROM song_rights_holders srh
     INNER JOIN rights_holders rh ON srh.rights_holder_id = rh.id
     WHERE srh.song_id = ?
     ORDER BY srh.side, srh.share_percentage DESC`
  ).all(songId) as SongRightsEntry[];
}

export function addRightsHolderToSong(data: {
  song_id: string;
  rights_holder_id: string;
  side: 'master' | 'publishing';
  share_percentage: number;
  role?: string;
  controlled_by_id?: string;
  territory?: string;
  notes?: string;
}): SongRightsEntry {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    `INSERT INTO song_rights_holders (id, song_id, rights_holder_id, side, share_percentage, role, controlled_by_id, territory, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.song_id,
    data.rights_holder_id,
    data.side,
    data.share_percentage,
    data.role ?? 'other',
    data.controlled_by_id ?? null,
    data.territory ?? null,
    data.notes ?? null,
    now,
    now
  );

  return db.prepare(
    `SELECT srh.*, rh.name AS rights_holder_name, rh.type AS rights_holder_type
     FROM song_rights_holders srh
     INNER JOIN rights_holders rh ON srh.rights_holder_id = rh.id
     WHERE srh.id = ?`
  ).get(id) as SongRightsEntry;
}

export function updateSongRightsEntry(id: string, data: Partial<SongRightsEntry>): SongRightsEntry | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM song_rights_holders WHERE id = ?').get(id);
  if (!existing) return undefined;

  const { id: _id, created_at: _ca, updated_at: _ua, rights_holder_name: _n, rights_holder_type: _t, ...updateData } = data as any;
  const now = getCurrentTimestamp();

  const fields = Object.keys(updateData);
  if (fields.length === 0) {
    return db.prepare(
      `SELECT srh.*, rh.name AS rights_holder_name, rh.type AS rights_holder_type
       FROM song_rights_holders srh
       INNER JOIN rights_holders rh ON srh.rights_holder_id = rh.id
       WHERE srh.id = ?`
    ).get(id) as SongRightsEntry;
  }

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updateData[f]);

  db.prepare(`UPDATE song_rights_holders SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);

  return db.prepare(
    `SELECT srh.*, rh.name AS rights_holder_name, rh.type AS rights_holder_type
     FROM song_rights_holders srh
     INNER JOIN rights_holders rh ON srh.rights_holder_id = rh.id
     WHERE srh.id = ?`
  ).get(id) as SongRightsEntry;
}

export function removeSongRightsEntry(id: string): boolean {
  return getDb().prepare('DELETE FROM song_rights_holders WHERE id = ?').run(id).changes > 0;
}

/**
 * Validate that share percentages for a given side of a song sum to ~100%.
 * Returns { valid: boolean, total: number, side: string }
 */
export function validateSharePercentages(songId: string, side: 'master' | 'publishing'): { valid: boolean; total: number; side: string } {
  const db = getDb();
  const result = db.prepare(
    `SELECT COALESCE(SUM(share_percentage), 0) AS total FROM song_rights_holders WHERE song_id = ? AND side = ?`
  ).get(songId, side) as { total: number };

  return {
    valid: Math.abs(result.total - 100) < 0.01,
    total: result.total,
    side,
  };
}
