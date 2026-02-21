import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  oneOf?: readonly string[] | string[];
  format?: 'email' | 'date' | 'url';
}

export type Schema = Record<string, FieldRule>;

type ValidationSuccess = { valid: true; data: Record<string, unknown> };
type ValidationFailure = { valid: false; errors: string[] };
export type ValidationResult = ValidationSuccess | ValidationFailure;

// ---------------------------------------------------------------------------
// Format validators
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/; // ISO date prefix (YYYY-MM-DD...)
const URL_RE = /^https?:\/\/.+/i;

function checkFormat(value: string, format: 'email' | 'date' | 'url'): boolean {
  switch (format) {
    case 'email': return EMAIL_RE.test(value);
    case 'date': return DATE_RE.test(value);
    case 'url': return URL_RE.test(value);
    default: return true;
  }
}

// ---------------------------------------------------------------------------
// Coercion helpers
// ---------------------------------------------------------------------------

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return null;
}

// ---------------------------------------------------------------------------
// Core validate function
// ---------------------------------------------------------------------------

export function validate(
  body: Record<string, unknown> | null | undefined,
  schema: Schema,
): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const raw = body[field];

    // --- required check ---
    if (rule.required && (raw === undefined || raw === null || raw === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // skip optional fields that are absent
    if (raw === undefined || raw === null) {
      // still include null so the caller sees the field was absent
      if (field in body) data[field] = null;
      continue;
    }

    // --- type coercion & validation ---
    let value: unknown = raw;

    switch (rule.type) {
      case 'string': {
        if (typeof value !== 'string') value = String(value);
        const str = (value as string).trim();

        if (rule.required && str === '') {
          errors.push(`${field} is required`);
          continue;
        }

        if (str !== '') {
          if (rule.minLength && str.length < rule.minLength) {
            errors.push(`${field} must be at least ${rule.minLength} characters`);
            continue;
          }
          if (rule.maxLength && str.length > rule.maxLength) {
            errors.push(`${field} must be at most ${rule.maxLength} characters`);
            continue;
          }
          if (rule.format && !checkFormat(str, rule.format)) {
            errors.push(`${field} must be a valid ${rule.format}`);
            continue;
          }
          if (rule.oneOf && !rule.oneOf.includes(str)) {
            errors.push(`${field} must be one of: ${rule.oneOf.join(', ')}`);
            continue;
          }
        }

        value = str;
        break;
      }

      case 'number': {
        const num = coerceNumber(value);
        if (num === null) {
          errors.push(`${field} must be a number`);
          continue;
        }
        if (rule.min !== undefined && num < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`);
          continue;
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push(`${field} must be at most ${rule.max}`);
          continue;
        }
        value = num;
        break;
      }

      case 'boolean': {
        const bool = coerceBoolean(value);
        if (bool === null) {
          errors.push(`${field} must be a boolean`);
          continue;
        }
        value = bool;
        break;
      }

      case 'array': {
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`);
          continue;
        }
        break;
      }

      case 'object': {
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${field} must be an object`);
          continue;
        }
        break;
      }
    }

    data[field] = value;
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Pass through any body fields NOT in the schema so callers can forward
  // extra known fields (like client_id, talent_id, etc.) without listing
  // every possible column. Schema fields take precedence.
  const merged: Record<string, unknown> = { ...body, ...data };

  return { valid: true, data: merged };
}

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

export function validationError(errors: string[]): NextResponse {
  return NextResponse.json({ success: false, errors }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Pre-built schemas
// ---------------------------------------------------------------------------

const ALL_DEAL_STATUSES = [
  'creative_brief', 'outreach', 'shortlist', 'approval_to_offer',
  'negotiation', 'talent_buyin', 'contract_drafting', 'admin_logistics',
  'fulfillment', 'complete',
  'music_brief', 'song_pitching', 'song_selection', 'rights_negotiation',
  'license_drafting', 'music_admin', 'delivery',
  'archived', 'dead',
] as const;

const DEAL_TYPES = ['talent', 'music', 'talent_and_music'] as const;

export const dealCreateSchema: Schema = {
  deal_name:      { type: 'string', required: true, maxLength: 300 },
  campaign_name:  { type: 'string', maxLength: 300 },
  deal_type:      { type: 'string', oneOf: [...DEAL_TYPES] },
  status:         { type: 'string', oneOf: [...ALL_DEAL_STATUSES] },
  fee_total:      { type: 'number', min: 0 },
  fee_currency:   { type: 'string', maxLength: 10 },
  fee_structure:  { type: 'string', maxLength: 200 },
  fee_mfn:        { type: 'boolean' },
  non_union:      { type: 'boolean' },
  confidential:   { type: 'boolean' },
  morals_clause:  { type: 'boolean' },
  term_duration:  { type: 'string', maxLength: 200 },
  term_duration_weeks: { type: 'number', min: 0 },
  governing_law:  { type: 'string', maxLength: 200 },
  service_days:   { type: 'array' },
  fee_payments:   { type: 'array' },
  exclusivity_brands: { type: 'array' },
  usage_type:     { type: 'array' },
  media:          { type: 'array' },
  materials_videos: { type: 'array' },
  deliverables_status: { type: 'array' },
  admin_checklist: { type: 'array' },
  social_posts:   { type: 'object' },
  travel:         { type: 'object' },
  hmu:            { type: 'object' },
  talent_criteria: { type: 'object' },
  offer_snapshot: { type: 'object' },
};

export const talentCreateSchema: Schema = {
  name:     { type: 'string', required: true, maxLength: 200 },
  category: { type: 'string', oneOf: [
    'actor', 'musician', 'athlete', 'influencer', 'model',
    'creator', 'comedian', 'chef', 'photographer', 'artist', 'other',
  ]},
  bio:      { type: 'string', maxLength: 5000 },
  notes:    { type: 'string', maxLength: 5000 },
  location: { type: 'string', maxLength: 200 },
  loan_out_company: { type: 'string', maxLength: 300 },
  loan_out_address: { type: 'string', maxLength: 500 },
  rate_range: { type: 'string', maxLength: 200 },
  rating:   { type: 'number', min: 0, max: 10 },
  social_handles:   { type: 'object' },
  social_followers: { type: 'object' },
  categories_worked: { type: 'array' },
};

export const clientCreateSchema: Schema = {
  name:       { type: 'string', required: true, maxLength: 200 },
  dba_name:   { type: 'string', maxLength: 200 },
  legal_entity: { type: 'string', maxLength: 300 },
  agency:     { type: 'string', maxLength: 200 },
  confidentiality_level: { type: 'string', oneOf: ['standard', 'high', 'nda'] },
  notes:      { type: 'string', maxLength: 5000 },
  key_contacts: { type: 'array' },
};

export const songCreateSchema: Schema = {
  title:        { type: 'string', required: true, maxLength: 300 },
  artist_name:  { type: 'string', required: true, maxLength: 300 },
  album:        { type: 'string', maxLength: 300 },
  release_year: { type: 'number', min: 1900, max: 2100 },
  genre:        { type: 'string', maxLength: 100 },
  duration_seconds: { type: 'number', min: 0 },
  isrc:         { type: 'string', maxLength: 20 },
  spotify_url:  { type: 'string', format: 'url', maxLength: 500 },
  apple_music_url: { type: 'string', format: 'url', maxLength: 500 },
  notes:        { type: 'string', maxLength: 5000 },
};

export const rightsHolderCreateSchema: Schema = {
  name:       { type: 'string', required: true, maxLength: 200 },
  type:       { type: 'string', oneOf: ['label', 'publisher', 'administrator', 'songwriter', 'other'] },
  parent_company:  { type: 'string', maxLength: 300 },
  pro_affiliation: { type: 'string', maxLength: 100 },
  ipi_number:  { type: 'string', maxLength: 50 },
  email:       { type: 'string', format: 'email' },
  phone:       { type: 'string', maxLength: 50 },
  contact_name:  { type: 'string', maxLength: 200 },
  contact_title: { type: 'string', maxLength: 200 },
  address:     { type: 'string', maxLength: 500 },
  notes:       { type: 'string', maxLength: 5000 },
};

export const repCreateSchema: Schema = {
  name:   { type: 'string', required: true, maxLength: 200 },
  email:  { type: 'string', format: 'email' },
  phone:  { type: 'string', maxLength: 50 },
  agency: { type: 'string', maxLength: 200 },
  role:   { type: 'string', oneOf: ['agent', 'manager', 'publicist', 'lawyer', 'other'] },
  notes:  { type: 'string', maxLength: 5000 },
  avg_response_days: { type: 'number', min: 0 },
  deals_offered: { type: 'number', min: 0 },
  deals_closed:  { type: 'number', min: 0 },
};
