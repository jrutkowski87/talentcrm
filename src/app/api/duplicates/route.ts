import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const STRIP_SUFFIXES = [
  'inc', 'incorporated', 'llc', 'corp', 'corporation', 'ltd', 'limited',
  'co', 'company', 'entertainment', 'productions', 'agency', 'group',
  'studios', 'studio', 'media', 'records', 'music', 'worldwide', 'global',
  'international', 'partners', 'holdings', 'enterprises',
];

function normalizeName(name: string): string {
  let n = name.toLowerCase().trim();
  n = n.replace(/[.,\-_'"!@#$%^&*()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const suffix of STRIP_SUFFIXES) {
    n = n.replace(new RegExp(`\\b${suffix}\\b\\.?$`, 'i'), '').trim();
  }
  return n.replace(/^the\s+/i, '').trim();
}

// Config-driven: maps entity type → table, name column, optional secondary column
const ENTITY_CONFIG: Record<string, { table: string; col: string; extra?: string }> = {
  client: { table: 'clients', col: 'name', extra: 'dba_name' },
  talent: { table: 'talent', col: 'name' },
  deal:   { table: 'deals',  col: 'deal_name' },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const type = searchParams.get('type');

    if (!name || !type || !ENTITY_CONFIG[type]) {
      return NextResponse.json(
        { success: false, error: 'Valid name and type (client|talent|deal) required' },
        { status: 400 }
      );
    }

    const normalized = normalizeName(name);
    if (normalized.length < 2) {
      return NextResponse.json({ success: true, duplicates: [] });
    }

    const { table, col, extra } = ENTITY_CONFIG[type];
    const clean = `LOWER(REPLACE(REPLACE(REPLACE(${col}, '.', ''), ',', ''), '-', ''))`;
    const where = [`${clean} LIKE ?`, `${clean} LIKE ?`];
    const params: string[] = [`%${normalized}%`, `${normalized}%`];

    if (extra) {
      where.push(`(${extra} IS NOT NULL AND LOWER(${extra}) LIKE ?)`);
      params.push(`%${normalized}%`);
    }

    const db = getDb();
    const rows = db.prepare(
      `SELECT id, ${col} as name FROM ${table} WHERE ${where.join(' OR ')} LIMIT 5`
    ).all(...params) as { id: string; name: string }[];

    const duplicates = rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        matchType: (normalizeName(r.name) === normalized ? 'exact' : 'similar') as 'exact' | 'similar',
      }))
      .sort((a, b) => (a.matchType === 'exact' ? -1 : 0) - (b.matchType === 'exact' ? -1 : 0));

    return NextResponse.json({ success: true, duplicates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
