import { NextResponse } from 'next/server';
import { updateLicense, deleteLicense } from '@/lib/db/music-licenses';

export async function PUT(request: Request, { params }: { params: { id: string; licenseId: string } }) {
  try {
    const body = await request.json();
    const license = updateLicense(params.licenseId, body);
    if (!license) return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: license });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; licenseId: string } }) {
  try {
    const ok = deleteLicense(params.licenseId);
    if (!ok) return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
