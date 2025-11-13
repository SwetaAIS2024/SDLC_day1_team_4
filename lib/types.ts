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

// Search & Filtering types
export type FilterStatus = 'all' | 'completed' | 'incomplete';
export type FilterDueDateRange = 'all' | 'today' | 'this-week' | 'this-month' | 'overdue' | 'no-due-date';

export interface SearchFilters {
  searchTerm: string;
  advancedSearch: boolean; // Include tags in search
  status: FilterStatus;
  priorities: Priority[]; // Multi-select
  tagIds: number[]; // Multi-select
  dueDateRange: FilterDueDateRange;
}

export interface FilterStats {
  totalTodos: number;
  filteredTodos: number;
  activeFilterCount: number;
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

// Export & Import types
export interface ExportOptions {
  includeTodos: boolean;
  includeTags: boolean;
  includeTemplates: boolean;
  includeCompleted?: boolean;
}

export interface ImportOptions {
  mergeDuplicateTags: boolean;
  skipDuplicateTemplates: boolean;
  conflictResolution?: {
    tags?: Record<string, 'keep_existing' | 'use_imported' | 'create_new'>;
    templates?: Record<string, 'skip' | 'replace' | 'rename'>;
  };
}

export interface ImportProgress {
  stage: 'validating' | 'importing_tags' | 'importing_templates' | 'importing_todos' | 'complete';
  progress: number; // 0-100
  currentItem?: string;
}

export interface ExportedSubtask {
  original_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ExportedTodo {
  original_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  recurrence_pattern: RecurrencePattern | null;
  due_date: string | null;
  reminder_minutes: number | null;
  created_at: string;
  updated_at: string;
  subtasks: ExportedSubtask[];
  tag_ids: number[];
}

export interface ExportedTag {
  original_id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ExportedTemplate {
  original_id: number;
  name: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_days: number | null;
  subtasks_json: string;
  tag_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface ExportData {
  version: string;
  exported_at: string;
  exported_by: string;
  data: {
    todos: ExportedTodo[];
    tags: ExportedTag[];
    templates: ExportedTemplate[];
  };
  metadata: {
    todo_count: number;
    tag_count: number;
    template_count: number;
    subtask_count: number;
  };
}

export interface ImportError {
  type: 'validation' | 'database' | 'constraint';
  entity: 'todo' | 'tag' | 'template' | 'subtask';
  original_id: number;
  field?: string;
  message: string;
}

export interface ImportWarning {
  type: 'duplicate' | 'conflict' | 'skipped';
  entity: 'todo' | 'tag' | 'template';
  original_id: number;
  message: string;
}

export interface ImportResult {
  success: boolean;
  statistics: {
    todos_imported: number;
    todos_skipped: number;
    subtasks_imported: number;
    tags_imported: number;
    tags_merged: number;
    tags_skipped: number;
    templates_imported: number;
    templates_skipped: number;
  };
  id_mapping: {
    todos: Record<number, number>;
    tags: Record<number, number>;
    templates: Record<number, number>;
  };
  errors: ImportError[];
  warnings: ImportWarning[];
}

// Calendar View Types
export interface Holiday {
  id: number;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  year: number;
  is_recurring: boolean;
  created_at?: string;
}

export interface CalendarViewState {
  viewDate: Date; // Currently viewed month
  selectedDate: Date | null; // Selected day for modal
  showDayModal: boolean;
  dayModalData: DayModalData | null;
}

export interface DayModalData {
  date: string; // YYYY-MM-DD
  dayName: string; // "Monday", "Tuesday", etc.
  isHoliday: boolean;
  holidayName?: string;
  todos: TodoWithSubtasks[];
  todoCount: number;
  completedCount: number;
}

export interface CalendarDayCell {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  todos: Todo[];
  todoCount: number;
  highPriorityCount: number;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDayCell[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  monthName: string;
  weeks: CalendarWeek[];
}

export interface CalendarData {
  month: number;
  year: number;
  monthName: string;
  daysInMonth: number;
  firstDayOfWeek: number; // 0-6 (Sunday-Saturday)
  todos: TodoWithSubtasks[];
  holidays: Holiday[];
}
