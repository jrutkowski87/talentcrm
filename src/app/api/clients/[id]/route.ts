import { NextResponse } from 'next/server';
import { getClientById, updateClient, deleteClient } from '@/lib/db/clients';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const client = getClientById(params.id);
    if (!client) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const client = updateClient(params.id, body);
    if (!client) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = deleteClient(params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
