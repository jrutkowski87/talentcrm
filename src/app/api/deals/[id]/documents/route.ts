import { NextRequest, NextResponse } from 'next/server';
import { getDealById } from '@/lib/db/deals';
import { generateOfferSheet, offerSheetToText } from '@/lib/engine/offer-sheet-generator';
import { generateLongForm, longFormToText } from '@/lib/engine/longform-generator';
import { generateMusicLicense, musicLicenseToText } from '@/lib/engine/music-license-generator';
import { getDocumentsByDeal } from '@/lib/db/documents';
import { getLicensesByDeal } from '@/lib/db/music-licenses';
import { getSongById } from '@/lib/db/songs';
import { getRightsHolderById } from '@/lib/db/rights-holders';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const uploadedDocuments = getDocumentsByDeal(params.id);

    // Talent documents (offer sheet + long form)
    let offer_sheet = null;
    let long_form = null;
    if (deal.deal_type !== 'music') {
      const offerSheet = generateOfferSheet(deal);
      const longForm = generateLongForm(deal);
      offer_sheet = {
        version: deal.offer_sheet_version,
        data: offerSheet,
        text: offerSheetToText(offerSheet),
      };
      long_form = {
        version: deal.longform_version,
        data: longForm,
        text: longFormToText(longForm),
      };
    }

    // Music documents (master + publishing licenses)
    let music_documents = null;
    if (deal.deal_type !== 'talent') {
      const licenses = getLicensesByDeal(params.id);
      const song = deal.song_id ? getSongById(deal.song_id) : undefined;

      const master_licenses: any[] = [];
      const publishing_licenses: any[] = [];

      for (const license of licenses) {
        const rightsHolder = getRightsHolderById(license.rights_holder_id);
        if (!rightsHolder || !song) continue;

        const licenseData = generateMusicLicense(deal, license, song, rightsHolder);
        const entry = {
          license_id: license.id,
          rights_holder_name: rightsHolder.name,
          share_percentage: license.share_percentage,
          fee_amount: license.fee_override ?? license.fee_amount,
          license_status: license.license_status,
          data: licenseData,
          text: musicLicenseToText(licenseData),
        };

        if (license.side === 'master') {
          master_licenses.push(entry);
        } else {
          publishing_licenses.push(entry);
        }
      }

      music_documents = {
        master_licenses,
        publishing_licenses,
      };
    }

    return NextResponse.json({
      deal_id: deal.id,
      deal_name: deal.deal_name,
      offer_sheet,
      long_form,
      music_documents,
      uploaded_documents: uploadedDocuments,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
