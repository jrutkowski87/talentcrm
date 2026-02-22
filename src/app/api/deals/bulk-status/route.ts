import { NextResponse } from 'next/server';
import { updateDealStatus } from '@/lib/db/deals';
import type { DealStatus } from '@/lib/db/deals';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { deal_ids, status } = body as { deal_ids: string[]; status: DealStatus };

    if (!Array.isArray(deal_ids) || deal_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'deal_ids must be a non-empty array' }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];
    for (const id of deal_ids) {
      try {
        const updated = updateDealStatus(id, status);
        results.push({ id, success: !!updated, error: updated ? undefined : 'Deal not found' });
      } catch (err: any) {
        results.push({ id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
