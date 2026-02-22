import { NextResponse } from 'next/server';
import { updateTask, deleteTask } from '@/lib/db/tasks';
import { addTimelineEntry } from '@/lib/db/timeline';

export async function PUT(req: Request, { params }: { params: { id: string; taskId: string } }) {
  try {
    const body = await req.json();
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
      } catch { /* best effort */ }
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; taskId: string } }) {
  try {
    const deleted = deleteTask(params.taskId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
