// Type definitions for Recurring Todos feature
// Add these types to your existing lib/db.ts file

/**
 * Recurrence pattern for todos
 * - daily: Repeats every day
 * - weekly: Repeats every 7 days
 * - monthly: Repeats every month (same day)
 * - yearly: Repeats every year (same date)
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Extended Todo interface with recurrence support
 * Add recurrence_pattern field to your existing Todo interface
 */
export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  recurrence_pattern: RecurrencePattern | null; // NEW FIELD
  reminder_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Todo with all relationships (tags, subtasks)
 */
export interface TodoWithRelations extends Todo {
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  subtasks: Array<{
    id: number;
    todo_id: number;
    title: string;
    completed: boolean;
    position: number;
  }>;
}

/**
 * Response type when completing a recurring todo
 */
export interface RecurringTodoCompletionResponse {
  completed_todo: TodoWithRelations;
  next_instance: TodoWithRelations;
}
