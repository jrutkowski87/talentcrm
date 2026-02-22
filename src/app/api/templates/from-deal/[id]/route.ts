import { NextResponse } from 'next/server';
import { getDealById } from '@/lib/db/deals';
import { createTemplate } from '@/lib/db/templates';

// Fields to copy from a deal into a template
const TEMPLATE_FIELDS = [
  'deal_type', 'fee_total', 'fee_currency', 'fee_structure', 'fee_net_terms',
  'fee_mfn', 'fee_mfn_details', 'fee_revenue_share', 'fee_ancillary',
  'fee_payments', 'term_duration', 'term_duration_weeks', 'term_start_trigger',
  'exclusivity_category', 'exclusivity_brands', 'exclusivity_duration',
  'travel', 'hmu', 'non_union', 'governing_law', 'confidential',
  'morals_clause', 'morals_clause_details', 'pro_rata_formula',
  'termination_cure_days', 'materials_stills_count', 'materials_videos',
  'materials_edits_versions', 'materials_alternate_assets',
  'social_posts', 'media_opportunities', 'ambassador_duties',
  'approval_rights', 'image_rights', 'permitted_usage', 'post_term_rules',
  'service_days', 'talent_criteria',
  // Music fields
  'license_type', 'usage_type', 'territory', 'media',
];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 });
    }

    // Extract template-worthy fields from the deal
    const templateData: Record<string, any> = {};
    for (const field of TEMPLATE_FIELDS) {
      const value = (deal as any)[field];
      if (value !== null && value !== undefined && value !== '' && value !== 0) {
        templateData[field] = value;
      }
    }

    const template = createTemplate({
      name: body.name.trim(),
      deal_type: deal.deal_type || 'talent',
      description: body.description?.trim() || `Template from deal: ${deal.deal_name}`,
      template_data: templateData,
      created_by: body.created_by,
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
