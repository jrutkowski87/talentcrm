import { getDb, generateId, getCurrentTimestamp } from '../db';
import { createChange } from './changes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DealType = 'talent' | 'music' | 'talent_and_music';

export type DealStatus =
  | 'creative_brief'
  | 'outreach'
  | 'shortlist'
  | 'approval_to_offer'
  | 'negotiation'
  | 'talent_buyin'
  | 'contract_drafting'
  | 'admin_logistics'
  | 'fulfillment'
  | 'complete'
  // Music pipeline stages
  | 'music_brief'
  | 'song_pitching'
  | 'song_selection'
  | 'rights_negotiation'
  | 'license_drafting'
  | 'music_admin'
  | 'delivery'
  | 'archived'
  | 'dead';

export const TALENT_PIPELINE_STAGES: DealStatus[] = [
  'creative_brief', 'outreach', 'shortlist', 'approval_to_offer',
  'negotiation', 'talent_buyin', 'contract_drafting', 'admin_logistics',
  'fulfillment', 'complete',
];

export const MUSIC_PIPELINE_STAGES: DealStatus[] = [
  'music_brief', 'song_pitching', 'song_selection', 'rights_negotiation',
  'license_drafting', 'music_admin', 'delivery', 'complete',
];

export function getPipelineStages(dealType: DealType): DealStatus[] {
  if (dealType === 'music') return MUSIC_PIPELINE_STAGES;
  return TALENT_PIPELINE_STAGES; // talent and talent_and_music use talent pipeline
}

export const STAGE_LABELS: Record<string, string> = {
  creative_brief: 'Creative Brief',
  outreach: 'Outreach',
  shortlist: 'Shortlist',
  approval_to_offer: 'Approval to Offer',
  negotiation: 'Negotiation',
  talent_buyin: 'Talent Buy-In',
  contract_drafting: 'Contract Drafting',
  admin_logistics: 'Admin & Logistics',
  fulfillment: 'Fulfillment',
  complete: 'Complete',
  music_brief: 'Music Brief',
  song_pitching: 'Song Pitching',
  song_selection: 'Song Selection',
  rights_negotiation: 'Rights Negotiation',
  license_drafting: 'License Drafting',
  music_admin: 'Music Admin',
  delivery: 'Delivery',
  archived: 'Archived',
  dead: 'Dead',
};

