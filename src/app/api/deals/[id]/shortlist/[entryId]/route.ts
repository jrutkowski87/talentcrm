import { NextResponse } from 'next/server';
import { updateShortlistEntry, removeFromShortlist } from '@/lib/db/shortlist';
import { getDb } from '@/lib/db';
import { updateDeal } from '@/lib/db/deals';

export async function PUT(request: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const body = await request.json();
    const entry = updateShortlistEntry(params.entryId, body);
    if (!entry) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });

    // When a talent is confirmed, auto-populate deal fields
    if (body.status === 'confirmed' && entry.talent_id) {
      const db = getDb();
      const dealId = params.id;

      // Fetch full talent record for loan-out info
      const talent = db.prepare(
        `SELECT name, loan_out_company, loan_out_address FROM talent WHERE id = ?`
      ).get(entry.talent_id) as { name: string; loan_out_company: string | null; loan_out_address: string | null } | undefined;

      // Fetch all reps for this talent with their contact info
      const reps = db.prepare(
        `SELECT r.name, r.email, r.phone, r.agency, r.role, tr.relationship_type, tr.is_primary
         FROM talent_reps tr
         INNER JOIN reps r ON tr.rep_id = r.id
         WHERE tr.talent_id = ?
         ORDER BY tr.is_primary DESC`
      ).all(entry.talent_id) as { name: string; email: string | null; phone: string | null; agency: string | null; role: string; relationship_type: string; is_primary: number }[];

      // Build notice emails string from rep contact info
      // Format: "Rep Name (Role, Agency) — email@example.com"
      const noticeLines: string[] = [];
      for (const rep of reps) {
        const parts: string[] = [];
        parts.push(rep.name);
        const meta: string[] = [];
        if (rep.relationship_type) meta.push(rep.relationship_type.charAt(0).toUpperCase() + rep.relationship_type.slice(1));
        if (rep.agency) meta.push(rep.agency);
        if (meta.length > 0) parts.push(`(${meta.join(', ')})`);
        if (rep.email) parts.push(`— ${rep.email}`);
        if (rep.phone) parts.push(`| ${rep.phone}`);
        noticeLines.push(parts.join(' '));
      }

      const dealUpdates: Record<string, unknown> = {
        talent_id: entry.talent_id,
      };

      if (talent) {
        dealUpdates.talent_signatory = talent.name;
        if (talent.loan_out_company) dealUpdates.lender_entity = talent.loan_out_company;
        if (talent.loan_out_address) dealUpdates.lender_address = talent.loan_out_address;
      }

      if (noticeLines.length > 0) {
        dealUpdates.notice_emails = noticeLines.join('\n');
      }

      updateDeal(dealId, dealUpdates as any);
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const ok = removeFromShortlist(params.entryId);
    if (!ok) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
