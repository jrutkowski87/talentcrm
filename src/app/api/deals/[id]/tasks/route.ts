import { NextResponse } from 'next/server';
import { getTasksByDeal, createTask } from '@/lib/db/tasks';
import { addTimelineEntry } from '@/lib/db/timeline';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const tasks = getTasksByDeal(params.id);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
    }
    const task = createTask({
      deal_id: params.id,
      title: body.title.trim(),
      description: body.description?.trim(),
      due_date: body.due_date,
      priority: body.priority || 'medium',
      assigned_to: body.assigned_to,
      auto_generated: body.auto_generated || false,
    });

    // Log to timeline
    try {
      addTimelineEntry({
        deal_id: params.id,
        event_type: 'task_created',
        title: 'Task created',
        description: body.title.trim(),
      });
    } catch { /* best effort */ }

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
