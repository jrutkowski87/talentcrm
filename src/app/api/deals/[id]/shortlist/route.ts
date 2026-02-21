import { NextResponse } from 'next/server';
import { getShortlistByDeal, addToShortlist } from '@/lib/db/shortlist';
import { getDb } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const entries = getShortlistByDeal(params.id);
    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    // Auto-populate from talent record if not provided
    if (body.talent_id) {
      const db = getDb();

      // Auto-populate submitted_by_rep_id from talent's primary rep
      if (!body.submitted_by_rep_id) {
        const primaryRep = db.prepare(
          `SELECT rep_id FROM talent_reps WHERE talent_id = ? AND is_primary = 1 LIMIT 1`
        ).get(body.talent_id) as { rep_id: string } | undefined;
        if (primaryRep) {
          body.submitted_by_rep_id = primaryRep.rep_id;
        }
      }

      // Auto-populate estimated_rate from talent's rate_range
      if (!body.estimated_rate) {
        const talentRow = db.prepare(
          `SELECT rate_range FROM talent WHERE id = ?`
        ).get(body.talent_id) as { rate_range: string | null } | undefined;
        if (talentRow?.rate_range) {
          body.estimated_rate = talentRow.rate_range;
        }
      }
    }

    const entry = addToShortlist({ ...body, deal_id: params.id });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
