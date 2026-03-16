import { NextResponse } from 'next/server';
import { updateTask, deleteTask } from '@/lib/db/tasks';
import { addTimelineEntry } from '@/lib/db/timeline';
import { getDb } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string; taskId: string } }) {
  try {
    // Verify the task belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_tasks WHERE id = ?').get(params.taskId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }
    const task = updateTask(params.taskId, {
      title: body.title,
      description: body.description,
      due_date: body.due_date,
      priority: body.priority,
      status: body.status,
      assigned_to: body.assigned_to,
    });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Log completion to timeline
    if (body.status === 'completed') {
      try {
        addTimelineEntry({
          deal_id: params.id,
          event_type: 'task_completed',
          title: 'Task completed',
          description: task.title,
        });
      } catch (err) { console.warn('Failed to log task completion to timeline:', err); }
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error: unknown) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; taskId: string } }) {
  try {
    // Verify the task belongs to this deal
    const existing = getDb().prepare('SELECT deal_id FROM deal_tasks WHERE id = ?').get(params.taskId) as { deal_id: string } | undefined;
    if (!existing || existing.deal_id !== params.id) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    const deleted = deleteTask(params.taskId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