export interface Deal {
  id: string;
  client_id: string;
  sub_brand_id: string | null;
  deal_name: string;
  campaign_name: string;
  status: DealStatus;
  talent_id: string | null;
  brief_raw_text: string | null;
  brief_parsed_data: any;
  effective_date: string | null;
  service_days: any[];
  social_posts: any;
  media_opportunities: any;
  ambassador_duties: any;
  approval_rights: any;
  image_rights: any;
  permitted_usage: any;
  post_term_rules: string | null;
  term_duration: string | null;
  term_duration_weeks: number | null;
  term_start_trigger: string | null;
  term_start_date: string | null;
  term_end_date: string | null;
  fee_total: number | null;
  fee_currency: string;
  fee_structure: string | null;
  fee_payments: any[];
  fee_net_terms: string | null;
  fee_mfn: boolean;
  fee_mfn_details: string | null;
  fee_revenue_share: any;
  fee_ancillary: string | null;
  exclusivity_category: string | null;
  exclusivity_brands: string[];
  exclusivity_duration: string | null;
  travel: any;
  hmu: any;
  talent_criteria: any;
  governing_law: string;
  non_union: boolean;
  confidential: boolean;
  lender_entity: string | null;
  lender_address: string | null;
  company_signatory: string | null;
  talent_signatory: string | null;
  notice_emails: string | null;
  termination_cure_days: number;
  morals_clause: boolean;
  morals_clause_details: string | null;
  pro_rata_formula: string | null;
  materials_stills_count: number | null;
  materials_videos: { count: number; length: string }[];
  materials_edits_versions: boolean;
  materials_alternate_assets: string | null;
  // Music licensing
  deal_type: DealType;
  music_status: string | null;
  song_id: string | null;
  license_type: string | null;
  usage_type: string[];
  territory: string | null;
  media: string[];
  fee_per_side: number | null;
  master_fee_override: number | null;
  // Stage gates
  approval_to_engage_at: string | null;
  approval_to_engage_by: string | null;
  approval_notes: string | null;
  // Offer snapshot
  offer_snapshot: any;
  // Fulfillment
  usage_start_date: string | null;
  usage_end_date: string | null;
  deliverables_status: any[];
  // Admin
  admin_checklist: any[];
  w9_received: boolean;
  w9_received_date: string | null;
  invoice_received: boolean;
  invoice_received_date: string | null;
  // Versioning
  offer_sheet_version: number;
  longform_version: number;
  offer_accepted_at: string | null;
  contract_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// JSON field helpers
// ---------------------------------------------------------------------------

const JSON_FIELDS: (keyof Deal)[] = [
  'brief_parsed_data',
  'service_days',
  'social_posts',
  'media_opportunities',
  'ambassador_duties',
  'approval_rights',
  'image_rights',
  'permitted_usage',
  'fee_payments',
  'fee_revenue_share',
  'exclusivity_brands',
  'travel',
  'hmu',
  'talent_criteria',
  'materials_videos',
  'offer_snapshot',
  'deliverables_status',
  'admin_checklist',
  'usage_type',
  'media',
];

/**
 * Parse JSON text columns into objects after reading from the database.
 */
function parseJsonFields(row: any): Deal {
  if (!row) return row;
  const parsed = { ...row };
  for (const field of JSON_FIELDS) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        // leave as-is if it cannot be parsed
      }
    } else if (parsed[field] === null || parsed[field] === undefined) {
      // Provide sensible defaults for array/object fields
      if (['service_days', 'fee_payments', 'exclusivity_brands', 'deliverables_status', 'admin_checklist', 'usage_type', 'media'].includes(field as string)) {
        parsed[field] = [];
      }
    }
  }
  // Convert SQLite integer booleans to JS booleans
  parsed.fee_mfn = !!parsed.fee_mfn;
  parsed.non_union = !!parsed.non_union;
  parsed.confidential = !!parsed.confidential;
  parsed.morals_clause = !!parsed.morals_clause;
  parsed.materials_edits_versions = !!parsed.materials_edits_versions;
  parsed.w9_received = !!parsed.w9_received;
  parsed.invoice_received = !!parsed.invoice_received;
  if (!parsed.materials_videos) parsed.materials_videos = [];
  if (!parsed.deliverables_status) parsed.deliverables_status = [];
  if (!parsed.admin_checklist) parsed.admin_checklist = [];
  return parsed as Deal;
}

/**
 * Stringify JSON fields and convert booleans before writing to the database.
 */
