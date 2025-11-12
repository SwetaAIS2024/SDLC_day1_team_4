import Database from 'better-sqlite3';
import { getSingaporeNow } from './timezone';
import { Priority, RecurrencePattern, ReminderMinutes, PRIORITY_CONFIG } from './types';

const db = new Database('todos.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL CHECK(length(title) <= 500),
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    due_date TEXT,
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
  CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
  CREATE INDEX IF NOT EXISTS idx_todos_user_priority ON todos(user_id, priority, completed);
  CREATE INDEX IF NOT EXISTS idx_todos_recurrence ON todos(recurrence_pattern);
  CREATE INDEX IF NOT EXISTS idx_todos_user_due_date ON todos(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_reminders ON todos(user_id, due_date, reminder_minutes, last_notification_sent);
`);

// Add priority column to existing tables (migration)
try {
  db.exec(`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'`);
  console.log('✓ Added priority column to todos table');
} catch (e: any) {
  // Column already exists or other error
  if (!e.message?.includes('duplicate column name')) {
    console.warn('Warning during migration:', e.message);
  }
}

// Add recurrence_pattern column to existing tables (migration)
try {
  db.exec(`ALTER TABLE todos ADD COLUMN recurrence_pattern TEXT`);
  console.log('✓ Added recurrence_pattern column to todos table');
} catch (e: any) {
  // Column already exists
  if (!e.message?.includes('duplicate column name')) {
    console.warn('Warning during migration:', e.message);
  }
}

// Add reminder columns to existing tables (migration)
try {
  db.exec(`ALTER TABLE todos ADD COLUMN reminder_minutes INTEGER`);
  console.log('✓ Added reminder_minutes column to todos table');
} catch (e: any) {
  // Column already exists
  if (!e.message?.includes('duplicate column name')) {
    console.warn('Warning during migration:', e.message);
  }
}

try {
  db.exec(`ALTER TABLE todos ADD COLUMN last_notification_sent TEXT`);
  console.log('✓ Added last_notification_sent column to todos table');
} catch (e: any) {
  // Column already exists
  if (!e.message?.includes('duplicate column name')) {
    console.warn('Warning during migration:', e.message);
  }
}

// Update any NULL priorities to 'medium' (for safety)
try {
  db.exec(`UPDATE todos SET priority = 'medium' WHERE priority IS NULL OR priority = ''`);
} catch (e) {
  // Ignore if priority column doesn't exist yet
}

// Re-export types from types.ts for convenience
export type { Priority, RecurrencePattern, ReminderMinutes, NotificationPayload } from './types';

// TypeScript Interfaces
export interface Todo {
  id: number;
  user_id: number;
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

export interface CreateTodoInput {
  title: string;
  priority?: Priority;
  recurrence_pattern?: RecurrencePattern | null;
  due_date?: string | null;
  reminder_minutes?: ReminderMinutes;
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  priority?: Priority;
  recurrence_pattern?: RecurrencePattern | null;
  due_date?: string | null;
  reminder_minutes?: ReminderMinutes;
  last_notification_sent?: string | null;
}

export interface TodoResponse {
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

export interface TodoResponse {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to convert database row to Todo object
function rowToTodo(row: any): Todo {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    completed: row.completed === 1,
    priority: row.priority as Priority,
    recurrence_pattern: row.recurrence_pattern as RecurrencePattern | null,
    due_date: row.due_date,
    reminder_minutes: row.reminder_minutes as ReminderMinutes,
    last_notification_sent: row.last_notification_sent,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Helper function to convert Todo to TodoResponse (exclude user_id)
export function todoToResponse(todo: Todo): TodoResponse {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    priority: todo.priority,
    recurrence_pattern: todo.recurrence_pattern,
    due_date: todo.due_date,
    reminder_minutes: todo.reminder_minutes,
    last_notification_sent: todo.last_notification_sent,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  };
}

// Todo CRUD Operations
export const todoDB = {
  // Create a new todo
  create: (userId: number, input: CreateTodoInput): Todo => {
    const now = getSingaporeNow().toISO();
    const priority = input.priority || 'medium';
    const stmt = db.prepare(`
      INSERT INTO todos (user_id, title, priority, recurrence_pattern, due_date, reminder_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId, 
      input.title, 
      priority, 
      input.recurrence_pattern || null, 
      input.due_date || null,
      input.reminder_minutes || null, 
      now, 
      now
    );
    return todoDB.getById(userId, result.lastInsertRowid as number)!;
  },

  // Get all todos for a user
  getAll: (userId: number): Todo[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId);
    return rows.map(rowToTodo);
  },

  // Get a single todo by ID
  getById: (userId: number, todoId: number): Todo | null => {
    const stmt = db.prepare(`
      SELECT * FROM todos
      WHERE id = ? AND user_id = ?
    `);
    const row = stmt.get(todoId, userId);
    return row ? rowToTodo(row) : null;
  },

  // Update a todo
  update: (userId: number, todoId: number, input: UpdateTodoInput): Todo | null => {
    const todo = todoDB.getById(userId, todoId);
    if (!todo) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }

    if (input.completed !== undefined) {
      updates.push('completed = ?');
      values.push(input.completed ? 1 : 0);
    }

    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }

    if (input.recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?');
      values.push(input.recurrence_pattern);
    }

    if (input.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(input.due_date);
      // Clear last_notification_sent when due date changes
      if (todo.reminder_minutes) {
        updates.push('last_notification_sent = ?');
        values.push(null);
      }
    }

    if (input.reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?');
      values.push(input.reminder_minutes);
      // Clear last_notification_sent when reminder changes
      updates.push('last_notification_sent = ?');
      values.push(null);
    }

    if (input.last_notification_sent !== undefined) {
      updates.push('last_notification_sent = ?');
      values.push(input.last_notification_sent);
    }

    if (updates.length === 0) return todo;

    const now = getSingaporeNow().toISO();
    updates.push('updated_at = ?');
    values.push(now);

    values.push(todoId);
    values.push(userId);

    const stmt = db.prepare(`
      UPDATE todos
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(...values);

    return todoDB.getById(userId, todoId);
  },

  // Delete a todo
  delete: (userId: number, todoId: number): boolean => {
    const stmt = db.prepare(`
      DELETE FROM todos
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(todoId, userId);
    return result.changes > 0;
  },

  // Get todos with pending notifications
  getPendingNotifications: (userId: number): Todo[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
        AND completed = 0
        AND due_date IS NOT NULL
        AND reminder_minutes IS NOT NULL
        AND last_notification_sent IS NULL
      ORDER BY due_date ASC
    `);
    const rows = stmt.all(userId);
    return rows.map(rowToTodo);
  },

  // Update notification sent timestamp
  updateNotificationSent: (id: number, timestamp: string): boolean => {
    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    const result = stmt.run(timestamp, id);
    return result.changes > 0;
  },

  // Get todos with reminders
  getWithReminders: (userId: number): Todo[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
        AND reminder_minutes IS NOT NULL
      ORDER BY due_date ASC
    `);
    const rows = stmt.all(userId);
    return rows.map(rowToTodo);
  },

  // Clear notification sent timestamp
  clearNotificationSent: (id: number): boolean => {
    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = NULL, updated_at = datetime('now')
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// User operations (basic for now)
export const userDB = {
  // Create a user (for development/testing)
  create: (username: string): number => {
    const stmt = db.prepare(`
      INSERT INTO users (username, created_at)
      VALUES (?, ?)
    `);
    const now = getSingaporeNow().toISO();
    const result = stmt.run(username, now);
    return result.lastInsertRowid as number;
  },

  // Get user by ID
  getById: (userId: number): { id: number; username: string } | null => {
    const stmt = db.prepare(`SELECT id, username FROM users WHERE id = ?`);
    const row = stmt.get(userId) as any;
    return row || null;
  },

  // Get user by username
  getByUsername: (username: string): { id: number; username: string } | null => {
    const stmt = db.prepare(`SELECT id, username FROM users WHERE username = ?`);
    const row = stmt.get(username) as any;
    return row || null;
  },
};

export { db };
