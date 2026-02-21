import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const TABLES = [
  'clients',
  'sub_brands',
  'talent',
  'reps',
  'talent_reps',
  'deals',
  'deal_talent_shortlist',
  'deal_timeline',
  'deal_changes',
  'deal_documents',
  'deal_song_pitchlist',
  'deal_music_licenses',
  'songs',
  'rights_holders',
  'song_rights_holders',
  'email_log',
  'casting_frameworks',
  'document_templates',
] as const;

export async function GET() {
  try {
    const db = getDb();

    const tables: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    for (const table of TABLES) {
      try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        tables[table] = rows;
        counts[table] = rows.length;
      } catch {
        // Table may not exist yet — skip it
        tables[table] = [];
        counts[table] = 0;
      }
    }

    const payload = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables,
      counts,
    };

    const json = JSON.stringify(payload, null, 2);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="talentcrm-backup-${date}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
