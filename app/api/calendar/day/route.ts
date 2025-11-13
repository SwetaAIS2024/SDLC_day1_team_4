import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, holidayDB } from '@/lib/db';
import { DateTime } from 'luxon';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get('date');

  if (!dateParam) {
    return NextResponse.json(
      { error: 'Missing required parameter: date (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateParam)) {
    return NextResponse.json(
      { error: 'Invalid date format. Expected YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    // Parse date in Singapore timezone
    const date = DateTime.fromISO(dateParam, { zone: 'Asia/Singapore' });
    if (!date.isValid) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      );
    }

    // Get start and end of day
    const startOfDay = date.startOf('day').toISO();
    const endOfDay = date.endOf('day').toISO();

    if (!startOfDay || !endOfDay) {
      throw new Error('Failed to calculate day boundaries');
    }

    // Fetch todos for this day
    const todos = todoDB.getTodosByDateRange(session.userId, startOfDay, endOfDay);

    // Check if this day is a holiday
    const holiday = holidayDB.getHolidayByDate(dateParam);

    // Calculate statistics
    const completedCount = todos.filter(t => t.completed).length;

    return NextResponse.json({
      date: dateParam,
      dayName: date.toFormat('EEEE'),
      isHoliday: !!holiday,
      holidayName: holiday?.name || null,
      todos,
      todoCount: todos.length,
      completedCount
    });
  } catch (error) {
    console.error('Calendar day API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch day data' },
      { status: 500 }
    );
  }
}
