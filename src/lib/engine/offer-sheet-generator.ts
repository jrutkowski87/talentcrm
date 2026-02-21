// ---------------------------------------------------------------------------
// Offer Sheet Generator
// ---------------------------------------------------------------------------
// Generates a structured Offer Sheet from a Deal Record.  The output matches
// the real Firm Offer Sheet format used in celebrity talent partnerships.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfferSheetData {
  header: { client: string; talent: string; campaign: string; date: string };
  sections: OfferSheetSection[];
}

export interface OfferSheetSection {
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function currency(amount: number | null | undefined, code = 'USD'): string {
  if (amount === null || amount === undefined) return 'TBD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
}

function listOrTBD(items: any[] | null | undefined): string {
  if (!items || items.length === 0) return 'TBD';
  return items.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('; ');
}

function textOrTBD(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : 'TBD';
}

function jsonSummary(obj: any): string {
  if (!obj) return 'TBD';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return listOrTBD(obj);
  // For objects, produce key: value lines
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`${label}: ${val === null || val === undefined ? 'N/A' : String(val)}`);
  }
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Service Days formatter
// ---------------------------------------------------------------------------

function formatServiceDays(days: any[]): string {
  if (!days || days.length === 0) return 'TBD';
  return days
    .map((d, i) => {
      const parts: string[] = [];
      if (d.type) parts.push(d.type);
      if (d.quantity) parts.push(`Qty: ${d.quantity}`);
      if (d.hours) parts.push(`${d.hours} hours`);
      if (d.location) parts.push(`Location: ${d.location}${d.location_detail ? ` (${d.location_detail})` : ''}`);
      if (d.date_or_window) parts.push(`Date/Window: ${d.date_or_window}`);
      if (d.conditions) parts.push(`Conditions: ${d.conditions}`);
      return `Day ${i + 1}: ${parts.join(' | ')}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Payment schedule formatter
// ---------------------------------------------------------------------------

function formatPayments(payments: any[], total: number | null, netTerms: string | null): string {
  const lines: string[] = [];
  if (payments && payments.length > 0) {
    payments.forEach((p, i) => {
      const amount = total != null && p.percentage != null ? currency(total * (p.percentage / 100)) : '';
      const pctLabel = p.percentage != null ? `${p.percentage}%` : '';
      const milestone = p.milestone || `Payment ${i + 1}`;
      lines.push(`${milestone}: ${pctLabel}${amount ? ` (${amount})` : ''}`);
    });
  }
  if (netTerms) {
    lines.push(`Net Terms: ${netTerms}`);
  }
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Social posts formatter
// ---------------------------------------------------------------------------

function formatSocialPosts(social: any): string {
  if (!social) return 'TBD';
  const lines: string[] = [];
  if (social.quantity) lines.push(`Quantity: ${social.quantity}`);
  if (social.platforms?.length) lines.push(`Platforms: ${social.platforms.join(', ')}`);
  if (social.window_start || social.window_end) lines.push(`Window: ${social.window_start || 'TBD'} – ${social.window_end || 'TBD'}`);
  if (social.partners) lines.push(`Tagging/Partners: ${social.partners}`);
  if (social.archive_minimum) lines.push(`Archive Minimum: ${social.archive_minimum}`);
  if (social.notes) lines.push(`Notes: ${social.notes}`);
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Permitted usage formatter
// ---------------------------------------------------------------------------

function formatUsage(usage: any): string {
  if (!usage) return 'TBD';
  const lines: string[] = [];
  if (usage.digital?.length) lines.push(`Digital: ${usage.digital.join(', ')}`);
  if (usage.pr) lines.push(`PR: ${usage.pr}`);
  if (usage.retail?.length) lines.push(`Retail/In-Store: ${usage.retail.join(', ')}`);
  if (usage.ooh?.length) lines.push(`OOH: ${usage.ooh.join(', ')}`);
  if (usage.internal) lines.push(`Internal: ${usage.internal}`);
  if (usage.photographer) lines.push(`Photographer: ${usage.photographer}`);
  if (usage.paid_media) lines.push(`Paid Media: ${usage.paid_media}`);
  if (usage.notes) lines.push(`Notes: ${usage.notes}`);
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Approval rights formatter
// ---------------------------------------------------------------------------

function formatApprovalRights(approval: any): string {
  if (!approval) return 'TBD';
  const lines: string[] = [];
  if (approval.scope) lines.push(`Scope: ${approval.scope}`);
  if (approval.threshold_pct) lines.push(`Threshold: ${approval.threshold_pct}%`);
  if (approval.turnaround_hours) lines.push(`Turnaround: ${approval.turnaround_hours} hours`);
  if (approval.silence_deemed_approval !== undefined) lines.push(`Silence = Approval: ${yesNo(approval.silence_deemed_approval)}`);
  if (approval.approval_contact_name) lines.push(`Contact: ${approval.approval_contact_name}${approval.approval_contact_email ? ` (${approval.approval_contact_email})` : ''}`);
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Travel & Expenses formatter
// ---------------------------------------------------------------------------

function formatTravel(travel: any): string {
  if (!travel) return 'TBD';
  const lines: string[] = [];
  if (travel.ground_transport) lines.push(`Ground Transport: ${travel.ground_transport}`);
  if (travel.flights) lines.push(`Flights: ${travel.flights}`);
  if (travel.hotel) lines.push(`Hotel: ${travel.hotel}`);
  if (travel.per_diem) lines.push(`Per Diem: ${travel.per_diem}`);
  if (travel.plus_one !== undefined) lines.push(`Plus-One: ${yesNo(travel.plus_one)}`);
  if (travel.notes) lines.push(`Notes: ${travel.notes}`);
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// HMU formatter
// ---------------------------------------------------------------------------

function formatHMU(hmu: any): string {
  if (!hmu) return 'TBD';
  const lines: string[] = [];
  if (hmu.hair) lines.push(`Hair: ${hmu.hair}`);
  if (hmu.makeup) lines.push(`Makeup: ${hmu.makeup}`);
  if (hmu.wardrobe) lines.push(`Wardrobe: ${hmu.wardrobe}`);
  if (hmu.styling) lines.push(`Styling: ${hmu.styling}`);
  if (hmu.styling_discretion) lines.push(`Styling Discretion: ${hmu.styling_discretion}`);
  if (hmu.consultation_right !== undefined) lines.push(`Consultation Right: ${yesNo(hmu.consultation_right)}`);
  if (hmu.notes) lines.push(`Notes: ${hmu.notes}`);
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Image rights formatter
// ---------------------------------------------------------------------------

function formatImageRights(rights: any): string {
  if (!rights) return 'TBD';
  const lines: string[] = [];
  if (rights.max_count) lines.push(`Max Images: ${rights.max_count}`);
  if (rights.edits_allowed !== undefined) lines.push(`Edits Allowed: ${yesNo(rights.edits_allowed)}`);
  if (rights.text_overlays_allowed !== undefined) lines.push(`Text Overlays: ${yesNo(rights.text_overlays_allowed)}`);
  if (rights.notes) lines.push(`Notes: ${rights.notes}`);
  return lines.length > 0 ? lines.join('\n') : 'TBD';
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete Offer Sheet structure from a deal record.
 */
export function generateOfferSheet(deal: any): OfferSheetData {
  const header = {
    client: deal.client_name || textOrTBD(deal.client_id),
    talent: deal.talent_name || 'TBD',
    campaign: textOrTBD(deal.campaign_name),
    date: deal.effective_date || new Date().toISOString().slice(0, 10),
  };

  const sections: OfferSheetSection[] = [];

  // --- Services ---
  const servicesLines: string[] = [];
  servicesLines.push('Service Days:');
  servicesLines.push(formatServiceDays(deal.service_days));
  if (deal.social_posts) {
    servicesLines.push('');
    servicesLines.push('Social Posts:');
    servicesLines.push(formatSocialPosts(deal.social_posts));
  }
  if (deal.media_opportunities) {
    servicesLines.push('');
    servicesLines.push('Media Opportunities:');
    servicesLines.push(jsonSummary(deal.media_opportunities));
  }
  if (deal.ambassador_duties) {
    servicesLines.push('');
    servicesLines.push('Ambassador Duties:');
    servicesLines.push(jsonSummary(deal.ambassador_duties));
  }
  sections.push({ title: 'Services', content: servicesLines.join('\n') });

  // --- Fee ---
  const feeLines: string[] = [];
  feeLines.push(`Total Fee: ${currency(deal.fee_total, deal.fee_currency)}`);
  if (deal.fee_structure) feeLines.push(`Structure: ${deal.fee_structure}`);
  feeLines.push('');
  feeLines.push('Payment Schedule:');
  feeLines.push(formatPayments(deal.fee_payments, deal.fee_total, deal.fee_net_terms));
  if (deal.fee_mfn) {
    feeLines.push('');
    feeLines.push(`MFN: Yes${deal.fee_mfn_details ? ` – ${deal.fee_mfn_details}` : ''}`);
  }
  if (deal.fee_revenue_share) {
    feeLines.push('');
    feeLines.push('Revenue Share:');
    feeLines.push(jsonSummary(deal.fee_revenue_share));
  }
  if (deal.fee_ancillary) {
    feeLines.push('');
    feeLines.push(`Ancillary: ${deal.fee_ancillary}`);
  }
  sections.push({ title: 'Fee', content: feeLines.join('\n') });

  // --- Term ---
  const termLines: string[] = [];
  termLines.push(`Duration: ${textOrTBD(deal.term_duration)}${deal.term_duration_weeks ? ` (${deal.term_duration_weeks} weeks)` : ''}`);
  if (deal.term_start_trigger) termLines.push(`Start Trigger: ${deal.term_start_trigger}`);
  if (deal.term_start_date) termLines.push(`Start Date: ${deal.term_start_date}`);
  if (deal.term_end_date) termLines.push(`End Date: ${deal.term_end_date}`);
  sections.push({ title: 'Term', content: termLines.join('\n') });

  // --- Exclusivity ---
  const exclLines: string[] = [];
  exclLines.push(`Category: ${textOrTBD(deal.exclusivity_category)}`);
  if (deal.exclusivity_brands?.length) exclLines.push(`Excluded Brands: ${deal.exclusivity_brands.join(', ')}`);
  if (deal.exclusivity_duration) exclLines.push(`Duration: ${deal.exclusivity_duration}`);
  sections.push({ title: 'Exclusivity', content: exclLines.join('\n') });

  // --- Usage ---
  sections.push({ title: 'Usage', content: formatUsage(deal.permitted_usage) });

  // --- Approval Rights ---
  sections.push({ title: 'Approval Rights', content: formatApprovalRights(deal.approval_rights) });

  // --- Travel & Expenses ---
  sections.push({ title: 'Travel & Expenses', content: formatTravel(deal.travel) });

  // --- HMU ---
  sections.push({ title: 'HMU', content: formatHMU(deal.hmu) });

  // --- Image Rights ---
  sections.push({ title: 'Image Rights', content: formatImageRights(deal.image_rights) });

  // --- Confidentiality ---
  sections.push({
    title: 'Confidentiality',
    content: deal.confidential
      ? 'This deal and all related terms are CONFIDENTIAL. Neither party shall disclose the terms of this engagement without prior written consent.'
      : 'Standard confidentiality provisions apply.',
  });

  // --- Governing Law ---
  sections.push({
    title: 'Governing Law',
    content: `This engagement shall be governed by the laws of the State of ${textOrTBD(deal.governing_law)}.`,
  });

  // --- Additional Terms ---
  const additionalLines: string[] = [];
  additionalLines.push(`Morals Clause: ${yesNo(deal.morals_clause)}${deal.morals_clause_details ? ` – ${deal.morals_clause_details}` : ''}`);
  additionalLines.push(`Non-Union: ${yesNo(deal.non_union)}`);
  if (deal.post_term_rules) additionalLines.push(`Post-Term Rules: ${deal.post_term_rules}`);
  if (deal.termination_cure_days != null) additionalLines.push(`Termination Cure Period: ${deal.termination_cure_days} days`);
  if (deal.pro_rata_formula) additionalLines.push(`Pro-Rata Formula: ${deal.pro_rata_formula}`);
  if (deal.lender_entity) additionalLines.push(`Lender Entity: ${deal.lender_entity}`);
  sections.push({ title: 'Additional Terms', content: additionalLines.join('\n') });

  return { header, sections };
}

// ---------------------------------------------------------------------------
// Text serializer
// ---------------------------------------------------------------------------

/**
 * Convert an OfferSheetData structure into a plain-text document.
 */
export function offerSheetToText(data: OfferSheetData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('FIRM OFFER SHEET');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Client:   ${data.header.client}`);
  lines.push(`Talent:   ${data.header.talent}`);
  lines.push(`Campaign: ${data.header.campaign}`);
  lines.push(`Date:     ${data.header.date}`);
  lines.push('');
  lines.push('-'.repeat(60));

  for (const section of data.sections) {
    lines.push('');
    lines.push(`${section.title.toUpperCase()}`);
    lines.push('-'.repeat(section.title.length));
    lines.push(section.content);
  }

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('END OF OFFER SHEET');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
