/**
 * Database Migration for Recurring Todos Feature
 * 
 * This migration adds the recurrence_pattern column to the todos table.
 * Run this AFTER your existing database initialization in lib/db.ts
 */

import Database from 'better-sqlite3';

export function migrateRecurringTodos(db: Database.Database): void {
  try {
    // Add recurrence_pattern column to todos table
    db.exec(`
      ALTER TABLE todos 
      ADD COLUMN recurrence_pattern TEXT;
    `);
    
    console.log('✅ Migration: Added recurrence_pattern column to todos table');
  } catch (error: any) {
    // Column might already exist
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️  Migration: recurrence_pattern column already exists, skipping');
    } else {
      throw error;
    }
  }
}

/**
 * Add this to your existing database initialization in lib/db.ts:
 * 
 * // After creating the todos table
 * db.exec(`
 *   CREATE TABLE IF NOT EXISTS todos (
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     user_id INTEGER NOT NULL,
 *     title TEXT NOT NULL,
 *     completed INTEGER DEFAULT 0,
 *     priority TEXT DEFAULT 'medium',
 *     due_date TEXT,
 *     recurrence_pattern TEXT,  -- ADD THIS LINE
 *     reminder_minutes INTEGER,
 *     completed_at TEXT,
 *     created_at TEXT DEFAULT (datetime('now')),
 *     updated_at TEXT DEFAULT (datetime('now')),
 *     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
 *   );
 * `);
 * 
 * // Or run migration for existing database
 * migrateRecurringTodos(db);
 */
