// ---------------------------------------------------------------------------
// Long Form Contract Generator
// ---------------------------------------------------------------------------
// Generates a structured Long Form Contract from a Deal Record. The output
// mirrors the sections used in real celebrity talent partnership agreements.
// ---------------------------------------------------------------------------

export interface LongFormData {
  header: {
    title: string;
    effectiveDate: string;
    parties: { company: string; talent: string; lender: string | null };
  };
  sections: LongFormSection[];
}

export interface LongFormSection {
  number: number;
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function currency(amount: number | null | undefined, code = 'USD'): string {
  if (amount === null || amount === undefined) return '[AMOUNT]';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function textOr(value: string | null | undefined, placeholder = '[TBD]'): string {
  return value && value.trim() ? value.trim() : placeholder;
}

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
}

function listItems(items: any[] | null | undefined, formatter?: (item: any, i: number) => string): string {
  if (!items || items.length === 0) return '[To be specified]';
  if (formatter) return items.map(formatter).join('\n');
  return items.map((item) => (typeof item === 'string' ? `  • ${item}` : `  • ${JSON.stringify(item)}`)).join('\n');
}

function objSummary(obj: any): string {
  if (!obj) return '[To be specified]';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return listItems(obj);
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`  ${label}: ${val === null || val === undefined ? 'N/A' : String(val)}`);
  }
  return lines.length > 0 ? lines.join('\n') : '[To be specified]';
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildEngagement(deal: any): string {
  const lines: string[] = [];
  lines.push(
    `Company hereby engages ${deal.talent_name || '[TALENT]'} (the "Artist")` +
    (deal.lender_entity ? `, through ${deal.lender_entity} ("Lender"),` : '') +
    ` to render exclusive personal services in connection with Company's "${textOr(deal.campaign_name, '[CAMPAIGN]')}" campaign (the "Campaign") for the ${textOr(deal.deal_name, '[BRAND/PRODUCT]')} brand, subject to the terms and conditions set forth herein.`
  );
  if (deal.non_union) {
    lines.push('');
    lines.push('This engagement is a non-union engagement. Artist acknowledges that no union or guild agreement shall apply to the services rendered hereunder.');
  }
  return lines.join('\n');
}

function buildServices(deal: any): string {
  const lines: string[] = [];

  // Service days
  lines.push('2.1 Service Days.');
  if (deal.service_days && deal.service_days.length > 0) {
    lines.push('Artist shall render the following services:');
    deal.service_days.forEach((d: any, i: number) => {
      const parts: string[] = [];
      parts.push(`  (${String.fromCharCode(97 + i)})`);
      if (d.type) parts.push(`${d.type}:`);
      if (d.quantity) parts.push(`${d.quantity} day(s),`);
      if (d.hours) parts.push(`not to exceed ${d.hours} consecutive hours per day,`);
      if (d.location) parts.push(`at ${d.location}${d.location_detail ? ` (${d.location_detail})` : ''},`);
      if (d.date_or_window) parts.push(`scheduled during ${d.date_or_window},`);
      if (d.conditions) parts.push(`subject to: ${d.conditions}`);
      lines.push(parts.join(' ').replace(/,\s*$/, '.'));
    });
  } else {
    lines.push('  [Service days to be specified in Schedule A.]');
  }

  // Social posts
  if (deal.social_posts) {
    lines.push('');
    lines.push('2.2 Social Media Deliverables.');
    const sp = deal.social_posts;
    const socialParts: string[] = [];
    if (sp.quantity) socialParts.push(`Artist shall create and post ${sp.quantity} social media post(s)`);
    if (sp.platforms?.length) socialParts.push(`on the following platform(s): ${sp.platforms.join(', ')}`);
    if (sp.window_start || sp.window_end) socialParts.push(`during the window of ${sp.window_start || '[START]'} through ${sp.window_end || '[END]'}`);
    lines.push(socialParts.join(' ') + '.');
    if (sp.archive_minimum) lines.push(`  Posts shall remain on Artist's profile for a minimum of ${sp.archive_minimum}.`);
    if (sp.partners) lines.push(`  Posts shall tag/mention: ${sp.partners}.`);
    if (sp.notes) lines.push(`  Additional requirements: ${sp.notes}`);
  }

  // Media opportunities
  if (deal.media_opportunities) {
    lines.push('');
    lines.push('2.3 Media Appearances.');
    lines.push(`  ${objSummary(deal.media_opportunities)}`);
  }

  // Ambassador duties
  if (deal.ambassador_duties) {
    lines.push('');
    lines.push('2.4 Ambassador Obligations.');
    lines.push(`  ${objSummary(deal.ambassador_duties)}`);
  }

  return lines.join('\n');
}

