import { NextResponse } from 'next/server';
import { getTemplateById, updateTemplate, deleteTemplate } from '@/lib/db/templates';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const template = getTemplateById(params.id);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const template = updateTemplate(params.id, {
      name: body.name,
      description: body.description,
      template_data: body.template_data,
    });
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = deleteTemplate(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
