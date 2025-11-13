import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, holidayDB } from '@/lib/db';
import { getMonthDateRange } from '@/lib/calendar-utils';
import { DateTime } from 'luxon';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  // Validate parameters
  if (!yearParam || !monthParam) {
    return NextResponse.json(
      { error: 'Missing required parameters: year and month' },
      { status: 400 }
    );
  }

  const year = parseInt(yearParam);
  const month = parseInt(monthParam);

  // Validate ranges
  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json(
      { error: 'Invalid year or month format' },
      { status: 400 }
    );
  }

  if (year < 1900 || year > 2100) {
    return NextResponse.json(
      { error: 'Year must be between 1900 and 2100' },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { error: 'Month must be between 1 and 12' },
      { status: 400 }
    );
  }

  try {
    // Get date range for the month
    const { start, end } = getMonthDateRange(year, month);

    // Fetch todos with due dates in this month
    const todos = todoDB.getTodosByDateRange(session.userId, start, end);

    // Fetch holidays for this month
    const holidays = holidayDB.getHolidaysByMonth(year, month);

    // Calculate month metadata
    const firstDay = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: 'Asia/Singapore' }
    );

    return NextResponse.json({
      month,
      year,
      monthName: firstDay.toFormat('MMMM'),
      daysInMonth: firstDay.daysInMonth,
      firstDayOfWeek: firstDay.weekday % 7, // 0=Sunday
      todos,
      holidays
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