function buildCompensation(deal: any): string {
  const lines: string[] = [];

  lines.push('3.1 Fee.');
  lines.push(
    `In consideration for Artist's services hereunder, Company shall pay Artist a total fee of ${currency(deal.fee_total, deal.fee_currency)} (the "Fee")${deal.fee_structure ? `, structured as ${deal.fee_structure}` : ''}.`
  );

  // Payment schedule
  if (deal.fee_payments && deal.fee_payments.length > 0) {
    lines.push('');
    lines.push('3.2 Payment Schedule. The Fee shall be payable as follows:');
    deal.fee_payments.forEach((p: any, i: number) => {
      const amount = deal.fee_total != null && p.percentage != null
        ? ` (${currency(deal.fee_total * (p.percentage / 100), deal.fee_currency)})`
        : '';
      const pctLabel = p.percentage != null ? `${p.percentage}%` : '';
      const milestone = p.milestone || `Payment ${i + 1}`;
      lines.push(`  (${String.fromCharCode(97 + i)}) ${pctLabel}${amount} – ${milestone};`);
    });
  }

  // Net terms
  if (deal.fee_net_terms) {
    lines.push('');
    lines.push(`3.3 Payment Terms. All payments shall be due ${deal.fee_net_terms} from the date of invoice.`);
  }

  // MFN
  if (deal.fee_mfn) {
    lines.push('');
    lines.push(
      `3.4 Most Favored Nation. Company represents that no other talent engaged for the Campaign shall receive compensation more favorable than the terms offered herein.${deal.fee_mfn_details ? ` ${deal.fee_mfn_details}` : ''}`
    );
  }

  // Revenue share
  if (deal.fee_revenue_share) {
    lines.push('');
    lines.push('3.5 Revenue Participation.');
    lines.push(`  ${objSummary(deal.fee_revenue_share)}`);
  }

  // Ancillary
  if (deal.fee_ancillary) {
    lines.push('');
    lines.push(`3.6 Ancillary Compensation. ${deal.fee_ancillary}`);
  }

  return lines.join('\n');
}

function buildTravelExpenses(deal: any): string {
  const lines: string[] = [];

  lines.push('4.1 Travel.');
  if (deal.travel) {
    const t = deal.travel;
    if (t.flights) lines.push(`  Flights: ${t.flights}`);
    if (t.ground_transport) lines.push(`  Ground Transportation: ${t.ground_transport}`);
    if (t.hotel) lines.push(`  Accommodations: ${t.hotel}`);
    if (t.per_diem) lines.push(`  Per Diem: ${t.per_diem}`);
    if (t.plus_one !== undefined) lines.push(`  Plus-One Travel: ${t.plus_one ? 'Included' : 'Not included'}`);
    if (t.notes) lines.push(`  Notes: ${t.notes}`);
  } else {
    lines.push('  Company shall provide first-class travel arrangements as mutually agreed.');
  }

  lines.push('');
  lines.push('4.2 Hair, Makeup, and Styling.');
  if (deal.hmu) {
    const h = deal.hmu;
    if (h.hair) lines.push(`  Hair: ${h.hair}`);
    if (h.makeup) lines.push(`  Makeup: ${h.makeup}`);
    if (h.wardrobe) lines.push(`  Wardrobe: ${h.wardrobe}`);
    if (h.styling) lines.push(`  Styling: ${h.styling}`);
    if (h.styling_discretion) lines.push(`  Styling Discretion: ${h.styling_discretion}`);
    if (h.consultation_right !== undefined) lines.push(`  Artist Consultation Right: ${h.consultation_right ? 'Yes' : 'No'}`);
    if (h.notes) lines.push(`  Notes: ${h.notes}`);
  } else {
    lines.push('  Company shall provide professional hair, makeup, and styling services at Company\'s expense.');
  }

  return lines.join('\n');
}

