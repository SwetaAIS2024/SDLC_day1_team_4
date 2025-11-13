import { Priority, PRIORITY_CONFIG } from '@/lib/types';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  disabled?: boolean;
}

export function PrioritySelector({ value, onChange, disabled = false }: PrioritySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      disabled={disabled}
      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
        <option key={key} value={key}>
          {config.label}
        </option>
      ))}
    </select>
  );
}
