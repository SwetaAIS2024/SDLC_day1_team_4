import { DateTime } from 'luxon';
import { Todo, TodoWithSubtasks, Holiday, CalendarDayCell, CalendarWeek, CalendarMonth } from './types';

const SINGAPORE_ZONE = 'Asia/Singapore';

/**
 * Generate calendar month grid with todos and holidays
 */
export function generateCalendarMonth(
  year: number,
  month: number,
  todos: TodoWithSubtasks[],
  holidays: Holiday[]
): CalendarMonth {
  const firstDay = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: SINGAPORE_ZONE }
  );
  const lastDay = firstDay.endOf('month');
  const daysInMonth = lastDay.day;

  // Build holiday map for quick lookup (date -> name)
  const holidayMap = new Map<string, string>(
    holidays.map(h => [h.date, h.name])
  );

  // Build todo map grouped by date (date -> todos[])
  const todosByDate = new Map<string, TodoWithSubtasks[]>();
  todos.forEach(todo => {
    if (!todo.due_date) return;
    try {
      const dueDate = DateTime.fromISO(todo.due_date, { zone: SINGAPORE_ZONE });
      const dateKey = dueDate.toISODate();
      if (dateKey) {
        if (!todosByDate.has(dateKey)) {
          todosByDate.set(dateKey, []);
        }
        todosByDate.get(dateKey)!.push(todo);
      }
    } catch (error) {
      console.error('Invalid due date format:', todo.due_date);
    }
  });

  // Generate weeks
  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDayCell[] = [];
  let weekNumber = 1;

  // Pad beginning of month with previous month days
  const firstDayOfWeek = firstDay.weekday % 7; // Convert to 0=Sunday
  for (let i = 0; i < firstDayOfWeek; i++) {
    const date = firstDay.minus({ days: firstDayOfWeek - i });
    currentWeek.push(createDayCell(date, false, holidayMap, todosByDate));
  }

  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = DateTime.fromObject({ year, month, day }, { zone: SINGAPORE_ZONE });
    currentWeek.push(createDayCell(date, true, holidayMap, todosByDate));

    if (currentWeek.length === 7) {
      weeks.push({ weekNumber, days: currentWeek });
      currentWeek = [];
      weekNumber++;
    }
  }

  // Pad end of month with next month days
  if (currentWeek.length > 0) {
    const remainingDays = 7 - currentWeek.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = lastDay.plus({ days: i });
      currentWeek.push(createDayCell(date, false, holidayMap, todosByDate));
    }
    weeks.push({ weekNumber, days: currentWeek });
  }

  return {
    year,
    month,
    monthName: firstDay.toFormat('MMMM'),
    weeks
  };
}

/**
 * Create a calendar day cell with all metadata
 */
function createDayCell(
  date: DateTime,
  isCurrentMonth: boolean,
  holidayMap: Map<string, string>,
  todosByDate: Map<string, TodoWithSubtasks[]>
): CalendarDayCell {
  const dateString = date.toISODate() || '';
  const dayTodos = todosByDate.get(dateString) || [];
  const holidayName = holidayMap.get(dateString);

  const highPriorityCount = dayTodos.filter(t => t.priority === 'high').length;

  return {
    date: date.toJSDate(),
    dateString,
    dayNumber: date.day,
    isCurrentMonth,
    isToday: isToday(date),
    isWeekend: isWeekend(date),
    isHoliday: !!holidayName,
    holidayName,
    todos: dayTodos,
    todoCount: dayTodos.length,
    highPriorityCount
  };
}

/**
 * Check if date is today (Singapore timezone)
 */
export function isToday(date: DateTime): boolean {
  const today = DateTime.now().setZone(SINGAPORE_ZONE);
  return date.hasSame(today, 'day');
}

/**
 * Check if date is weekend (Saturday or Sunday)
 */
export function isWeekend(date: DateTime): boolean {
  const weekday = date.weekday; // 1=Monday, 7=Sunday
  return weekday === 6 || weekday === 7; // Saturday or Sunday
}

/**
 * Get date range for a specific month
 */
export function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const firstDay = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: SINGAPORE_ZONE }
  );
  const lastDay = firstDay.endOf('month');

  return {
    start: firstDay.toISO() || '',
    end: lastDay.toISO() || ''
  };
}

/**
 * Format date for display
 */
export function formatCalendarDate(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: SINGAPORE_ZONE });
  return dt.toFormat('EEE, MMM d, yyyy'); // e.g., "Fri, Nov 15, 2025"
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: SINGAPORE_ZONE });
  return dt.toFormat('EEEE'); // e.g., "Friday"
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  const date = DateTime.fromObject({ year, month, day: 1 }, { zone: SINGAPORE_ZONE });
  const prev = date.minus({ months: 1 });
  return { year: prev.year, month: prev.month };
}

/**
 * Navigate to next month
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  const date = DateTime.fromObject({ year, month, day: 1 }, { zone: SINGAPORE_ZONE });
  const next = date.plus({ months: 1 });
  return { year: next.year, month: next.month };
}

/**
 * Get current month and year (Singapore timezone)
 */
export function getCurrentMonthYear(): { year: number; month: number } {
  const now = DateTime.now().setZone(SINGAPORE_ZONE);
  return { year: now.year, month: now.month };
}
