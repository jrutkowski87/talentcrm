// ---------------------------------------------------------------------------
// Document Sync Engine
// ---------------------------------------------------------------------------
// The Deal Record is the SINGLE SOURCE OF TRUTH.  Both the Offer Sheet and
// the Long Form Contract are generated views of the Deal Record.  When a
// field changes on either document the engine updates the Deal Record and
// flags the change.  If the Long Form is being negotiated it becomes the
// primary source and its values take precedence.
// ---------------------------------------------------------------------------

import { getDealById, updateDeal } from '@/lib/db/deals';
import { createChange } from '@/lib/db/changes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldMapping {
  dealField: string;
  offerSheetSection: string;
  longFormSection: string;
  transform?: 'expand' | 'summarize' | 'legal_format' | 'none';
}

export interface Discrepancy {
  field: string;
  dealValue: any;
  documentValue: any;
  source: 'offer_sheet' | 'long_form';
  severity: 'critical' | 'warning' | 'info';
}

export interface SyncStatus {
  offerSheetVersion: number;
  longFormVersion: number;
  pendingChanges: number;
  lastSyncedAt: string | null;
  discrepancies: Discrepancy[];
}

// ---------------------------------------------------------------------------
// Field Mappings (35+ fields)
// ---------------------------------------------------------------------------

