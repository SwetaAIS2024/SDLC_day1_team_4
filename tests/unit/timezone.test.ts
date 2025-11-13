import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { DateTime } from 'luxon';
import {
    getSingaporeNow,
    parseSingaporeDate,
    formatSingaporeDate,
    isPastDue,
    calculateNextDueDate,
    calculateNotificationTime,
    shouldSendNotification,
    formatReminderTime,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth
} from '../../lib/timezone'; describe('Timezone Utilities', () => {
    // Mock the current time for consistent testing
    const mockNow = DateTime.fromISO('2025-11-13T14:30:00+08:00'); // 2:30 PM SGT

    beforeAll(() => {
        // Mock DateTime.now to return consistent time
        jest.spyOn(DateTime, 'now').mockImplementation(() => mockNow as any);
    }); afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('getSingaporeNow', () => {
        it('should return current time in Singapore timezone', () => {
            const result = getSingaporeNow();

            expect(result.zoneName).toBe('Asia/Singapore');
            expect(result.offset).toBe(480); // +8 hours in minutes
            expect(result.year).toBe(2025);
            expect(result.month).toBe(11);
            expect(result.day).toBe(13);
        });
    });

    describe('parseSingaporeDate', () => {
        it('should parse ISO string as Singapore time', () => {
            const isoString = '2025-11-15T10:00:00.000Z';
            const result = parseSingaporeDate(isoString);

            expect(result.zoneName).toBe('Asia/Singapore');
            expect(result.hour).toBe(18); // 10 UTC = 18 SGT (+8)
        });

        it('should handle ISO string with timezone', () => {
            const isoString = '2025-11-15T10:00:00+05:00';
            const result = parseSingaporeDate(isoString);

            expect(result.zoneName).toBe('Asia/Singapore');
            expect(result.hour).toBe(13); // 10+5 UTC = 15 UTC = 23 SGT, but luxon converts properly
        });
    });

    describe('formatSingaporeDate', () => {
        it('should format DateTime with default format', () => {
            const date = DateTime.fromISO('2025-11-15T14:30:00', { zone: 'Asia/Singapore' });
            const result = formatSingaporeDate(date);

            expect(result).toBe('Nov 15, 2025, 2:30 PM SGT');
        });

        it('should format DateTime with custom format', () => {
            const date = DateTime.fromISO('2025-11-15T14:30:00', { zone: 'Asia/Singapore' });
            const result = formatSingaporeDate(date, 'yyyy-MM-dd HH:mm');

            expect(result).toBe('2025-11-15 14:30 SGT');
        });

        it('should format ISO string', () => {
            const isoString = '2025-11-15T14:30:00+08:00';
            const result = formatSingaporeDate(isoString);

            expect(result).toBe('Nov 15, 2025, 2:30 PM SGT');
        });
    });

    describe('isPastDue', () => {
        it('should return true for past dates', () => {
            const pastDate = '2025-11-13T10:00:00+08:00'; // 4.5 hours ago
            const result = isPastDue(pastDate);

            expect(result).toBe(true);
        });

        it('should return false for future dates', () => {
            const futureDate = '2025-11-13T16:00:00+08:00'; // 1.5 hours from now
            const result = isPastDue(futureDate);

            expect(result).toBe(false);
        });

        it('should return false for current time', () => {
            const currentTime = '2025-11-13T14:30:00+08:00'; // exactly now
            const result = isPastDue(currentTime);

            expect(result).toBe(false);
        });
    });

    describe('calculateNextDueDate', () => {
        const baseDueDate = '2025-11-15T14:00:00+08:00';

        it('should throw error for null due date', () => {
            expect(() => {
                calculateNextDueDate(null, 'daily');
            }).toThrow('Due date required for recurring todos');
        });

        it('should calculate next daily occurrence', () => {
            const result = calculateNextDueDate(baseDueDate, 'daily');
            const expected = DateTime.fromISO(baseDueDate, { zone: 'Asia/Singapore' })
                .plus({ days: 1 })
                .toISO();

            expect(result).toBe(expected);
        });

        it('should calculate next weekly occurrence', () => {
            const result = calculateNextDueDate(baseDueDate, 'weekly');
            const expected = DateTime.fromISO(baseDueDate, { zone: 'Asia/Singapore' })
                .plus({ weeks: 1 })
                .toISO();

            expect(result).toBe(expected);
        });

        it('should calculate next monthly occurrence', () => {
            const result = calculateNextDueDate(baseDueDate, 'monthly');
            const expected = DateTime.fromISO(baseDueDate, { zone: 'Asia/Singapore' })
                .plus({ months: 1 })
                .toISO();

            expect(result).toBe(expected);
        });

        it('should calculate next yearly occurrence', () => {
            const result = calculateNextDueDate(baseDueDate, 'yearly');
            const expected = DateTime.fromISO(baseDueDate, { zone: 'Asia/Singapore' })
                .plus({ years: 1 })
                .toISO();

            expect(result).toBe(expected);
        });

        it('should handle month end edge cases', () => {
            // January 31st + 1 month should be February 28th (or 29th in leap year)
            const jan31 = '2025-01-31T14:00:00+08:00';
            const result = calculateNextDueDate(jan31, 'monthly');

            const resultDate = parseSingaporeDate(result);
            expect(resultDate.month).toBe(2); // February
            expect(resultDate.day).toBe(28); // 2025 is not a leap year
        });

        it('should handle leap year edge cases', () => {
            // Feb 29, 2024 + 1 year should be Feb 28, 2025
            const feb29 = '2024-02-29T14:00:00+08:00';
            const result = calculateNextDueDate(feb29, 'yearly');

            const resultDate = parseSingaporeDate(result);
            expect(resultDate.month).toBe(2); // February
            expect(resultDate.day).toBe(28); // 2025 is not a leap year
            expect(resultDate.year).toBe(2025);
        });

        it('should throw error for invalid recurrence pattern', () => {
            expect(() => {
                calculateNextDueDate(baseDueDate, 'invalid' as any);
            }).toThrow('Invalid recurrence pattern: invalid');
        });
    });

    describe('calculateNotificationTime', () => {
        it('should calculate notification time correctly', () => {
            const dueDate = '2025-11-15T14:00:00+08:00';
            const reminderMinutes = 60; // 1 hour before

            const result = calculateNotificationTime(dueDate, reminderMinutes);

            expect(result.hour).toBe(13); // 1 hour before 14:00
            expect(result.minute).toBe(0);
        });

        it('should handle cross-day notifications', () => {
            const dueDate = '2025-11-15T01:00:00+08:00'; // 1 AM
            const reminderMinutes = 120; // 2 hours before

            const result = calculateNotificationTime(dueDate, reminderMinutes);

            expect(result.day).toBe(14); // Previous day
            expect(result.hour).toBe(23); // 11 PM previous day
            expect(result.minute).toBe(0);
        });
    });

    describe('shouldSendNotification', () => {
        const dueDate = '2025-11-13T16:00:00+08:00'; // 4 PM today (1.5 hours from mock now)

        it('should return false if notification time hasnt arrived', () => {
            const reminderMinutes = 30; // 30 minutes before (notification at 3:30 PM)
            const result = shouldSendNotification(dueDate, reminderMinutes, null);

            expect(result).toBe(false); // Current time is 2:30 PM, notification at 3:30 PM
        });

        it('should return true if notification time has arrived and not sent', () => {
            const reminderMinutes = 120; // 2 hours before (notification at 2 PM)
            const result = shouldSendNotification(dueDate, reminderMinutes, null);

            expect(result).toBe(true); // Current time is 2:30 PM, notification was due at 2 PM
        });

        it('should return false if already sent', () => {
            const reminderMinutes = 120; // 2 hours before
            const lastSent = '2025-11-13T14:00:00+08:00';
            const result = shouldSendNotification(dueDate, reminderMinutes, lastSent);

            expect(result).toBe(false);
        });

        it('should return false if todo is overdue', () => {
            const overdueDueDate = '2025-11-13T12:00:00+08:00'; // 12 PM (2.5 hours ago)
            const reminderMinutes = 60; // 1 hour before
            const result = shouldSendNotification(overdueDueDate, reminderMinutes, null);

            expect(result).toBe(false);
        });
    });

    describe('formatReminderTime', () => {
        it('should format reminder time correctly', () => {
            const dueDate = '2025-11-15T14:00:00+08:00';
            const reminderMinutes = 60;

            const result = formatReminderTime(dueDate, reminderMinutes);

            expect(result).toBe('Nov 15, 1:00 PM SGT');
        });
    });

    describe('Date range utilities', () => {
        const testDate = DateTime.fromISO('2025-11-13T14:30:00', { zone: 'Asia/Singapore' });

        describe('startOfDay', () => {
            it('should return start of day', () => {
                const result = startOfDay(testDate);

                expect(result.hour).toBe(0);
                expect(result.minute).toBe(0);
                expect(result.second).toBe(0);
                expect(result.millisecond).toBe(0);
                expect(result.day).toBe(13);
            });
        });

        describe('endOfDay', () => {
            it('should return end of day', () => {
                const result = endOfDay(testDate);

                expect(result.hour).toBe(23);
                expect(result.minute).toBe(59);
                expect(result.second).toBe(59);
                expect(result.millisecond).toBe(999);
                expect(result.day).toBe(13);
            });
        });

        describe('startOfWeek', () => {
            it('should return start of week (Monday)', () => {
                const result = startOfWeek(testDate);

                // Nov 13, 2025 is a Thursday, so Monday is Nov 10
                expect(result.weekday).toBe(1); // Monday
                expect(result.day).toBe(10);
                expect(result.hour).toBe(0);
                expect(result.minute).toBe(0);
            });
        });

        describe('endOfWeek', () => {
            it('should return end of week (Sunday)', () => {
                const result = endOfWeek(testDate);

                // Nov 13, 2025 is a Thursday, so Sunday is Nov 16
                expect(result.weekday).toBe(7); // Sunday
                expect(result.day).toBe(16);
                expect(result.hour).toBe(23);
                expect(result.minute).toBe(59);
            });
        });

        describe('startOfMonth', () => {
            it('should return start of month', () => {
                const result = startOfMonth(testDate);

                expect(result.day).toBe(1);
                expect(result.month).toBe(11);
                expect(result.hour).toBe(0);
                expect(result.minute).toBe(0);
            });
        });

        describe('endOfMonth', () => {
            it('should return end of month', () => {
                const result = endOfMonth(testDate);

                expect(result.day).toBe(30); // November has 30 days
                expect(result.month).toBe(11);
                expect(result.hour).toBe(23);
                expect(result.minute).toBe(59);
            });
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle different timezone inputs correctly', () => {
            const utcDate = '2025-11-15T06:00:00.000Z'; // 6 AM UTC = 2 PM SGT
            const result = parseSingaporeDate(utcDate);

            expect(result.hour).toBe(14); // 2 PM in Singapore
            expect(result.zoneName).toBe('Asia/Singapore');
        });

        it('should handle daylight saving time transitions', () => {
            // Singapore doesn't have DST, but test with other timezones
            const date = DateTime.fromISO('2025-03-09T10:00:00', { zone: 'America/New_York' });
            const sgDate = date.setZone('Asia/Singapore');

            expect(sgDate.zoneName).toBe('Asia/Singapore');
            expect(sgDate.offset).toBe(480); // Always +8 hours
        });

        it('should maintain precision in calculations', () => {
            const dueDate = '2025-11-15T14:30:45.123+08:00';
            const reminderMinutes = 15;

            const notificationTime = calculateNotificationTime(dueDate, reminderMinutes);

            expect(notificationTime.second).toBe(45);
            expect(notificationTime.millisecond).toBe(123);
        });
    });
});