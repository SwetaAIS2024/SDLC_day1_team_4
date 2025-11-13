import { describe, it, expect } from '@jest/globals';
import { DateTime } from 'luxon';
import { generateCalendarData } from '../../lib/calendar-utils';
import type { Holiday, TodoWithSubtasks } from '../../lib/types';

describe('Calendar Utilities', () => {
    describe('generateCalendarData', () => {
        const mockHolidays: Holiday[] = [
            {
                id: 1,
                name: 'New Year\'s Day',
                date: '2025-01-01',
                year: 2025,
                is_recurring: 1,
                created_at: '2025-01-01T00:00:00+08:00'
            },
            {
                id: 2,
                name: 'Chinese New Year',
                date: '2025-01-29',
                year: 2025,
                is_recurring: 0,
                created_at: '2025-01-01T00:00:00+08:00'
            }
        ];

        const mockTodos: TodoWithSubtasks[] = [
            {
                id: 1,
                title: 'Important meeting',
                completed_at: null,
                priority: 'high',
                due_date: '2025-11-15T14:00:00+08:00',
                recurrence_pattern: null,
                reminder_minutes: null,
                last_notification_sent: null,
                created_at: '2025-11-10T10:00:00+08:00',
                updated_at: '2025-11-10T10:00:00+08:00',
                subtasks: [],
                progress: 0
            },
            {
                id: 2,
                title: 'Project deadline',
                completed_at: null,
                priority: 'high',
                due_date: '2025-11-15T23:59:00+08:00',
                recurrence_pattern: null,
                reminder_minutes: null,
                last_notification_sent: null,
                created_at: '2025-11-10T10:00:00+08:00',
                updated_at: '2025-11-10T10:00:00+08:00',
                subtasks: [],
                progress: 0
            },
            {
                id: 3,
                title: 'Completed task',
                completed_at: '2025-11-12T15:00:00+08:00',
                priority: 'medium',
                due_date: '2025-11-20T12:00:00+08:00',
                recurrence_pattern: null,
                reminder_minutes: null,
                last_notification_sent: null,
                created_at: '2025-11-10T10:00:00+08:00',
                updated_at: '2025-11-12T15:00:00+08:00',
                subtasks: [],
                progress: 100
            }
        ];

        it('should generate calendar data for November 2025', () => {
            const result = generateCalendarData(2025, 11, mockHolidays, mockTodos);

            expect(result.year).toBe(2025);
            expect(result.month).toBe(11);
            expect(result.monthName).toBe('November');
            expect(result.weeks).toBeDefined();
            expect(result.weeks.length).toBeGreaterThan(0);
        });

        it('should include all days of the month', () => {
            const result = generateCalendarData(2025, 11, [], []);

            // November 2025 has 30 days
            const allDays = result.weeks.flat();
            const novemberDays = allDays.filter(day => day.month === 11);

            expect(novemberDays.length).toBe(30);

            // Check first and last days
            expect(novemberDays[0].day).toBe(1);
            expect(novemberDays[29].day).toBe(30);
        });

        it('should include padding days from previous and next months', () => {
            const result = generateCalendarData(2025, 11, [], []);

            const allDays = result.weeks.flat();
            const previousMonth = allDays.filter(day => day.month === 10);
            const nextMonth = allDays.filter(day => day.month === 12);

            expect(previousMonth.length).toBeGreaterThan(0);
            expect(nextMonth.length).toBeGreaterThan(0);
        });

        it('should mark current day correctly', () => {
            const today = DateTime.now().setZone('Asia/Singapore');
            const result = generateCalendarData(today.year, today.month, [], []);

            const todayCell = result.weeks
                .flat()
                .find(day => day.day === today.day && day.month === today.month);

            if (todayCell) {
                expect(todayCell.isToday).toBe(true);
            }
        });

        it('should include holidays on correct dates', () => {
            const result = generateCalendarData(2025, 1, mockHolidays, []);

            const jan1 = result.weeks
                .flat()
                .find(day => day.day === 1 && day.month === 1);

            const jan29 = result.weeks
                .flat()
                .find(day => day.day === 29 && day.month === 1);

            expect(jan1?.holiday).toBeDefined();
            expect(jan1?.holiday?.name).toBe('New Year\'s Day');

            expect(jan29?.holiday).toBeDefined();
            expect(jan29?.holiday?.name).toBe('Chinese New Year');
        });

        it('should group todos by date', () => {
            const result = generateCalendarData(2025, 11, [], mockTodos);

            const nov15 = result.weeks
                .flat()
                .find(day => day.day === 15 && day.month === 11);

            const nov20 = result.weeks
                .flat()
                .find(day => day.day === 20 && day.month === 11);

            expect(nov15?.todos.length).toBe(2); // Two todos on Nov 15
            expect(nov20?.todos.length).toBe(1); // One todo on Nov 20

            // Check todo priorities are included
            expect(nov15?.todos.some(todo => todo.priority === 'high')).toBe(true);
        });

        it('should handle todos without due dates', () => {
            const todosWithoutDates: TodoWithSubtasks[] = [
                {
                    ...mockTodos[0],
                    due_date: null
                }
            ];

            const result = generateCalendarData(2025, 11, [], todosWithoutDates);

            // Todos without due dates should not appear on any calendar day
            const allTodos = result.weeks
                .flat()
                .reduce((acc, day) => acc + day.todos.length, 0);

            expect(allTodos).toBe(0);
        });

        it('should handle edge case of February in leap year', () => {
            const result = generateCalendarData(2024, 2, [], []); // 2024 is a leap year

            const feb29 = result.weeks
                .flat()
                .find(day => day.day === 29 && day.month === 2);

            expect(feb29).toBeDefined();
            expect(feb29?.isCurrentMonth).toBe(true);
        });

        it('should handle edge case of February in non-leap year', () => {
            const result = generateCalendarData(2025, 2, [], []); // 2025 is not a leap year

            const feb28 = result.weeks
                .flat()
                .find(day => day.day === 28 && day.month === 2);

            const feb29 = result.weeks
                .flat()
                .find(day => day.day === 29 && day.month === 2);

            expect(feb28).toBeDefined();
            expect(feb28?.isCurrentMonth).toBe(true);

            // Feb 29 should not exist in current month (might be from next month)
            if (feb29) {
                expect(feb29.isCurrentMonth).toBe(false);
            }
        });

        it('should mark weekends correctly', () => {
            const result = generateCalendarData(2025, 11, [], []);

            // Find a Saturday and Sunday in November 2025
            const weekend = result.weeks
                .flat()
                .filter(day => day.month === 11 && (day.date.weekday === 6 || day.date.weekday === 7));

            expect(weekend.length).toBeGreaterThan(0);
            weekend.forEach(day => {
                expect(day.isWeekend).toBe(true);
            });
        });

        it('should mark weekdays correctly', () => {
            const result = generateCalendarData(2025, 11, [], []);

            // Find weekdays in November 2025
            const weekdays = result.weeks
                .flat()
                .filter(day => day.month === 11 && day.date.weekday >= 1 && day.date.weekday <= 5);

            expect(weekdays.length).toBeGreaterThan(0);
            weekdays.forEach(day => {
                expect(day.isWeekend).toBe(false);
            });
        });

        it('should have consistent week structure', () => {
            const result = generateCalendarData(2025, 11, [], []);

            // Each week should have 7 days
            result.weeks.forEach(week => {
                expect(week.length).toBe(7);
            });

            // Should have 4-6 weeks typically
            expect(result.weeks.length).toBeGreaterThanOrEqual(4);
            expect(result.weeks.length).toBeLessThanOrEqual(6);
        });

        it('should maintain chronological order', () => {
            const result = generateCalendarData(2025, 11, [], []);

            const allDays = result.weeks.flat();

            for (let i = 0; i < allDays.length - 1; i++) {
                const currentDay = allDays[i];
                const nextDay = allDays[i + 1];

                expect(currentDay.date.toMillis()).toBeLessThanOrEqual(nextDay.date.toMillis());
            }
        });

        it('should handle todos spanning multiple time zones correctly', () => {
            const todoWithUTCTime: TodoWithSubtasks = {
                ...mockTodos[0],
                due_date: '2025-11-15T06:00:00.000Z' // 6 AM UTC = 2 PM SGT
            };

            const result = generateCalendarData(2025, 11, [], [todoWithUTCTime]);

            const nov15 = result.weeks
                .flat()
                .find(day => day.day === 15 && day.month === 11);

            expect(nov15?.todos.length).toBe(1);
            expect(nov15?.todos[0].due_date).toBe('2025-11-15T06:00:00.000Z');
        });
    });
});