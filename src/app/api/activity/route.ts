import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const db = getDb();
    const entries = db.prepare(`
      SELECT dt.*, d.deal_name, d.status AS deal_status, d.deal_type,
             c.name AS client_name
      FROM deal_timeline dt
      LEFT JOIN deals d ON dt.deal_id = d.id
      LEFT JOIN clients c ON d.client_id = c.id
      ORDER BY dt.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    // Parse metadata JSON
    const parsed = entries.map(e => {
      if (typeof e.metadata === 'string') {
        try { e.metadata = JSON.parse(e.metadata); } catch {}
      }
      return e;
    });

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
