import { getDb, generateId, getCurrentTimestamp } from './index';

export interface Client {
  id: string;
  name: string;
  dba_name: string | null;
  legal_entity: string | null;
  agency: string | null;
  confidentiality_level: string;
  key_contacts: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubBrand {
  id: string;
  client_id: string;
  name: string;
  positioning_statement: string | null;
  brand_idea: string | null;
  contract_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CastingFramework {
  id: string;
  sub_brand_id: string;
  lens_name: string;
  pillars: any[];
  demographics: any;
  tier_system: any[];
  north_star_references: any[];
  data_points: any[];
  created_at: string;
  updated_at: string;
}

function parseJsonField(val: any, fallback: any = null) {
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
  return val ?? fallback;
}

export function getAllClients(): (Client & { sub_brand_count: number; deal_count: number })[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT c.*,
       (SELECT COUNT(*) FROM sub_brands sb WHERE sb.client_id = c.id) AS sub_brand_count,
       (SELECT COUNT(*) FROM deals d WHERE d.client_id = c.id) AS deal_count
     FROM clients c ORDER BY c.name ASC`
  ).all() as any[];
  return rows.map(r => ({ ...r, key_contacts: parseJsonField(r.key_contacts, []) }));
}

export function getClientById(id: string): (Client & { sub_brands: (SubBrand & { casting_framework: CastingFramework | null })[] }) | null {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
  if (!client) return null;
  client.key_contacts = parseJsonField(client.key_contacts, []);

  const subBrands = db.prepare('SELECT * FROM sub_brands WHERE client_id = ? ORDER BY name ASC').all(id) as any[];
  const enriched = subBrands.map(sb => {
    const fw = db.prepare('SELECT * FROM casting_frameworks WHERE sub_brand_id = ? LIMIT 1').get(sb.id) as any;
    let castingFramework = null;
    if (fw) {
      castingFramework = { ...fw, pillars: parseJsonField(fw.pillars, []), demographics: parseJsonField(fw.demographics, {}), tier_system: parseJsonField(fw.tier_system, []), north_star_references: parseJsonField(fw.north_star_references, []), data_points: parseJsonField(fw.data_points, []) };
    }
    return { ...sb, casting_framework: castingFramework };
  });

  return { ...client, sub_brands: enriched };
}

export function createClient(data: Partial<Client>): Client {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare(
    `INSERT INTO clients (id, name, dba_name, legal_entity, agency, confidentiality_level, key_contacts, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.name ?? '', data.dba_name ?? null, data.legal_entity ?? null, data.agency ?? null, data.confidentiality_level ?? 'standard', JSON.stringify(data.key_contacts ?? []), data.notes ?? null, now, now);
  return { ...db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any, key_contacts: data.key_contacts ?? [] };
}

export function updateClient(id: string, data: Partial<Client>): Client | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(id)) return null;
  const now = getCurrentTimestamp();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.dba_name !== undefined) { fields.push('dba_name = ?'); values.push(data.dba_name); }
  if (data.legal_entity !== undefined) { fields.push('legal_entity = ?'); values.push(data.legal_entity); }
  if (data.agency !== undefined) { fields.push('agency = ?'); values.push(data.agency); }
  if (data.confidentiality_level !== undefined) { fields.push('confidentiality_level = ?'); values.push(data.confidentiality_level); }
  if (data.key_contacts !== undefined) { fields.push('key_contacts = ?'); values.push(JSON.stringify(data.key_contacts)); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (fields.length === 0) return getClientById(id) as any;
  fields.push('updated_at = ?'); values.push(now); values.push(id);
  db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getClientById(id) as any;
}

export function deleteClient(id: string): boolean {
  return getDb().prepare('DELETE FROM clients WHERE id = ?').run(id).changes > 0;
}

export function searchClients(query: string): (Client & { sub_brand_count: number; deal_count: number })[] {
  const db = getDb();
  const pattern = `%${query}%`;
  const rows = db.prepare(
    `SELECT c.*,
       (SELECT COUNT(*) FROM sub_brands sb WHERE sb.client_id = c.id) AS sub_brand_count,
       (SELECT COUNT(*) FROM deals d WHERE d.client_id = c.id) AS deal_count
     FROM clients c
     WHERE c.name LIKE ? OR c.dba_name LIKE ? OR c.agency LIKE ?
     ORDER BY c.name ASC
     LIMIT 10`
  ).all(pattern, pattern, pattern) as any[];
  return rows.map(r => ({ ...r, key_contacts: parseJsonField(r.key_contacts, []) }));
}