function buildUsageLicense(deal: any): string {
  const lines: string[] = [];

  lines.push('5.1 License Grant.');
  lines.push(
    'Subject to the terms of this Agreement, Artist hereby grants to Company a limited, non-transferable license to use Artist\'s name, likeness, image, voice, and biographical information ("Artist Materials") solely in connection with the Campaign as follows:'
  );

  if (deal.permitted_usage) {
    const u = deal.permitted_usage;
    if (u.digital?.length) lines.push(`  Digital: ${u.digital.join(', ')}`);
    if (u.pr) lines.push(`  PR: ${u.pr}`);
    if (u.retail?.length) lines.push(`  Retail/In-Store: ${u.retail.join(', ')}`);
    if (u.ooh?.length) lines.push(`  Out-of-Home: ${u.ooh.join(', ')}`);
    if (u.internal) lines.push(`  Internal Use: ${u.internal}`);
    if (u.paid_media) lines.push(`  Paid Media: ${u.paid_media}`);
    if (u.photographer) lines.push(`  Photographer Usage: ${u.photographer}`);
    if (u.notes) lines.push(`  Additional: ${u.notes}`);
  } else {
    lines.push('  [Permitted usage to be specified.]');
  }

  // Image rights
  lines.push('');
  lines.push('5.2 Image Rights.');
  if (deal.image_rights) {
    const ir = deal.image_rights;
    if (ir.max_count) lines.push(`  Maximum approved images: ${ir.max_count}`);
    if (ir.edits_allowed !== undefined) lines.push(`  Digital edits/retouching: ${ir.edits_allowed ? 'Permitted' : 'Not permitted'}`);
    if (ir.text_overlays_allowed !== undefined) lines.push(`  Text overlays: ${ir.text_overlays_allowed ? 'Permitted' : 'Not permitted'}`);
    if (ir.notes) lines.push(`  ${ir.notes}`);
  } else {
    lines.push('  All images shall be subject to Artist\'s prior written approval.');
  }

  // Post-term usage
  lines.push('');
  lines.push('5.3 Post-Term Usage.');
  if (deal.post_term_rules) {
    lines.push(`  ${deal.post_term_rules}`);
  } else {
    lines.push('  Upon expiration or termination of this Agreement, Company shall cease all use of Artist Materials within thirty (30) days, except for a reasonable sell-off period for pre-existing inventory.');
  }

  return lines.join('\n');
}

function buildTerm(deal: any): string {
  const lines: string[] = [];

  lines.push('6.1 Term.');
  const dur = textOr(deal.term_duration, '[DURATION]');
  const trigger = deal.term_start_trigger ? ` commencing upon ${deal.term_start_trigger}` : '';
  lines.push(`  The term of this Agreement shall be ${dur}${trigger} (the "Term").`);

  if (deal.term_duration_weeks) {
    lines.push(`  Approximate duration: ${deal.term_duration_weeks} weeks.`);
  }
  if (deal.term_start_date) {
    lines.push(`  Anticipated start date: ${deal.term_start_date}.`);
  }
  if (deal.term_end_date) {
    lines.push(`  Anticipated end date: ${deal.term_end_date}.`);
  }

  return lines.join('\n');
}

function buildExclusivity(deal: any): string {
  const lines: string[] = [];

  lines.push('7.1 Exclusivity.');
  if (deal.exclusivity_category) {
    lines.push(
      `  During the Term${deal.exclusivity_duration ? ` and for a period of ${deal.exclusivity_duration} thereafter` : ''}, Artist shall not render services for, endorse, or promote any product or service in the "${deal.exclusivity_category}" category that is competitive with Company's products.`
    );
  } else {
    lines.push('  [Exclusivity terms to be specified.]');
  }

  if (deal.exclusivity_brands?.length) {
    lines.push('');
    lines.push('7.2 Excluded Brands. Without limiting the foregoing, the following brands are specifically excluded:');
    deal.exclusivity_brands.forEach((brand: string) => {
      lines.push(`  • ${brand}`);
    });
  }

  return lines.join('\n');
}

function buildApprovalRights(deal: any): string {
  const lines: string[] = [];

  lines.push('8.1 Approval Rights.');
  if (deal.approval_rights) {
    const ar = deal.approval_rights;
    if (ar.scope) lines.push(`  Scope: ${ar.scope}`);
    if (ar.threshold_pct) lines.push(`  Artist shall have the right to approve at least ${ar.threshold_pct}% of all materials.`);
    if (ar.turnaround_hours) lines.push(`  Company shall submit materials for approval at least ${ar.turnaround_hours} hours prior to use.`);
    if (ar.silence_deemed_approval !== undefined) {
      lines.push(
        ar.silence_deemed_approval
          ? `  If Artist does not respond within the approval period, such silence shall be deemed approval.`
          : `  Silence shall NOT be deemed approval. Affirmative written consent is required.`
      );
    }
    if (ar.approval_contact_name) {
      lines.push(`  Approvals shall be directed to: ${ar.approval_contact_name}${ar.approval_contact_email ? ` (${ar.approval_contact_email})` : ''}.`);
    }
  } else {
    lines.push('  Artist shall have meaningful consultation and approval rights over all materials featuring Artist\'s name, likeness, or image prior to public release.');
  }

  return lines.join('\n');
}

