import { NextResponse } from 'next/server';
import { updateLicense, deleteLicense } from '@/lib/db/music-licenses';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string; licenseId: string } }) {
  try {
    // Verify the license belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_music_licenses WHERE id = ?').get(params.licenseId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const license = updateLicense(params.licenseId, body);
    if (!license) return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: license });
  } catch (error: unknown) {
    console.error('Failed to update license:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; licenseId: string } }) {
  try {
    // Verify the license belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_music_licenses WHERE id = ?').get(params.licenseId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }
    const ok = deleteLicense(params.licenseId);
    if (!ok) return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete license:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
