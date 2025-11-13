'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateCalendarMonth, getCurrentMonthYear, getPreviousMonth, getNextMonth, formatCalendarDate } from '@/lib/calendar-utils';
import { TodoWithSubtasks, CalendarMonth, CalendarData, DayModalData, PRIORITY_CONFIG } from '@/lib/types';

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  
  // Calendar state
  const currentDate = getCurrentMonthYear();
  const [viewYear, setViewYear] = useState(currentDate.year);
  const [viewMonth, setViewMonth] = useState(currentDate.month);
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth | null>(null);
  
  // Day modal state
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalData, setDayModalData] = useState<DayModalData | null>(null);

  // Fetch username and check session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch session');
        }
        const data = await response.json();
        setUsername(data.username || '');
      } catch (err) {
        console.error('Session error:', err);
        setError('Failed to load session');
      }
    };
    fetchSession();
  }, [router]);

  // Fetch calendar data when month/year changes
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/calendar?year=${viewYear}&month=${viewMonth}`);
        if (!response.ok) {
          throw new Error('Failed to fetch calendar data');
        }
        
        const data: CalendarData = await response.json();
        
        // Generate calendar grid
        const calendar = generateCalendarMonth(
          viewYear,
          viewMonth,
          data.todos,
          data.holidays
        );
        
        setCalendarMonth(calendar);
      } catch (err) {
        console.error('Calendar fetch error:', err);
        setError('Failed to load calendar');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [viewYear, viewMonth]);

  // Navigation handlers
  const handlePreviousMonth = () => {
    const { year, month } = getPreviousMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(month);
  };

  const handleNextMonth = () => {
    const { year, month } = getNextMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(month);
  };

  const handleToday = () => {
    const { year, month } = getCurrentMonthYear();
    setViewYear(year);
    setViewMonth(month);
  };

  // Day cell click handler
  const handleDayClick = async (dateString: string) => {
    try {
      const response = await fetch(`/api/calendar/day?date=${dateString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch day data');
      }
      
      const data: DayModalData = await response.json();
      setDayModalData(data);
      setShowDayModal(true);
    } catch (err) {
      console.error('Day fetch error:', err);
      setError('Failed to load day details');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading && !calendarMonth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center transition-colors duration-200">
        <div className="text-gray-600 dark:text-slate-400">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">📅 Calendar View</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 transition-colors duration-200">Welcome, {username || 'User'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/todos')}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
              >
                📝 Todo List
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {calendarMonth?.monthName} {viewYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ◀ Prev
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Next ▶
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-slate-600 dark:text-slate-400 py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarMonth?.weeks.map((week) =>
              week.days.map((day) => (
                <div
                  key={day.dateString}
                  onClick={() => day.isCurrentMonth && handleDayClick(day.dateString)}
                  className={`
                    min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all
                    ${day.isCurrentMonth
                      ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 opacity-40'
                    }
                    ${day.isToday ? 'ring-2 ring-indigo-500' : ''}
                    ${day.isWeekend && day.isCurrentMonth ? 'bg-blue-50/50 dark:bg-slate-700/70' : ''}
                    ${day.isHoliday && day.isCurrentMonth ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : ''}
                  `}
                >
                  {/* Day Number */}
                  <div className={`
                    text-sm font-semibold mb-1
                    ${day.isCurrentMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}
                    ${day.isToday ? 'text-indigo-600 dark:text-indigo-400' : ''}
                  `}>
                    {day.dayNumber}
                  </div>

                  {/* Holiday Name */}
                  {day.isHoliday && day.isCurrentMonth && (
                    <div className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1 truncate">
                      🎉 {day.holidayName}
                    </div>
                  )}

                  {/* Todos */}
                  {day.todoCount > 0 && day.isCurrentMonth && (
                    <div className="space-y-1">
                      {day.todos.slice(0, 2).map(todo => (
                        <div
                          key={todo.id}
                          className={`
                            text-xs px-2 py-1 rounded truncate
                            ${PRIORITY_CONFIG[todo.priority].color}
                          `}
                        >
                          {todo.completed_at && '✓ '}
                          {todo.title}
                        </div>
                      ))}
                      {day.todoCount > 2 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                          +{day.todoCount - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Day Modal */}
      {showDayModal && dayModalData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {dayModalData.dayName}
                </h2>
                <p className="text-sm text-gray-600">
                  {formatCalendarDate(new Date(dayModalData.date))}
                  {dayModalData.isHoliday && (
                    <span className="ml-2 text-yellow-600">
                      🎉 {dayModalData.holidayName}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {dayModalData.todoCount === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No todos for this day
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Todos ({dayModalData.todoCount})
                    </h3>
                    <span className="text-sm text-gray-600">
                      {dayModalData.completedCount} completed
                    </span>
                  </div>

                  {dayModalData.todos.map(todo => (
                    <div
                      key={todo.id}
                      className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!!todo.completed_at}
                          readOnly
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${todo.completed_at ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                              {todo.title}
                            </h4>
                            <span className={`
                              text-xs px-2 py-0.5 rounded-full font-medium
                              ${PRIORITY_CONFIG[todo.priority].color}
                            `}>
                              {todo.priority}
                            </span>
                          </div>

                          {todo.tags && todo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {todo.tags.map(tag => (
                                <span
                                  key={tag.id}
                                  className="text-xs px-2 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {todo.subtasks && todo.subtasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {todo.subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(subtask.completed)}
                                    readOnly
                                    className="scale-75"
                                  />
                                  <span className={subtask.completed ? 'line-through text-slate-500' : 'text-slate-600 dark:text-slate-400'}>
                                    {subtask.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={() => setShowDayModal(false)}
                className="w-full px-4 py-2.5 bg-slate-700 dark:bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