const FIELD_MAPPINGS: FieldMapping[] = [
  // --- Identity & Header ---
  { dealField: 'talent_name', offerSheetSection: 'Header / Talent', longFormSection: 'Preamble – ARTIST definition', transform: 'none' },
  { dealField: 'client_name', offerSheetSection: 'Header / Client', longFormSection: 'Preamble – COMPANY definition', transform: 'none' },
  { dealField: 'campaign_name', offerSheetSection: 'Header / Campaign', longFormSection: 'Recitals – Campaign reference', transform: 'none' },
  { dealField: 'effective_date', offerSheetSection: 'Header / Date', longFormSection: 'Preamble – Effective Date', transform: 'none' },
  { dealField: 'lender_entity', offerSheetSection: 'Header / Lender', longFormSection: 'Preamble – LENDER definition', transform: 'none' },

  // --- Services ---
  { dealField: 'service_days', offerSheetSection: 'Services – Service Days', longFormSection: 'Section 2 – Services', transform: 'expand' },
  { dealField: 'social_posts', offerSheetSection: 'Services – Social Posts', longFormSection: 'Section 2 – Social Media Deliverables', transform: 'expand' },
  { dealField: 'media_opportunities', offerSheetSection: 'Services – Media Opps', longFormSection: 'Section 2 – Media Appearances', transform: 'expand' },
  { dealField: 'ambassador_duties', offerSheetSection: 'Services – Ambassador', longFormSection: 'Section 2 – Ambassador Obligations', transform: 'expand' },

  // --- Compensation ---
  { dealField: 'fee_total', offerSheetSection: 'Fee – Total', longFormSection: 'Section 3 – Compensation Amount', transform: 'none' },
  { dealField: 'fee_currency', offerSheetSection: 'Fee – Currency', longFormSection: 'Section 3 – Currency', transform: 'none' },
  { dealField: 'fee_structure', offerSheetSection: 'Fee – Structure', longFormSection: 'Section 3 – Fee Structure', transform: 'legal_format' },
  { dealField: 'fee_payments', offerSheetSection: 'Fee – Payment Schedule', longFormSection: 'Section 3 – Payment Schedule', transform: 'expand' },
  { dealField: 'fee_net_terms', offerSheetSection: 'Fee – Net Terms', longFormSection: 'Section 3 – Payment Terms', transform: 'legal_format' },
  { dealField: 'fee_mfn', offerSheetSection: 'Fee – MFN', longFormSection: 'Section 3 – Most Favored Nation', transform: 'none' },
  { dealField: 'fee_mfn_details', offerSheetSection: 'Fee – MFN Details', longFormSection: 'Section 3 – MFN Details', transform: 'expand' },
  { dealField: 'fee_revenue_share', offerSheetSection: 'Fee – Revenue Share', longFormSection: 'Section 3 – Revenue Participation', transform: 'expand' },
  { dealField: 'fee_ancillary', offerSheetSection: 'Fee – Ancillary', longFormSection: 'Section 3 – Ancillary Compensation', transform: 'expand' },

  // --- Term ---
  { dealField: 'term_duration', offerSheetSection: 'Term – Duration', longFormSection: 'Section 6 – Term Duration', transform: 'none' },
  { dealField: 'term_duration_weeks', offerSheetSection: 'Term – Duration (Weeks)', longFormSection: 'Section 6 – Term in Weeks', transform: 'none' },
  { dealField: 'term_start_trigger', offerSheetSection: 'Term – Start Trigger', longFormSection: 'Section 6 – Commencement', transform: 'legal_format' },
  { dealField: 'term_start_date', offerSheetSection: 'Term – Start Date', longFormSection: 'Section 6 – Start Date', transform: 'none' },
  { dealField: 'term_end_date', offerSheetSection: 'Term – End Date', longFormSection: 'Section 6 – End Date', transform: 'none' },

  // --- Exclusivity ---
  { dealField: 'exclusivity_category', offerSheetSection: 'Exclusivity – Category', longFormSection: 'Section 7 – Exclusivity Category', transform: 'legal_format' },
  { dealField: 'exclusivity_brands', offerSheetSection: 'Exclusivity – Excluded Brands', longFormSection: 'Section 7 – Excluded Brands', transform: 'expand' },
  { dealField: 'exclusivity_duration', offerSheetSection: 'Exclusivity – Duration', longFormSection: 'Section 7 – Exclusivity Period', transform: 'none' },

  // --- Usage ---
  { dealField: 'permitted_usage', offerSheetSection: 'Usage – Permitted Usage', longFormSection: 'Section 5 – License Grant', transform: 'expand' },
  { dealField: 'image_rights', offerSheetSection: 'Image Rights', longFormSection: 'Section 5 – Image Rights', transform: 'expand' },
  { dealField: 'post_term_rules', offerSheetSection: 'Usage – Post-Term', longFormSection: 'Section 5 – Post-Term Usage', transform: 'legal_format' },

  // --- Approval Rights ---
  { dealField: 'approval_rights', offerSheetSection: 'Approval Rights', longFormSection: 'Section 8 – Approval Rights', transform: 'expand' },

  // --- Travel & Expenses ---
  { dealField: 'travel', offerSheetSection: 'Travel & Expenses', longFormSection: 'Section 4 – Travel & Expenses', transform: 'expand' },
  { dealField: 'hmu', offerSheetSection: 'HMU', longFormSection: 'Section 4 – Hair/Makeup/Styling', transform: 'expand' },

  // --- Legal / Contract Terms ---
  { dealField: 'governing_law', offerSheetSection: 'Governing Law', longFormSection: 'Section 15 – Governing Law', transform: 'legal_format' },
  { dealField: 'morals_clause', offerSheetSection: 'Morals Clause', longFormSection: 'Section 10 – Morals/Reputation', transform: 'none' },
  { dealField: 'morals_clause_details', offerSheetSection: 'Morals Clause Details', longFormSection: 'Section 10 – Morals Clause Details', transform: 'expand' },
  { dealField: 'confidential', offerSheetSection: 'Confidentiality', longFormSection: 'Section 12 – Confidentiality', transform: 'none' },
  { dealField: 'non_union', offerSheetSection: 'Additional Terms – Non-Union', longFormSection: 'Section 15 – Non-Union Engagement', transform: 'none' },
  { dealField: 'termination_cure_days', offerSheetSection: 'Additional Terms – Cure Period', longFormSection: 'Section 13 – Termination Cure Period', transform: 'none' },
  { dealField: 'pro_rata_formula', offerSheetSection: 'Additional Terms – Pro-Rata', longFormSection: 'Section 13 – Pro-Rata Calculation', transform: 'legal_format' },

  // --- Contract Parties ---
  { dealField: 'lender_address', offerSheetSection: 'Additional Terms – Lender Address', longFormSection: 'Section 15 – Notices to Lender', transform: 'none' },
  { dealField: 'company_signatory', offerSheetSection: 'Additional Terms – Company Signatory', longFormSection: 'Signature Block – Company', transform: 'none' },
  { dealField: 'talent_signatory', offerSheetSection: 'Additional Terms – Talent Signatory', longFormSection: 'Signature Block – Talent/Lender', transform: 'none' },
  { dealField: 'notice_emails', offerSheetSection: 'Additional Terms – Notice Emails', longFormSection: 'Section 15 – Notice Addresses', transform: 'expand' },
];

// ---------------------------------------------------------------------------
// Severity rules
// ---------------------------------------------------------------------------

const CRITICAL_FIELDS = new Set([
  'fee_total', 'fee_structure', 'fee_payments', 'fee_net_terms',
  'service_days', 'term_duration', 'term_duration_weeks',
  'exclusivity_category', 'exclusivity_brands',
  'permitted_usage', 'approval_rights',
]);