function stringifyJsonFields(data: Record<string, any>): Record<string, any> {
  const out = { ...data };
  for (const field of JSON_FIELDS) {
    if (field in out && out[field] !== null && out[field] !== undefined && typeof out[field] !== 'string') {
      out[field] = JSON.stringify(out[field]);
    }
  }
  // Convert JS booleans to SQLite integers (0/1)
  for (const key of Object.keys(out)) {
    if (typeof out[key] === 'boolean') {
      out[key] = out[key] ? 1 : 0;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Data access functions
// ---------------------------------------------------------------------------

/**
 * Return all deals with joined client name and talent name.
 */
export function getAllDeals(): (Deal & { client_name?: string; talent_name?: string })[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT d.*,
              c.name AS client_name,
              t.name AS talent_name
       FROM deals d
       LEFT JOIN clients c ON d.client_id = c.id
       LEFT JOIN talent  t ON d.talent_id  = t.id
       ORDER BY d.updated_at DESC`
    )
    .all() as any[];

  return rows.map(parseJsonFields);
}

/**
 * Return a single deal by its id with full data.
 */
export function getDealById(id: string): (Deal & { client_name?: string; talent_name?: string }) | undefined {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT d.*,
              c.name AS client_name,
              t.name AS talent_name
       FROM deals d
       LEFT JOIN clients c ON d.client_id = c.id
       LEFT JOIN talent  t ON d.talent_id  = t.id
       WHERE d.id = ?`
    )
    .get(id) as any;

  return row ? parseJsonFields(row) : undefined;
}

/**
 * Create a new deal. Returns the newly created deal.
 */
export function createDeal(data: Partial<Deal>): Deal {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  const record: Record<string, any> = {
    id,
    client_id: data.client_id || null,
    sub_brand_id: data.sub_brand_id || null,
    deal_name: data.deal_name ?? '',
    campaign_name: data.campaign_name ?? '',
    status: data.status ?? 'creative_brief',
    talent_id: data.talent_id || null,
    brief_raw_text: data.brief_raw_text ?? null,
    brief_parsed_data: data.brief_parsed_data ?? null,
    effective_date: data.effective_date ?? null,
    service_days: data.service_days ?? [],
    social_posts: data.social_posts ?? null,
    media_opportunities: data.media_opportunities ?? null,
    ambassador_duties: data.ambassador_duties ?? null,
    approval_rights: data.approval_rights ?? null,
    image_rights: data.image_rights ?? null,
    permitted_usage: data.permitted_usage ?? null,
    post_term_rules: data.post_term_rules ?? null,
    term_duration: data.term_duration ?? null,
    term_duration_weeks: data.term_duration_weeks ?? null,
    term_start_trigger: data.term_start_trigger ?? null,
    term_start_date: data.term_start_date ?? null,
    term_end_date: data.term_end_date ?? null,
    fee_total: data.fee_total ?? null,
    fee_currency: data.fee_currency ?? 'USD',
    fee_structure: data.fee_structure ?? null,
    fee_payments: data.fee_payments ?? [],
    fee_net_terms: data.fee_net_terms ?? null,
    fee_mfn: data.fee_mfn ?? false,
    fee_mfn_details: data.fee_mfn_details ?? null,
    fee_revenue_share: data.fee_revenue_share ?? null,
    fee_ancillary: data.fee_ancillary ?? null,
    exclusivity_category: data.exclusivity_category ?? null,
    exclusivity_brands: data.exclusivity_brands ?? [],
    exclusivity_duration: data.exclusivity_duration ?? null,
    travel: data.travel ?? null,
    hmu: data.hmu ?? null,
    talent_criteria: data.talent_criteria ?? null,
    governing_law: data.governing_law ?? 'California',
    non_union: data.non_union ?? true,
    confidential: data.confidential ?? true,
    lender_entity: data.lender_entity ?? null,
    lender_address: data.lender_address ?? null,
    company_signatory: data.company_signatory ?? null,
    talent_signatory: data.talent_signatory ?? null,
    notice_emails: data.notice_emails ?? null,
    termination_cure_days: data.termination_cure_days ?? 30,
    morals_clause: data.morals_clause ?? true,
    morals_clause_details: data.morals_clause_details ?? null,
    pro_rata_formula: data.pro_rata_formula ?? null,
    materials_stills_count: data.materials_stills_count ?? null,
    materials_videos: data.materials_videos ?? [],
    materials_edits_versions: data.materials_edits_versions ?? true,
    materials_alternate_assets: data.materials_alternate_assets ?? null,
    // Music licensing
    deal_type: data.deal_type ?? 'talent',
    music_status: data.music_status ?? null,
    song_id: data.song_id || null,
    license_type: data.license_type ?? null,
    usage_type: data.usage_type ?? [],
    territory: data.territory ?? null,
    media: data.media ?? [],
    fee_per_side: data.fee_per_side ?? null,
    master_fee_override: data.master_fee_override ?? null,
    // Stage Gates
    approval_to_engage_at: data.approval_to_engage_at ?? null,
    approval_to_engage_by: data.approval_to_engage_by ?? null,
    approval_notes: data.approval_notes ?? null,
    // Offer Snapshot
    offer_snapshot: data.offer_snapshot ?? null,
    // Fulfillment
    usage_start_date: data.usage_start_date ?? null,
    usage_end_date: data.usage_end_date ?? null,
    deliverables_status: data.deliverables_status ?? [],
    // Admin
    admin_checklist: data.admin_checklist ?? [],
    w9_received: data.w9_received ?? false,
    w9_received_date: data.w9_received_date ?? null,
    invoice_received: data.invoice_received ?? false,
    invoice_received_date: data.invoice_received_date ?? null,
    // Versioning
    offer_sheet_version: data.offer_sheet_version ?? 1,
    longform_version: data.longform_version ?? 1,
    offer_accepted_at: data.offer_accepted_at ?? null,
    contract_executed_at: data.contract_executed_at ?? null,
    created_at: now,
    updated_at: now,
  };

  const prepared = stringifyJsonFields(record);

  const columns = Object.keys(prepared);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((col) => prepared[col]);

  db.prepare(`INSERT INTO deals (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);

  const created = getDealById(id);
  if (!created) throw new Error('Failed to create deal');
  return created;
}

/**
 * Fields excluded from audit logging.
 */
const AUDIT_SKIP_FIELDS = new Set(['id', 'created_at', 'updated_at']);

/**
 * Normalise a value to a string suitable for audit comparison / storage.
 * Arrays and objects are JSON-stringified; nullish values become null.
 */
function auditStringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Update an existing deal. Returns the updated deal or undefined if not found.
 *
 * Automatically logs an audit change record for every field whose value
 * actually changed.  The comparison + logging + update are wrapped in a
 * transaction.  If change-logging fails the update still succeeds.
 */
export function updateDeal(id: string, data: Partial<Deal>): Deal | undefined {
  const db = getDb();

  // Fetch the full current row (raw, before JSON parsing) so we can compare
  const currentRow = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as Record<string, any> | undefined;
  if (!currentRow) return undefined;

  // Remove fields that should not be overwritten directly
  const { id: _id, created_at: _ca, ...updateData } = data as any;
  updateData.updated_at = getCurrentTimestamp();

  const prepared = stringifyJsonFields(updateData);

  const columns = Object.keys(prepared);
  if (columns.length === 0) return getDealById(id);

  const setClause = columns.map((col) => `${col} = ?`).join(', ');
  const values = columns.map((col) => prepared[col]);

  const runUpdate = db.transaction(() => {
    // --- Audit logging (best-effort) ---
    try {
      for (const col of columns) {
        if (AUDIT_SKIP_FIELDS.has(col)) continue;

        const oldVal = auditStringify(currentRow[col]);
        const newVal = auditStringify(prepared[col]);

        if (oldVal === newVal) continue;

        createChange({
          deal_id: id,
          field_name: col,
          old_value: oldVal,
          new_value: newVal,
          source: 'manual',
        });
      }
    } catch {
      // Change logging is best-effort; do not block the update.
    }

    // --- Apply the update ---
    db.prepare(`UPDATE deals SET ${setClause} WHERE id = ?`).run(...values, id);
  });

  runUpdate();

  return getDealById(id);
}

/**
 * Update just the status of a deal and insert a timeline entry.
 * Returns the updated deal or undefined if not found.
 */
export function updateDealStatus(id: string, status: DealStatus): Deal | undefined {
  const db = getDb();
  const now = getCurrentTimestamp();

  const existing = db.prepare('SELECT id, status FROM deals WHERE id = ?').get(id) as
    | { id: string; status: string }
    | undefined;
  if (!existing) return undefined;

  const previousStatus = existing.status;

  db.prepare('UPDATE deals SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

  // Insert a timeline entry for the status change
  try {
    db.prepare(
      `INSERT INTO deal_timeline (id, deal_id, event_type, old_value, new_value, created_at)
       VALUES (?, ?, 'status_change', ?, ?, ?)`
    ).run(generateId(), id, previousStatus, status, now);
  } catch {
    // Timeline table may not exist yet; swallow the error so the status update still succeeds.
  }

  return getDealById(id);
}

/**
 * Delete a deal by id. Returns true if a row was deleted, false otherwise.
 */
export function deleteDeal(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM deals WHERE id = ?').run(id);
  return result.changes > 0;
}
