/**
 * Reminder Selector Component
 * PRP-04: Dropdown for selecting reminder timing before due date
 */

'use client';

interface ReminderSelectorProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  disabled?: boolean;
}

const REMINDER_OPTIONS = [
  { value: null, label: 'No reminder' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];

export function ReminderSelector({ 
  value, 
  onChange, 
  disabled = false 
}: ReminderSelectorProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === '' ? null : parseInt(val, 10));
      }}
      disabled={disabled}
      className="px-3 py-2 border border-gray-300 rounded-lg 
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 bg-white text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Set reminder notification"
    >
      {REMINDER_OPTIONS.map(option => (
        <option key={option.value ?? 'none'} value={option.value ?? ''}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
