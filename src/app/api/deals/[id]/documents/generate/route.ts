import { NextResponse } from 'next/server';
import { getDealById } from '@/lib/db/deals';
import { generateOfferSheetDocx, generateLongFormDocx } from '@/lib/engine/docx-exporter';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const deal = getDealById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { type, aiPolish } = body;

    if (!type || !['offer_sheet', 'long_form'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document type. Must be "offer_sheet" or "long_form".' },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let filename: string;

    if (type === 'offer_sheet') {
      buffer = await generateOfferSheetDocx(deal, { aiPolish: !!aiPolish });
      filename = `${deal.deal_name.replace(/[^a-zA-Z0-9]/g, '_')}_Offer_Sheet${aiPolish ? '_AI' : ''}.docx`;
    } else {
      buffer = await generateLongFormDocx(deal, { aiPolish: !!aiPolish });
      filename = `${deal.deal_name.replace(/[^a-zA-Z0-9]/g, '_')}_Long_Form${aiPolish ? '_AI' : ''}.docx`;
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: unknown) {
    console.error('Failed to generate document:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
