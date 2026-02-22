import { getDb, generateId, getCurrentTimestamp } from './index';

export interface DealTask {
  id: string;
  deal_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string | null;
  auto_generated: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function getTasksByDeal(dealId: string): DealTask[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM deal_tasks WHERE deal_id = ? ORDER BY CASE status WHEN \'pending\' THEN 0 WHEN \'in_progress\' THEN 1 WHEN \'completed\' THEN 2 END, due_date ASC'
  ).all(dealId) as DealTask[];
}

export function getUpcomingTasks(days: number = 7): (DealTask & { deal_name?: string })[] {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return db.prepare(`
    SELECT t.*, d.deal_name as deal_name
    FROM deal_tasks t
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.status != 'completed'
      AND (t.due_date IS NULL OR t.due_date <= ?)
    ORDER BY
      CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
      t.due_date ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
  `).all(cutoff.toISOString().split('T')[0]) as (DealTask & { deal_name?: string })[];
}

export function createTask(data: {
  deal_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  auto_generated?: boolean;
}): DealTask {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare(
    `INSERT INTO deal_tasks (id, deal_id, title, description, due_date, priority, status, assigned_to, auto_generated, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).run(
    id,
    data.deal_id,
    data.title,
    data.description ?? null,
    data.due_date ?? null,
    data.priority ?? 'medium',
    data.assigned_to ?? null,
    data.auto_generated ? 1 : 0,
    now,
    now
  );
  return db.prepare('SELECT * FROM deal_tasks WHERE id = ?').get(id) as DealTask;
}

export function updateTask(id: string, data: Partial<{
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
}>): DealTask | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM deal_tasks WHERE id = ?').get(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
    if (data.status === 'completed') {
      fields.push('completed_at = ?');
      values.push(getCurrentTimestamp());
    } else {
      fields.push('completed_at = ?');
      values.push(null);
    }
  }
  if (data.assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(data.assigned_to); }

  if (fields.length === 0) return existing as DealTask;

  values.push(id);
  db.prepare(`UPDATE deal_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM deal_tasks WHERE id = ?').get(id) as DealTask;
}

export function completeTask(id: string): DealTask | null {
  return updateTask(id, { status: 'completed' });
}

export function deleteTask(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_tasks WHERE id = ?').run(id).changes > 0;
}

export function getTaskCounts(): { overdue: number; due_today: number; total_pending: number } {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const overdue = (db.prepare(
    `SELECT count(*) as count FROM deal_tasks WHERE status != 'completed' AND due_date < ?`
  ).get(today) as { count: number }).count;

  const dueToday = (db.prepare(
    `SELECT count(*) as count FROM deal_tasks WHERE status != 'completed' AND due_date = ?`
  ).get(today) as { count: number }).count;

  const totalPending = (db.prepare(
    `SELECT count(*) as count FROM deal_tasks WHERE status != 'completed'`
  ).get() as { count: number }).count;

  return { overdue, due_today: dueToday, total_pending: totalPending };
}
