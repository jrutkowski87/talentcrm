import { NextResponse } from 'next/server';
import { searchDeals } from '@/lib/db/deals';
import { searchClients } from '@/lib/db/clients';
import { searchReps } from '@/lib/db/reps';

// These modules already export search functions
import { getDb } from '@/lib/db';

function searchTalent(query: string) {
  const db = getDb();
  const pattern = `%${query}%`;
  return db.prepare(
    `SELECT id, name, category, location, rate_range FROM talent
     WHERE name LIKE ? OR category LIKE ? OR location LIKE ?
     ORDER BY name ASC LIMIT 10`
  ).all(pattern, pattern, pattern);
}

function searchSongs(query: string) {
  const db = getDb();
  const pattern = `%${query}%`;
  return db.prepare(
    `SELECT id, title, artist_name, album, genre FROM songs
     WHERE title LIKE ? OR artist_name LIKE ? OR album LIKE ?
     ORDER BY title ASC LIMIT 10`
  ).all(pattern, pattern, pattern);
}

function searchRightsHolders(query: string) {
  const db = getDb();
  const pattern = `%${query}%`;
  return db.prepare(
    `SELECT id, name, type, parent_company, contact_name FROM rights_holders
     WHERE name LIKE ? OR parent_company LIKE ? OR contact_name LIKE ?
     ORDER BY name ASC LIMIT 10`
  ).all(pattern, pattern, pattern);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        data: { deals: [], talent: [], clients: [], reps: [], songs: [], rightsHolders: [] },
      });
    }

    const deals = searchDeals(q);
    const talent = searchTalent(q);
    const clients = searchClients(q);
    const reps = searchReps(q);
    const songs = searchSongs(q);
    const rightsHolders = searchRightsHolders(q);

    return NextResponse.json({
      success: true,
      data: { deals, talent, clients, reps, songs, rightsHolders },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
