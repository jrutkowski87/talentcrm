import { NextResponse } from 'next/server';
import { getDocumentById, updateDocument } from '@/lib/db/documents';
import { getDealById, updateDeal } from '@/lib/db/deals';
import { getDb } from '@/lib/db';

// Map ParsedBrief fields to Deal column names.
// Only fields listed here will be applied — anything not mapped is skipped.
const FIELD_MAP: Record<string, string> = {
  deal_name: 'deal_name',
  campaign_name: 'campaign_name',
  talent_criteria: 'talent_criteria',
  service_days: 'service_days',
  social_posts: 'social_posts',
  media_opportunities: 'media_opportunities',
  ambassador_duties: 'ambassador_duties',
  term_duration: 'term_duration',
  term_duration_weeks: 'term_duration_weeks',
  fee_total: 'fee_total',
  fee_structure: 'fee_structure',
  fee_payments: 'fee_payments',
  exclusivity_category: 'exclusivity_category',
  exclusivity_brands: 'exclusivity_brands',
  exclusivity_duration: 'exclusivity_duration',
  travel: 'travel',
  hmu: 'hmu',
  approval_rights: 'approval_rights',
  image_rights: 'image_rights',
  permitted_usage: 'permitted_usage',
  governing_law: 'governing_law',
  confidential: 'confidential',
  effective_date: 'effective_date',
  post_term_rules: 'post_term_rules',
  non_union: 'non_union',
};

// Fields that exist in ParsedBrief but don't map directly to deal columns.
// These require special handling or are informational only.
const SPECIAL_FIELDS = new Set(['client_name', 'confidence']);

export async function POST(
  request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const doc = getDocumentById(params.docId);
    if (!doc || doc.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (!doc.parsed_data || !['parsed', 'applied'].includes(doc.upload_status)) {
      return NextResponse.json(
        { success: false, error: 'Document has not been processed yet. Please process it first.' },
        { status: 400 }
      );
    }

    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const body = await request.json();
    const selectedFields: string[] = body.fields || [];

    if (selectedFields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields selected to apply' }, { status: 400 });
    }

    const parsedData = doc.parsed_data;
    const updates: Record<string, unknown> = {};

    for (const field of selectedFields) {
      // Skip special/unmappable fields
      if (SPECIAL_FIELDS.has(field)) continue;

      // Only apply fields that have a known mapping
      const dealField = FIELD_MAP[field];
      if (!dealField) continue;

      const value = parsedData[field];

      // Skip null/undefined/empty values
      if (value === null || value === undefined) continue;
      if (Array.isArray(value) && value.length === 0) continue;

      updates[dealField] = value;
    }

    // Handle client_name specially: look up client by name and set client_id
    if (selectedFields.includes('client_name') && parsedData.client_name) {
      const db = getDb();
      const client = db.prepare(
        `SELECT id FROM clients WHERE LOWER(name) = LOWER(?)`
      ).get(parsedData.client_name) as { id: string } | undefined;

      if (client) {
        updates.client_id = client.id;
      }
      // If client not found, we skip — don't create one automatically
    }

    if (Object.keys(updates).length > 0) {
      // Also store the raw text and parsed data on the deal
      updates.brief_raw_text = doc.extracted_text;
      updates.brief_parsed_data = parsedData;

      updateDeal(params.id, updates as any);
    }

    // Mark document as applied
    updateDocument(doc.id, { upload_status: 'applied' });

    // Return fresh deal data
    const updatedDeal = getDealById(params.id);
    return NextResponse.json({ success: true, data: updatedDeal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