function buildWarranties(deal: any): string {
  return `9.1 Artist Warranties. Artist represents and warrants that: (a) Artist has the right and authority to enter into this Agreement and to grant the rights herein; (b) Artist's performance of services hereunder will not violate any agreement to which Artist is a party; (c) Artist shall perform all services in a professional manner consistent with industry standards.

9.2 Company Warranties. Company represents and warrants that: (a) Company has the right and authority to enter into this Agreement; (b) Company shall use Artist Materials solely as permitted hereunder; (c) Company shall not materially alter Artist Materials without Artist's prior approval.`;
}

function buildMorals(deal: any): string {
  const lines: string[] = [];

  lines.push('10.1 Morals Clause.');
  if (deal.morals_clause) {
    lines.push(
      '  Company shall have the right to terminate this Agreement if Artist engages in conduct that is illegal, immoral, or scandalous, or that brings Artist into public disrepute, contempt, or ridicule, or that shocks or offends the community or any substantial group thereof, provided that such conduct materially and adversely affects Company\'s brand or reputation.'
    );
    if (deal.morals_clause_details) {
      lines.push(`  Additional provisions: ${deal.morals_clause_details}`);
    }
  } else {
    lines.push('  [No morals clause included in this Agreement.]');
  }

  return lines.join('\n');
}

function buildIndemnification(): string {
  return `11.1 Mutual Indemnification. Each party ("Indemnifying Party") shall indemnify, defend, and hold harmless the other party ("Indemnified Party") from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to any breach of this Agreement by the Indemnifying Party.

11.2 Artist Indemnification. Artist shall indemnify Company against any claims arising from Artist's breach of the warranties set forth in Section 9.1.

11.3 Company Indemnification. Company shall indemnify Artist against any claims arising from Company's use of Artist Materials in accordance with this Agreement.`;
}

function buildConfidentiality(deal: any): string {
  if (deal.confidential) {
    return `12.1 Confidentiality. The terms and conditions of this Agreement, including without limitation the Fee and all business terms, are strictly confidential. Neither party shall disclose any terms of this Agreement to any third party without the prior written consent of the other party, except (a) to such party's attorneys, accountants, agents, and other professional advisors on a need-to-know basis, or (b) as required by law or court order.

12.2 Public Announcements. Neither party shall issue any press release or public announcement regarding this Agreement or the engagement contemplated herein without the prior written approval of the other party.`;
  }
  return `12.1 Confidentiality. The parties agree to maintain the confidentiality of the financial terms of this Agreement. Standard confidentiality provisions shall apply as customary in the entertainment industry.`;
}

function buildTermination(deal: any): string {
  const cureDays = deal.termination_cure_days ?? 30;
  const lines: string[] = [];

  lines.push(`13.1 Termination for Cause. Either party may terminate this Agreement upon written notice if the other party materially breaches any provision hereof and fails to cure such breach within ${cureDays} days after receipt of written notice specifying the breach.`);
  lines.push('');
  lines.push('13.2 Termination by Company. Company may terminate this Agreement immediately upon written notice if the conditions set forth in Section 10 (Morals) apply.');
  lines.push('');
  lines.push('13.3 Effect of Termination. Upon termination:');
  lines.push('  (a) Company shall pay Artist for all services rendered through the date of termination;');

  if (deal.pro_rata_formula) {
    lines.push(`  (b) Pro-rata compensation shall be calculated as follows: ${deal.pro_rata_formula};`);
  } else {
    lines.push('  (b) Pro-rata compensation shall be calculated based on services rendered as a proportion of total services;');
  }

  lines.push('  (c) All licenses granted hereunder shall terminate, subject to Section 5.3 (Post-Term Usage);');
  lines.push('  (d) Sections 9, 11, 12, and 15 shall survive termination.');

  return lines.join('\n');
}

function buildForceMajeure(): string {
  return `14.1 Force Majeure. Neither party shall be liable for any failure or delay in performing its obligations hereunder if such failure or delay results from circumstances beyond the reasonable control of that party, including but not limited to acts of God, natural disasters, epidemics, pandemics, government actions, war, terrorism, civil unrest, labor disputes, or interruption of transportation or communications facilities. In such event, the affected party shall give prompt notice to the other party and shall use commercially reasonable efforts to mitigate the effects of such force majeure event.`;
}

