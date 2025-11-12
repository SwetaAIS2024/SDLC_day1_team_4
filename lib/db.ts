/**
 * Database Layer - Single Source of Truth
 * Per copilot-instructions.md Pattern #2
 * All database interfaces and CRUD operations in one file
 */

import Database from 'better-sqlite3';
import { getSingaporeNow } from './timezone';

// Database file in project root
const db = new Database('todos.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// TypeScript Types
export type Priority = 'low' | 'medium' | 'high';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed_at: string | null;
  due_date: string | null; // YYYY-MM-DD format
  created_at: string;
  updated_at: string;
  priority: Priority | null;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
}

export interface CreateTodoInput {
  title: string;
  due_date?: string | null;
  priority?: Priority;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
}

export interface UpdateTodoInput {
  title?: string;
  completed_at?: string | null;
  due_date?: string | null;
  priority?: Priority;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
}

// Initialize Database Schema
db.exec(`
  -- Users table (stub for PRP-11)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Todos table
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL CHECK(length(title) >= 1 AND length(title) <= 500),
    completed_at TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);

  -- Create default user for development (will be replaced by WebAuthn in PRP-11)
  INSERT OR IGNORE INTO users (id, username) VALUES (1, 'dev-user');
`);

// Todo CRUD Operations
export const todoDB = {
  /**
   * Create new todo
   * All DB operations are synchronous (better-sqlite3)
   */
  create: (userId: number, input: CreateTodoInput): Todo => {
    const now = getSingaporeNow().toISOString();
    const stmt = db.prepare(`
      INSERT INTO todos (
        user_id, title, due_date, created_at, updated_at,
        priority, recurrence_pattern, reminder_minutes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      input.title,
      input.due_date || null,
      now,
      now,
      input.priority || null,
      input.recurrence_pattern || null,
      input.reminder_minutes || null
    );

    const todo = todoDB.getById(userId, result.lastInsertRowid as number);
    if (!todo) throw new Error('Failed to retrieve created todo');
    return todo;
  },

  /**
   * Get all todos for a user
   * Sorted by creation date (newest first)
   */
  getAll: (userId: number): Todo[] => {
    const stmt = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Todo[];
  },

  /**
   * Get single todo by ID
   * Returns null if not found or doesn't belong to user
   */
  getById: (userId: number, todoId: number): Todo | null => {
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?');
    return (stmt.get(todoId, userId) as Todo) || null;
  },

  /**
   * Update todo with dynamic field updates
   * Only updates fields present in input object
   */
  update: (userId: number, todoId: number, input: UpdateTodoInput): Todo | null => {
    const now = getSingaporeNow().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    // Build dynamic UPDATE query based on provided fields
    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(input.completed_at);
    }
    if (input.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(input.due_date);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }
    if (input.recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?');
      values.push(input.recurrence_pattern);
    }
    if (input.reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?');
      values.push(input.reminder_minutes);
    }

    // If no fields to update, just return current todo
    if (updates.length === 0) return todoDB.getById(userId, todoId);

    // Always update updated_at timestamp
    updates.push('updated_at = ?');
    values.push(now);
    values.push(todoId, userId);

    const stmt = db.prepare(`
      UPDATE todos
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(...values);
    return todoDB.getById(userId, todoId);
  },

  /**
   * Delete todo
   * Returns true if deleted, false if not found
   */
  delete: (userId: number, todoId: number): boolean => {
    const stmt = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?');
    const result = stmt.run(todoId, userId);
    return result.changes > 0;
  },
};

// Export database instance for advanced usage if needed
export { db };
