import { NextResponse } from 'next/server';
import { getUpcomingTasks, getTaskCounts } from '@/lib/db/tasks';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const tasks = getUpcomingTasks(days).slice(0, limit);
    const counts = getTaskCounts();

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        counts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
