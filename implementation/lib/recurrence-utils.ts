/**
 * Date Calculation Functions for Recurring Todos
 * 
 * Add these functions to your lib/timezone.ts file
 * These functions handle the calculation of next due dates for recurring todos
 */

import type { RecurrencePattern } from './types';

/**
 * Calculate the next due date for a recurring todo
 * Uses Singapore timezone for all calculations
 * 
 * @param currentDueDate - ISO string of current due date, or null
 * @param pattern - The recurrence pattern
 * @returns ISO string of next due date
 */
export function calculateNextDueDate(
  currentDueDate: string | null,
  pattern: RecurrencePattern
): string {
  if (!currentDueDate) {
    // If no due date, calculate from current Singapore time
    const now = getSingaporeNow();
    return addRecurrenceOffset(now, pattern).toISOString();
  }

  // Parse current due date
  const current = new Date(currentDueDate);
  
  switch (pattern) {
    case 'daily':
      // Add exactly 1 day
      current.setDate(current.getDate() + 1);
      break;
    
    case 'weekly':
      // Add exactly 7 days
      current.setDate(current.getDate() + 7);
      break;
    
    case 'monthly':
      // Add 1 month (JavaScript handles overflow automatically)
      // e.g., Jan 31 + 1 month = Feb 28/29
      const originalDay = current.getDate();
      current.setMonth(current.getMonth() + 1);
      
      // Log warning if day changed due to month overflow
      if (current.getDate() !== originalDay) {
        console.warn(
          `Monthly recurrence adjusted from day ${originalDay} to ${current.getDate()} ` +
          `due to month having fewer days`
        );
      }
      break;
    
    case 'yearly':
      // Add exactly 1 year
      // Leap year handling is automatic (Feb 29 2024 -> Feb 28 2025)
      current.setFullYear(current.getFullYear() + 1);
      break;
    
    default:
      throw new Error(`Invalid recurrence pattern: ${pattern}`);
  }

  return current.toISOString();
}

/**
 * Add recurrence offset to a date (helper for no due date scenarios)
 * 
 * @param date - Base date
 * @param pattern - Recurrence pattern
 * @returns New date with offset applied
 */
function addRecurrenceOffset(date: Date, pattern: RecurrencePattern): Date {
  const result = new Date(date);
  
  switch (pattern) {
    case 'daily':
      result.setDate(result.getDate() + 1);
      break;
    case 'weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'monthly':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'yearly':
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  
  return result;
}

/**
 * Get current date/time in Singapore timezone
 * 
 * If this function doesn't exist in your lib/timezone.ts, add it:
 */
export function getSingaporeNow(): Date {
  // Get current UTC time
  const now = new Date();
  
  // Convert to Singapore timezone (UTC+8)
  const singaporeTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
  );
  
  return singaporeTime;
}

/**
 * Format date in Singapore timezone for display
 * 
 * @param date - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatSingaporeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get readable description of recurrence pattern
 * 
 * @param pattern - Recurrence pattern
 * @returns Human-readable description
 */
export function getRecurrenceDescription(pattern: RecurrencePattern | null): string {
  if (!pattern) return 'Does not repeat';
  
  const descriptions: Record<RecurrencePattern, string> = {
    daily: 'Repeats daily',
    weekly: 'Repeats weekly',
    monthly: 'Repeats monthly',
    yearly: 'Repeats yearly',
  };
  
  return descriptions[pattern];
}
