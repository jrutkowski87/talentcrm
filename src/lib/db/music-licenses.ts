import { getDb, generateId, getCurrentTimestamp } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LicenseStatus = 'pending' | 'contacted' | 'negotiating' | 'agreed' | 'license_sent' | 'license_signed' | 'rejected' | 'expired';

export interface MusicLicense {
  id: string;
  deal_id: string;
  song_id: string;
  rights_holder_id: string;
  side: 'master' | 'publishing';
  share_percentage: number;
  fee_amount: number | null;
  fee_override: number | null;
  license_status: LicenseStatus;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  rights_holder_name?: string;
  rights_holder_type?: string;
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

const SELECT_WITH_RH = `
  SELECT ml.*, rh.name AS rights_holder_name, rh.type AS rights_holder_type
  FROM deal_music_licenses ml
  INNER JOIN rights_holders rh ON ml.rights_holder_id = rh.id
`;

export function getLicensesByDeal(dealId: string): MusicLicense[] {
  const db = getDb();
  return db.prepare(
    `${SELECT_WITH_RH} WHERE ml.deal_id = ? ORDER BY ml.side, ml.share_percentage DESC`
  ).all(dealId) as MusicLicense[];
}

export function createLicense(data: {
  deal_id: string;
  song_id: string;
  rights_holder_id: string;
  side: 'master' | 'publishing';
  share_percentage: number;
  fee_amount?: number;
  fee_override?: number;
  license_status?: LicenseStatus;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
}): MusicLicense {
  const db = getDb();
  const id = generateId();
  const now = getCurrentTimestamp();

  db.prepare(
    `INSERT INTO deal_music_licenses (id, deal_id, song_id, rights_holder_id, side, share_percentage, fee_amount, fee_override, license_status, contact_name, contact_email, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.deal_id,
    data.song_id,
    data.rights_holder_id,
    data.side,
    data.share_percentage,
    data.fee_amount ?? null,
    data.fee_override ?? null,
    data.license_status ?? 'pending',
    data.contact_name ?? null,
    data.contact_email ?? null,
    data.notes ?? null,
    now,
    now
  );

  return db.prepare(`${SELECT_WITH_RH} WHERE ml.id = ?`).get(id) as MusicLicense;
}

export function updateLicense(id: string, data: Partial<MusicLicense>): MusicLicense | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM deal_music_licenses WHERE id = ?').get(id);
  if (!existing) return undefined;

  const { id: _id, created_at: _ca, updated_at: _ua, rights_holder_name: _n, rights_holder_type: _t, ...updateData } = data as any;
  const now = getCurrentTimestamp();

  const fields = Object.keys(updateData);
  if (fields.length === 0) return db.prepare(`${SELECT_WITH_RH} WHERE ml.id = ?`).get(id) as MusicLicense;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updateData[f]);

  db.prepare(`UPDATE deal_music_licenses SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);
  return db.prepare(`${SELECT_WITH_RH} WHERE ml.id = ?`).get(id) as MusicLicense;
}

export function deleteLicense(id: string): boolean {
  return getDb().prepare('DELETE FROM deal_music_licenses WHERE id = ?').run(id).changes > 0;
}

/**
 * Populate license rows from a song's rights holders with calculated fees.
 * Reads deal.fee_per_side and deal.master_fee_override to compute per-party fees.
 */
export function populateLicensesFromSong(dealId: string, songId: string): MusicLicense[] {
  const db = getDb();

  // Get deal fee info
  const deal = db.prepare('SELECT fee_per_side, master_fee_override FROM deals WHERE id = ?').get(dealId) as {
    fee_per_side: number | null;
    master_fee_override: number | null;
  } | undefined;

  const feePerSide = deal?.fee_per_side ?? 0;
  const masterFee = deal?.master_fee_override ?? feePerSide; // MFN default
  const publishingFee = feePerSide;

  // Get all rights holders for the song
  const rightsHolders = db.prepare(
    `SELECT srh.*, rh.email, rh.contact_name
     FROM song_rights_holders srh
     INNER JOIN rights_holders rh ON srh.rights_holder_id = rh.id
     WHERE srh.song_id = ?`
  ).all(songId) as {
    rights_holder_id: string;
    side: 'master' | 'publishing';
    share_percentage: number;
    email: string | null;
    contact_name: string | null;
  }[];

  const results: MusicLicense[] = [];
  const now = getCurrentTimestamp();

  const insertAll = db.transaction(() => {
    for (const rh of rightsHolders) {
      const sideFee = rh.side === 'master' ? masterFee : publishingFee;
      const feeAmount = sideFee * (rh.share_percentage / 100);
      const id = generateId();

      db.prepare(
        `INSERT INTO deal_music_licenses (id, deal_id, song_id, rights_holder_id, side, share_percentage, fee_amount, license_status, contact_name, contact_email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
      ).run(
        id, dealId, songId, rh.rights_holder_id, rh.side, rh.share_percentage,
        feeAmount, rh.contact_name, rh.email, now, now
      );

      const license = db.prepare(`${SELECT_WITH_RH} WHERE ml.id = ?`).get(id) as MusicLicense;
      results.push(license);
    }
  });
  insertAll();

  return results;
}

/**
 * Recalculate fees for all licenses on a deal based on current deal fee settings.
 */
export function recalculateFees(dealId: string): MusicLicense[] {
  const db = getDb();

  const deal = db.prepare('SELECT fee_per_side, master_fee_override FROM deals WHERE id = ?').get(dealId) as {
    fee_per_side: number | null;
    master_fee_override: number | null;
  } | undefined;

  const feePerSide = deal?.fee_per_side ?? 0;
  const masterFee = deal?.master_fee_override ?? feePerSide;
  const publishingFee = feePerSide;
  const now = getCurrentTimestamp();

  const licenses = db.prepare('SELECT * FROM deal_music_licenses WHERE deal_id = ?').all(dealId) as MusicLicense[];

  for (const lic of licenses) {
    if (lic.fee_override !== null) continue; // skip manually overridden fees
    const sideFee = lic.side === 'master' ? masterFee : publishingFee;
    const feeAmount = sideFee * (lic.share_percentage / 100);
    db.prepare('UPDATE deal_music_licenses SET fee_amount = ?, updated_at = ? WHERE id = ?').run(feeAmount, now, lic.id);
  }

  return db.prepare(`${SELECT_WITH_RH} WHERE ml.deal_id = ? ORDER BY ml.side, ml.share_percentage DESC`).all(dealId) as MusicLicense[];
}
