import { NextResponse } from 'next/server';
import { getTasksByDeal, createTask } from '@/lib/db/tasks';
import { addTimelineEntry } from '@/lib/db/timeline';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const tasks = getTasksByDeal(params.id);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: unknown) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
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
  } catch (error: unknown) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
