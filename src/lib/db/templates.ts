import { getDb, generateId, getCurrentTimestamp } from './index';

export interface DealTemplate {
  id: string;
  name: string;
  deal_type: string;
  description: string | null;
  template_data: string; // JSON string
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateData {
  deal_type?: string;
  total_fee?: number;
  usage_rights?: string;
  exclusivity?: string;
  term_length?: string;
  deliverables?: string;
  travel_required?: boolean;
  hmu_provided?: boolean;
  social_media_posts?: number;
  approval_rights?: string;
  territory?: string;
  media?: string;
  license_type?: string;
  usage_type?: string;
  [key: string]: any;
}

export function getAllTemplates(): DealTemplate[] {
  const db = getDb();
  return db.prepare('SELECT * FROM deal_templates ORDER BY updated_at DESC').all() as DealTemplate[];
}

export function getTemplatesByType(dealType: string): DealTemplate[] {
  const db = getDb();
  return db.prepare('SELECT * FROM deal_templates WHERE deal_type = ? ORDER BY name ASC').all(dealType) as DealTemplate[];
}

export function getTemplateById(id: string): DealTemplate | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM deal_templates WHERE id = ?').get(id);
  return (row as DealTemplate) || null;
}

export function createTemplate(data: {
  name: string;
  deal_type: string;
  description?: string;
  template_data: TemplateData;
  created_by?: string;
}): DealTemplate {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare(
    'INSERT INTO deal_templates (id, name, deal_type, description, template_data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.name, data.deal_type, data.description ?? null, JSON.stringify(data.template_data), data.created_by ?? null, now, now);
  return db.prepare('SELECT * FROM deal_templates WHERE id = ?').get(id) as DealTemplate;
}

export function updateTemplate(id: string, data: {
  name?: string;
  description?: string;
  template_data?: TemplateData;
}): DealTemplate | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM deal_templates WHERE id = ?').get(id);
  if (!existing) return null;

  if (data.name !== undefined) {
    db.prepare('UPDATE deal_templates SET name = ? WHERE id = ?').run(data.name, id);
  }
  if (data.description !== undefined) {
    db.prepare('UPDATE deal_templates SET description = ? WHERE id = ?').run(data.description, id);
  }
  if (data.template_data !== undefined) {
    db.prepare('UPDATE deal_templates SET template_data = ? WHERE id = ?').run(JSON.stringify(data.template_data), id);
  }
  return db.prepare('SELECT * FROM deal_templates WHERE id = ?').get(id) as DealTemplate;
}

export function deleteTemplate(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_templates WHERE id = ?').run(id).changes > 0;
}