export function createSubBrand(data: Partial<SubBrand> & { client_id: string }): SubBrand {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare('INSERT INTO sub_brands (id, client_id, name, positioning_statement, brand_idea, contract_template_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.client_id, data.name ?? '', data.positioning_statement ?? null, data.brand_idea ?? null, data.contract_template_id ?? null, now, now);
  return db.prepare('SELECT * FROM sub_brands WHERE id = ?').get(id) as SubBrand;
}

export function updateSubBrand(id: string, data: Partial<SubBrand>): SubBrand | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM sub_brands WHERE id = ?').get(id)) return null;
  const now = getCurrentTimestamp();
  const fields: string[] = []; const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.positioning_statement !== undefined) { fields.push('positioning_statement = ?'); values.push(data.positioning_statement); }
  if (data.brand_idea !== undefined) { fields.push('brand_idea = ?'); values.push(data.brand_idea); }
  if (fields.length === 0) return db.prepare('SELECT * FROM sub_brands WHERE id = ?').get(id) as SubBrand;
  fields.push('updated_at = ?'); values.push(now); values.push(id);
  db.prepare(`UPDATE sub_brands SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM sub_brands WHERE id = ?').get(id) as SubBrand;
}

export function deleteSubBrand(id: string): boolean {
  return getDb().prepare('DELETE FROM sub_brands WHERE id = ?').run(id).changes > 0;
}

export function createCastingFramework(data: Partial<CastingFramework> & { sub_brand_id: string }): CastingFramework {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();
  db.prepare('INSERT INTO casting_frameworks (id, sub_brand_id, lens_name, pillars, demographics, tier_system, north_star_references, data_points, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.sub_brand_id, data.lens_name ?? '', JSON.stringify(data.pillars ?? []), JSON.stringify(data.demographics ?? {}), JSON.stringify(data.tier_system ?? []), JSON.stringify(data.north_star_references ?? []), JSON.stringify(data.data_points ?? []), now, now);
  const row = db.prepare('SELECT * FROM casting_frameworks WHERE id = ?').get(id) as any;
  return { ...row, pillars: parseJsonField(row.pillars, []), demographics: parseJsonField(row.demographics, {}), tier_system: parseJsonField(row.tier_system, []), north_star_references: parseJsonField(row.north_star_references, []), data_points: parseJsonField(row.data_points, []) };
}

export function updateCastingFramework(id: string, data: Partial<CastingFramework>): CastingFramework | null {
  const db = getDb();
  if (!db.prepare('SELECT id FROM casting_frameworks WHERE id = ?').get(id)) return null;
  const now = getCurrentTimestamp();
  const fields: string[] = []; const values: unknown[] = [];
  if (data.lens_name !== undefined) { fields.push('lens_name = ?'); values.push(data.lens_name); }
  if (data.pillars !== undefined) { fields.push('pillars = ?'); values.push(JSON.stringify(data.pillars)); }
  if (data.demographics !== undefined) { fields.push('demographics = ?'); values.push(JSON.stringify(data.demographics)); }
  if (data.tier_system !== undefined) { fields.push('tier_system = ?'); values.push(JSON.stringify(data.tier_system)); }
  if (data.north_star_references !== undefined) { fields.push('north_star_references = ?'); values.push(JSON.stringify(data.north_star_references)); }
  if (data.data_points !== undefined) { fields.push('data_points = ?'); values.push(JSON.stringify(data.data_points)); }
  if (fields.length === 0) { const row = db.prepare('SELECT * FROM casting_frameworks WHERE id = ?').get(id) as any; return { ...row, pillars: parseJsonField(row.pillars, []), demographics: parseJsonField(row.demographics, {}), tier_system: parseJsonField(row.tier_system, []), north_star_references: parseJsonField(row.north_star_references, []), data_points: parseJsonField(row.data_points, []) }; }
  fields.push('updated_at = ?'); values.push(now); values.push(id);
  db.prepare(`UPDATE casting_frameworks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM casting_frameworks WHERE id = ?').get(id) as any;
  return { ...row, pillars: parseJsonField(row.pillars, []), demographics: parseJsonField(row.demographics, {}), tier_system: parseJsonField(row.tier_system, []), north_star_references: parseJsonField(row.north_star_references, []), data_points: parseJsonField(row.data_points, []) };
}
