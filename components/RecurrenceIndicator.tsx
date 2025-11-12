/**
 * Recurrence Indicator Component
 * PRP-03: Visual icon indicator showing that a todo is recurring
 */

'use client';

import type { RecurrencePattern } from '@/lib/db';
import { getRecurrenceDescription } from '@/lib/timezone';

interface RecurrenceIndicatorProps {
  pattern: RecurrencePattern | null;
}

/**
 * Compact icon-only version for todo list display
 */
export function RecurrenceIcon({ pattern }: RecurrenceIndicatorProps) {
  if (!pattern) return null;

  const icons: Record<RecurrencePattern, string> = {
    daily: '🔄',
    weekly: '📅',
    monthly: '🗓️',
    yearly: '📆'
  };

  const colors: Record<RecurrencePattern, string> = {
    daily: 'text-blue-600 dark:text-blue-400',
    weekly: 'text-green-600 dark:text-green-400',
    monthly: 'text-purple-600 dark:text-purple-400',
    yearly: 'text-orange-600 dark:text-orange-400'
  };

  return (
    <span
      title={getRecurrenceDescription(pattern)}
      aria-label={getRecurrenceDescription(pattern)}
      className={`text-sm cursor-help ${colors[pattern]}`}
    >
      {icons[pattern]}
    </span>
  );
}
