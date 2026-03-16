import { NextResponse } from 'next/server';
import { getUpcomingTasks, getTaskCounts } from '@/lib/db/tasks';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Math.min(parseInt(searchParams.get('days') || '7') || 7, 90));
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100));

    const tasks = getUpcomingTasks(days).slice(0, limit);
    const counts = getTaskCounts();

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        counts,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to fetch upcoming tasks:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