const WARNING_FIELDS = new Set([
  'fee_mfn', 'fee_mfn_details', 'fee_revenue_share', 'fee_ancillary',
  'term_start_trigger', 'term_start_date', 'term_end_date',
  'exclusivity_duration', 'image_rights', 'post_term_rules',
  'travel', 'hmu', 'morals_clause', 'morals_clause_details',
  'termination_cure_days', 'pro_rata_formula',
  'social_posts', 'media_opportunities', 'ambassador_duties',
]);

function getSeverity(field: string): 'critical' | 'warning' | 'info' {
  if (CRITICAL_FIELDS.has(field)) return 'critical';
  if (WARNING_FIELDS.has(field)) return 'warning';
  return 'info';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function valuesMatch(a: any, b: any): boolean {
  return normalize(a) === normalize(b);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the full list of field mappings between the deal record, offer
 * sheet sections, and long form contract sections.
 */
export function getFieldMappings(): FieldMapping[] {
  return [...FIELD_MAPPINGS];
}

/**
 * Compare the deal record against a document's extracted field values and
 * return an array of discrepancies.
 */
export function findDiscrepancies(
  deal: any,
  documentFields: Record<string, any>,
  source: 'offer_sheet' | 'long_form'
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  for (const mapping of FIELD_MAPPINGS) {
    const docValue = documentFields[mapping.dealField];
    // Skip fields not present in the document extraction
    if (docValue === undefined) continue;

    const dealValue = deal[mapping.dealField];

    if (!valuesMatch(dealValue, docValue)) {
      discrepancies.push({
        field: mapping.dealField,
        dealValue: dealValue ?? null,
        documentValue: docValue,
        source,
        severity: getSeverity(mapping.dealField),
      });
    }
  }

  return discrepancies;
}

/**
 * Apply changes from a document back to the deal record.  Each changed
 * field is recorded in the change log and the deal record is updated.
 *
 * If the long form is the source the changes are applied immediately
 * (long form is assumed to be in active negotiation and therefore primary).
 * Offer sheet changes are also applied but flagged for review.
 */
export function applyDocumentChanges(
  dealId: string,
  changes: Record<string, any>,
  source: 'offer_sheet' | 'long_form'
): void {
  const deal = getDealById(dealId);
  if (!deal) throw new Error(`Deal not found: ${dealId}`);

  const updatePayload: Record<string, any> = {};

  for (const [field, newValue] of Object.entries(changes)) {
    const oldValue = (deal as any)[field];

    // Skip if value hasn't actually changed
    if (valuesMatch(oldValue, newValue)) continue;

    // Record the change
    createChange({
      deal_id: dealId,
      field_name: field,
      old_value: normalize(oldValue) || null,
      new_value: normalize(newValue) || null,
      source,
      status: source === 'long_form' ? 'approved' : 'pending_review',
    });

    updatePayload[field] = newValue;
  }

  // Bump the appropriate document version
  if (source === 'offer_sheet') {
    updatePayload.offer_sheet_version = (deal.offer_sheet_version ?? 0) + 1;
  } else {
    updatePayload.longform_version = (deal.longform_version ?? 0) + 1;
  }

  if (Object.keys(updatePayload).length > 0) {
    updateDeal(dealId, updatePayload);
  }
}

/**
 * Get the current sync status for a deal, including document versions,
 * pending change count, and any active discrepancies.
 */
export function getSyncStatus(dealId: string): SyncStatus {
  const deal = getDealById(dealId);
  if (!deal) throw new Error(`Deal not found: ${dealId}`);

  // Build discrepancy list by regenerating both document field sets and
  // comparing against the deal record.  Because we don't have the actual
  // document extractions stored we compare the deal record against itself
  // (the deal IS the source of truth).  Real discrepancies will exist only
  // when changes are pending review.
  //
  // We import the pending changes from the DB to surface them here.
  let pendingChanges: any[] = [];
  try {
    // Dynamic import to avoid circular dependency at module level
    const { getPendingChanges } = require('@/lib/db/changes');
    pendingChanges = getPendingChanges(dealId);
  } catch {
    // changes table may not exist yet
  }

  const discrepancies: Discrepancy[] = pendingChanges.map((change: any) => ({
    field: change.field_name,
    dealValue: (deal as any)[change.field_name] ?? null,
    documentValue: change.new_value,
    source: change.source as 'offer_sheet' | 'long_form',
    severity: getSeverity(change.field_name),
  }));

  return {
    offerSheetVersion: deal.offer_sheet_version ?? 0,
    longFormVersion: deal.longform_version ?? 0,
    pendingChanges: pendingChanges.length,
    lastSyncedAt: deal.updated_at ?? null,
    discrepancies,
  };
}
