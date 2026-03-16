import { NextResponse } from 'next/server';
import { getAllTemplates, createTemplate } from '@/lib/db/templates';

export async function GET() {
  try {
    const templates = getAllTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error: unknown) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 });
    }
    if (!body.deal_type) {
      return NextResponse.json({ success: false, error: 'Deal type is required' }, { status: 400 });
    }
    const template = createTemplate({
      name: body.name.trim(),
      deal_type: body.deal_type,
      description: body.description?.trim() || undefined,
      template_data: body.template_data || {},
      created_by: body.created_by,
    });
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