function buildGeneralProvisions(deal: any): string {
  const lines: string[] = [];

  lines.push(`15.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of ${textOr(deal.governing_law, 'California')}, without regard to its conflict of law principles.`);
  lines.push('');
  lines.push('15.2 Entire Agreement. This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, and agreements.');
  lines.push('');
  lines.push('15.3 Amendment. This Agreement may not be amended or modified except by a written instrument signed by both parties.');
  lines.push('');
  lines.push('15.4 Assignment. Neither party may assign this Agreement without the prior written consent of the other party, except that Company may assign this Agreement to an affiliate or successor entity.');
  lines.push('');
  lines.push('15.5 Notices. All notices hereunder shall be in writing and delivered to:');

  if (deal.lender_entity || deal.lender_address) {
    lines.push(`  To Artist/Lender: ${deal.lender_entity || '[LENDER]'}`);
    if (deal.lender_address) lines.push(`    ${deal.lender_address}`);
  }
  if (deal.notice_emails) {
    lines.push(`  Email notices: ${objSummary(deal.notice_emails)}`);
  }

  lines.push('');
  lines.push('15.6 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original.');
  lines.push('');
  lines.push('15.7 Severability. If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete Long Form Contract structure from a deal record.
 */
export function generateLongForm(deal: any): LongFormData {
  const header = {
    title: 'TALENT SERVICES AGREEMENT',
    effectiveDate: deal.effective_date || new Date().toISOString().slice(0, 10),
    parties: {
      company: deal.client_name || textOr(deal.client_id, '[COMPANY]'),
      talent: deal.talent_name || '[TALENT]',
      lender: deal.lender_entity || null,
    },
  };

  const sections: LongFormSection[] = [
    { number: 1, title: 'Engagement', content: buildEngagement(deal) },
    { number: 2, title: 'Services', content: buildServices(deal) },
    { number: 3, title: 'Compensation', content: buildCompensation(deal) },
    { number: 4, title: 'Travel & Expenses', content: buildTravelExpenses(deal) },
    { number: 5, title: 'Usage / License Grant', content: buildUsageLicense(deal) },
    { number: 6, title: 'Term', content: buildTerm(deal) },
    { number: 7, title: 'Exclusivity', content: buildExclusivity(deal) },
    { number: 8, title: 'Approval Rights', content: buildApprovalRights(deal) },
    { number: 9, title: 'Representations & Warranties', content: buildWarranties(deal) },
    { number: 10, title: 'Morals / Reputation', content: buildMorals(deal) },
    { number: 11, title: 'Indemnification', content: buildIndemnification() },
    { number: 12, title: 'Confidentiality', content: buildConfidentiality(deal) },
    { number: 13, title: 'Termination', content: buildTermination(deal) },
    { number: 14, title: 'Force Majeure', content: buildForceMajeure() },
    { number: 15, title: 'General Provisions', content: buildGeneralProvisions(deal) },
  ];

  return { header, sections };
}

// ---------------------------------------------------------------------------
// Text serializer
// ---------------------------------------------------------------------------

/**
 * Convert a LongFormData structure into a plain-text document.
 */
export function longFormToText(data: LongFormData): string {
  const lines: string[] = [];

  lines.push('='.repeat(70));
  lines.push(data.header.title);
  lines.push('='.repeat(70));
  lines.push('');
  lines.push(`Effective Date: ${data.header.effectiveDate}`);
  lines.push('');
  lines.push('BETWEEN:');
  lines.push(`  "${data.header.parties.company}" ("Company")`);
  lines.push('AND:');
  lines.push(`  "${data.header.parties.talent}" ("Artist")`);
  if (data.header.parties.lender) {
    lines.push('THROUGH:');
    lines.push(`  "${data.header.parties.lender}" ("Lender")`);
  }
  lines.push('');
  lines.push('-'.repeat(70));

  for (const section of data.sections) {
    lines.push('');
    lines.push(`SECTION ${section.number}. ${section.title.toUpperCase()}`);
    lines.push('-'.repeat(section.title.length + String(section.number).length + 10));
    lines.push(section.content);
  }

  // Signature block
  lines.push('');
  lines.push('='.repeat(70));
  lines.push('SIGNATURE BLOCK');
  lines.push('='.repeat(70));
  lines.push('');
  lines.push('IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.');
  lines.push('');
  lines.push(`COMPANY: ${data.header.parties.company}`);
  lines.push('');
  lines.push('By: ___________________________');
  lines.push('Name:');
  lines.push('Title:');
  lines.push('Date:');
  lines.push('');
  lines.push(`ARTIST: ${data.header.parties.talent}`);
  if (data.header.parties.lender) {
    lines.push(`LENDER: ${data.header.parties.lender}`);
  }
  lines.push('');
  lines.push('By: ___________________________');
  lines.push('Name:');
  lines.push('Date:');
  lines.push('');
  lines.push('='.repeat(70));
  lines.push('END OF AGREEMENT');
  lines.push('='.repeat(70));

  return lines.join('\n');
}
