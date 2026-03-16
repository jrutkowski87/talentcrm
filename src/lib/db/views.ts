import { getDb, generateId, getCurrentTimestamp } from './index';

export interface SavedView {
  id: string;
  name: string;
  description: string | null;
  filter_data: string; // JSON string
  is_default: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FilterData {
  dealType: 'all' | 'talent' | 'music';
  stages: string[];
  clientIds: string[];
  feeMin: number | null;
  feeMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function getAllViews(): SavedView[] {
  const db = getDb();
  return db.prepare('SELECT * FROM saved_views ORDER BY name ASC').all() as SavedView[];
}

export function getViewById(id: string): SavedView | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
  return (row as SavedView) || null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createView(data: {
  name: string;
  description?: string;
  filter_data: FilterData;
  is_default?: boolean;
  created_by?: string;
}): SavedView {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    'INSERT INTO saved_views (id, name, description, filter_data, is_default, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    data.name,
    data.description ?? null,
    JSON.stringify(data.filter_data),
    data.is_default ? 1 : 0,
    data.created_by ?? null,
    now,
    now
  );

  return db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id) as SavedView;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function updateView(id: string, data: {
  name?: string;
  description?: string;
  filter_data?: FilterData;
  is_default?: boolean;
}): SavedView | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM saved_views WHERE id = ?').get(id)) return null;

  const now = getCurrentTimestamp();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.filter_data !== undefined) { fields.push('filter_data = ?'); values.push(JSON.stringify(data.filter_data)); }
  if (data.is_default !== undefined) { fields.push('is_default = ?'); values.push(data.is_default ? 1 : 0); }

  if (fields.length === 0) return db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id) as SavedView;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  db.prepare(`UPDATE saved_views SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id) as SavedView;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteView(id: string): boolean {
  return getDb().prepare('DELETE FROM saved_views WHERE id = ?').run(id).changes > 0;
}
