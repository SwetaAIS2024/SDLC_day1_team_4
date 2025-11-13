// Shared types for client and server
export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080 | null;

export interface TagResponse {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  recurrence_pattern: RecurrencePattern | null;
  due_date: string | null;
  reminder_minutes: ReminderMinutes;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoWithSubtasks extends Todo {
  subtasks: Subtask[];
  progress: number; // 0-100 percentage
  tags?: TagResponse[];
}

export interface NotificationPayload {
  todo_id: number;
  title: string;
  message: string;
  priority: Priority;
  due_date: string;
}

// Priority configuration
export const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    color: 'bg-red-100 text-red-800 border-red-200',
    sortOrder: 1
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    sortOrder: 2
  },
  low: {
    label: 'Low',
    color: 'bg-green-100 text-green-800 border-green-200',
    sortOrder: 3
  }
} as const;

// Recurrence configuration
export const RECURRENCE_CONFIG = {
  daily: {
    label: 'Daily',
    icon: '📅',
    description: 'Repeats every day'
  },
  weekly: {
    label: 'Weekly',
    icon: '📆',
    description: 'Repeats every week on the same day'
  },
  monthly: {
    label: 'Monthly',
    icon: '🗓️',
    description: 'Repeats every month on the same date'
  },
  yearly: {
    label: 'Yearly',
    icon: '📋',
    description: 'Repeats every year on the same date'
  }
} as const;

// Reminder configuration
export const REMINDER_CONFIG = {
  15: {
    label: '15 minutes before',
    shortLabel: '15m',
    minutes: 15,
    description: 'Notify 15 minutes before due time'
  },
  30: {
    label: '30 minutes before',
    shortLabel: '30m',
    minutes: 30,
    description: 'Notify 30 minutes before due time'
  },
  60: {
    label: '1 hour before',
    shortLabel: '1h',
    minutes: 60,
    description: 'Notify 1 hour before due time'
  },
  120: {
    label: '2 hours before',
    shortLabel: '2h',
    minutes: 120,
    description: 'Notify 2 hours before due time'
  },
  1440: {
    label: '1 day before',
    shortLabel: '1d',
    minutes: 1440,
    description: 'Notify 1 day before due time'
  },
  2880: {
    label: '2 days before',
    shortLabel: '2d',
    minutes: 2880,
    description: 'Notify 2 days before due time'
  },
  10080: {
    label: '1 week before',
    shortLabel: '1w',
    minutes: 10080,
    description: 'Notify 1 week before due time'
  }
} as const;
