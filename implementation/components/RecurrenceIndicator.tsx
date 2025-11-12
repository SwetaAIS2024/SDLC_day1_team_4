/**
 * Recurrence Indicator Component
 * 
 * Visual icon indicator showing that a todo is recurring
 * Displays different icons and tooltips for each pattern
 */

'use client';

import type { RecurrencePattern } from '@/lib/types';
import { getRecurrenceDescription } from '@/lib/recurrence-utils';

interface RecurrenceIndicatorProps {
  pattern: RecurrencePattern | null;
  className?: string;
}

export function RecurrenceIndicator({ 
  pattern, 
  className = '' 
}: RecurrenceIndicatorProps) {
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
      className={`inline-flex items-center gap-1 text-sm cursor-help ${colors[pattern]} ${className}`}
    >
      <span className="text-base">{icons[pattern]}</span>
      <span className="text-xs font-medium capitalize">{pattern}</span>
    </span>
  );
}

/**
 * Compact version showing only icon (for tight spaces)
 */
export function RecurrenceIcon({ 
  pattern 
}: { pattern: RecurrencePattern | null }) {
  if (!pattern) return null;

  const icons: Record<RecurrencePattern, string> = {
    daily: '🔄',
    weekly: '📅',
    monthly: '🗓️',
    yearly: '📆'
  };

  return (
    <span
      title={getRecurrenceDescription(pattern)}
      aria-label={getRecurrenceDescription(pattern)}
      className="text-sm cursor-help"
    >
      {icons[pattern]}
    </span>
  );
}
