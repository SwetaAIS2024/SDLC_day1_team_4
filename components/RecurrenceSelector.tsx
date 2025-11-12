/**
 * Recurrence Selector Component
 * PRP-03: Dropdown for selecting recurrence pattern when creating/editing todos
 */

'use client';

import type { RecurrencePattern } from '@/lib/db';

interface RecurrenceSelectorProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
  disabled?: boolean;
}

export function RecurrenceSelector({ 
  value, 
  onChange, 
  disabled = false 
}: RecurrenceSelectorProps) {
  return (
    <div className="space-y-2">
      <label 
        htmlFor="recurrence-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Recurrence
      </label>
      
      <select
        id="recurrence-select"
        value={value || 'none'}
        onChange={(e) => {
          const newValue = e.target.value === 'none' 
            ? null 
            : e.target.value as RecurrencePattern;
          onChange(newValue);
        }}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                   rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
      
      {value && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ℹ️ Next instance will be created automatically when completed
        </p>
      )}
      
      {value === 'monthly' && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ If due date is 29-31, next instance may be adjusted to last day of month
        </p>
      )}
    </div>
  );
}
