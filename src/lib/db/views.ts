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
  const existing = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
  if (!existing) return null;

  if (data.name !== undefined) {
    db.prepare('UPDATE saved_views SET name = ? WHERE id = ?').run(data.name, id);
  }
  if (data.description !== undefined) {
    db.prepare('UPDATE saved_views SET description = ? WHERE id = ?').run(data.description, id);
  }
  if (data.filter_data !== undefined) {
    db.prepare('UPDATE saved_views SET filter_data = ? WHERE id = ?').run(JSON.stringify(data.filter_data), id);
  }
  if (data.is_default !== undefined) {
    db.prepare('UPDATE saved_views SET is_default = ? WHERE id = ?').run(data.is_default ? 1 : 0, id);
  }

  return db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id) as SavedView;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteView(id: string): boolean {
  return getDb().prepare('DELETE FROM saved_views WHERE id = ?').run(id).changes > 0;
}
