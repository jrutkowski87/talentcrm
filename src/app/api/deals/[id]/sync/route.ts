import { NextRequest, NextResponse } from 'next/server';
import { getSyncStatus, applyDocumentChanges } from '@/lib/engine/document-sync';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const status = getSyncStatus(params.id);
    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('Failed to fetch sync status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const { changes, source } = body;

    if (!changes || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: changes, source' },
        { status: 400 }
      );
    }

    if (source !== 'offer_sheet' && source !== 'long_form') {
      return NextResponse.json(
        { error: 'source must be "offer_sheet" or "long_form"' },
        { status: 400 }
      );
    }

    applyDocumentChanges(params.id, changes, source);
    const status = getSyncStatus(params.id);

    return NextResponse.json({
      message: 'Changes applied successfully',
      sync_status: status,
    });
  } catch (error: unknown) {
    console.error('Failed to apply sync changes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
