import { getDb, generateId, getCurrentTimestamp } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Song {
  id: string;
  title: string;
  artist_name: string;
  album: string | null;
  release_year: number | null;
  genre: string | null;
  duration_seconds: number | null;
  isrc: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SongWithRights extends Song {
  rights_holders: {
    id: string;
    rights_holder_id: string;
    rights_holder_name: string;
    rights_holder_type: string;
    side: string;
    share_percentage: number;
    role: string;
    controlled_by_id: string | null;
    territory: string | null;
    notes: string | null;
  }[];
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

export function getAllSongs(): Song[] {
  const db = getDb();
  return db.prepare('SELECT * FROM songs ORDER BY updated_at DESC').all() as Song[];
}

export function getSongById(id: string): SongWithRights | undefined {
  const db = getDb();
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Song | undefined;
  if (!song) return undefined;

  const rights = db.prepare(
    `SELECT srh.*, rh.name AS rights_holder_name, rh.type AS rights_holder_type
     FROM song_rights_holders srh
     INNER JOIN rights_holders rh ON srh.rights_holder_id = rh.id
     WHERE srh.song_id = ?
     ORDER BY srh.side, srh.share_percentage DESC`
  ).all(id) as SongWithRights['rights_holders'];

  return { ...song, rights_holders: rights };
}

export function createSong(data: Partial<Song>): Song {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    `INSERT INTO songs (id, title, artist_name, album, release_year, genre, duration_seconds, isrc, spotify_url, apple_music_url, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.title ?? '',
    data.artist_name ?? '',
    data.album ?? null,
    data.release_year ?? null,
    data.genre ?? null,
    data.duration_seconds ?? null,
    data.isrc ?? null,
    data.spotify_url ?? null,
    data.apple_music_url ?? null,
    data.notes ?? null,
    now,
    now
  );

  return db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Song;
}

export function updateSong(id: string, data: Partial<Song>): Song | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM songs WHERE id = ?').get(id);
  if (!existing) return undefined;

  const { id: _id, created_at: _ca, updated_at: _ua, ...updateData } = data as any;
  const now = getCurrentTimestamp();

  const fields = Object.keys(updateData);
  if (fields.length === 0) return db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Song;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updateData[f]);

  db.prepare(`UPDATE songs SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);
  return db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Song;
}

export function deleteSong(id: string): boolean {
  return getDb().prepare('DELETE FROM songs WHERE id = ?').run(id).changes > 0;
}

export function searchSongs(query: string): Song[] {
  const db = getDb();
  const pattern = `%${query}%`;
  return db.prepare(
    `SELECT * FROM songs WHERE title LIKE ? OR artist_name LIKE ? OR album LIKE ? ORDER BY updated_at DESC`
  ).all(pattern, pattern, pattern) as Song[];
}
