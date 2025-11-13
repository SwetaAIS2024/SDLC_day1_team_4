import Database from 'better-sqlite3';
import { getSingaporeNow } from './timezone';
import { Priority, RecurrencePattern, ReminderMinutes, PRIORITY_CONFIG, Holiday } from './types';

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
    completed_at TEXT,
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
  CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);
  CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
  CREATE INDEX IF NOT EXISTS idx_todos_user_priority ON todos(user_id, priority, completed_at);
  CREATE INDEX IF NOT EXISTS idx_todos_recurrence ON todos(recurrence_pattern);
  CREATE INDEX IF NOT EXISTS idx_todos_user_due_date ON todos(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_reminders ON todos(user_id, due_date, reminder_minutes, last_notification_sent);

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL,
    title TEXT NOT NULL CHECK(length(title) <= 200),
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
`);

// Migrations are handled inline - no separate migration needed as schema uses IF NOT EXISTS

// Create index for priority-based queries
db.exec(`CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)`);

// Migration: Add updated_at column to subtasks table if it doesn't exist
try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`);
} catch (error: any) {
  // Column already exists or other error - ignore
  if (!error.message?.includes('duplicate column name')) {
    // Log unexpected errors but don't crash
    console.error('Migration warning:', error.message);
  }
}

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
export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string; // Hex format: #RRGGBB
  created_at: string;
  updated_at: string;
}

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
  user_id: number;
  title: string;
  completed_at: string | null;
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
  completed_at?: string | null;
  priority?: Priority;
  recurrence_pattern?: RecurrencePattern | null;
  due_date?: string | null;
  reminder_minutes?: ReminderMinutes;
  last_notification_sent?: string | null;
}

export interface TodoWithSubtasks extends Todo {
  subtasks: Subtask[];
  progress: number; // 0-100 percentage
  tags?: TagResponse[];
}

// Template System Interfaces
export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: ReminderMinutes;
  due_date_offset_days: number | null;
  subtasks_json: string | null; // JSON string
  created_at: string;
}

export interface TemplateWithTags extends Template {
  tags: TagResponse[];
}

export interface TemplateSubtask {
  title: string;
  position: number;
}

export interface TodoResponse {
  id: number;
  title: string;
  completed_at: string | null;
  priority: Priority;
  recurrence_pattern: RecurrencePattern | null;
  due_date: string | null;
  reminder_minutes: ReminderMinutes;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to convert database row to Todo object
function rowToTodo(row: any): Todo {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    completed_at: row.completed_at,
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
    completed_at: todo.completed_at,
    priority: todo.priority,
    recurrence_pattern: todo.recurrence_pattern,
    due_date: todo.due_date,
    reminder_minutes: todo.reminder_minutes,
    last_notification_sent: todo.last_notification_sent,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  };
}

// Helper function to convert database row to Subtask object
function rowToSubtask(row: any): Subtask {
  return {
    id: row.id,
    todo_id: row.todo_id,
    title: row.title,
    completed: row.completed === 1,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Calculate progress percentage for a todo based on its subtasks
function calculateProgress(subtasks: Subtask[]): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter(s => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
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

    if (input.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(input.completed_at);
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
        AND completed_at IS NULL
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
  },

  // Get todos with subtasks
  getAllWithSubtasks: (userId: number): TodoWithSubtasks[] => {
    const todos = todoDB.getAll(userId);
    return todos.map(todo => {
      const subtasks = subtaskDB.getByTodoId(todo.id);
      const tags = tagDB.getByTodoId(todo.id);
      return {
        ...todo,
        subtasks,
        tags,
        progress: calculateProgress(subtasks),
      };
    });
  },

  // Get a single todo with subtasks
  getByIdWithSubtasks: (userId: number, todoId: number): TodoWithSubtasks | null => {
    const todo = todoDB.getById(userId, todoId);
    if (!todo) return null;
    
    const subtasks = subtaskDB.getByTodoId(todoId);
    const tags = tagDB.getByTodoId(todoId);
    return {
      ...todo,
      subtasks,
      tags,
      progress: calculateProgress(subtasks),
    };
  },

  // Get todos with subtasks by date range (for calendar view)
  getTodosByDateRange: (userId: number, startDate: string, endDate: string): TodoWithSubtasks[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos
      WHERE user_id = ?
        AND due_date IS NOT NULL
        AND due_date >= ?
        AND due_date <= ?
      ORDER BY due_date ASC, priority DESC
    `);
    const rows = stmt.all(userId, startDate, endDate);
    const todos = rows.map(rowToTodo);
    
    // Add subtasks and tags to each todo
    return todos.map(todo => {
      const subtasks = subtaskDB.getByTodoId(todo.id);
      const tags = tagDB.getByTodoId(todo.id);
      return {
        ...todo,
        subtasks,
        tags,
        progress: calculateProgress(subtasks),
      };
    });
  },

  // Get count of todos by priority (only incomplete todos)
  getCountByPriority: (userId: number): Record<Priority, number> => {
    const stmt = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM todos
      WHERE user_id = ? AND completed_at IS NULL
      GROUP BY priority
    `);
    const rows = stmt.all(userId) as Array<{ priority: Priority; count: number }>;
    
    // Initialize counts for all priorities
    const counts: Record<Priority, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };
    
    // Fill in actual counts
    rows.forEach(row => {
      counts[row.priority] = row.count;
    });
    
    return counts;
  }
};

// Subtask CRUD Operations
export const subtaskDB = {
  // Create a new subtask
  create: (todoId: number, title: string, position?: number): Subtask => {
    const now = getSingaporeNow().toISO();
    
    // If position not provided, get the max position and add 1
    if (position === undefined) {
      const maxPosStmt = db.prepare(`
        SELECT COALESCE(MAX(position), -1) as max_position
        FROM subtasks
        WHERE todo_id = ?
      `);
      const result = maxPosStmt.get(todoId) as any;
      position = result.max_position + 1;
    }

    const stmt = db.prepare(`
      INSERT INTO subtasks (todo_id, title, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertResult = stmt.run(todoId, title, position, now, now);
    return subtaskDB.getById(insertResult.lastInsertRowid as number)!;
  },

  // Get all subtasks for a todo
  getByTodoId: (todoId: number): Subtask[] => {
    const stmt = db.prepare(`
      SELECT * FROM subtasks
      WHERE todo_id = ?
      ORDER BY position ASC, created_at ASC
    `);
    const rows = stmt.all(todoId);
    return rows.map(rowToSubtask);
  },

  // Get a single subtask by ID
  getById: (subtaskId: number): Subtask | null => {
    const stmt = db.prepare(`SELECT * FROM subtasks WHERE id = ?`);
    const row = stmt.get(subtaskId);
    return row ? rowToSubtask(row) : null;
  },

  // Update a subtask
  update: (subtaskId: number, updates: { title?: string; completed?: boolean; position?: number }): Subtask | null => {
    const subtask = subtaskDB.getById(subtaskId);
    if (!subtask) return null;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }

    if (updates.completed !== undefined) {
      updateFields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }

    if (updates.position !== undefined) {
      updateFields.push('position = ?');
      values.push(updates.position);
    }

    if (updateFields.length === 0) return subtask;

    const now = getSingaporeNow().toISO();
    updateFields.push('updated_at = ?');
    values.push(now);

    values.push(subtaskId);

    const stmt = db.prepare(`
      UPDATE subtasks
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return subtaskDB.getById(subtaskId);
  },

  // Delete a subtask
  delete: (subtaskId: number): boolean => {
    const stmt = db.prepare(`DELETE FROM subtasks WHERE id = ?`);
    const result = stmt.run(subtaskId);
    return result.changes > 0;
  },

  // Delete all subtasks for a todo (called automatically by CASCADE)
  deleteByTodoId: (todoId: number): boolean => {
    const stmt = db.prepare(`DELETE FROM subtasks WHERE todo_id = ?`);
    const result = stmt.run(todoId);
    return result.changes > 0;
  },

  // Get count of subtasks for a todo
  getCount: (todoId: number): number => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM subtasks WHERE todo_id = ?
    `);
    const result = stmt.get(todoId) as any;
    return result.count;
  },

  // Get count of completed subtasks for a todo
  getCompletedCount: (todoId: number): number => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM subtasks WHERE todo_id = ? AND completed = 1
    `);
    const result = stmt.get(todoId) as any;
    return result.count;
  }
};

// Helper function to convert database row to Tag object
function rowToTag(row: any): Tag {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    color: row.color,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Helper function to convert Tag to TagResponse (exclude user_id)
function tagToResponse(tag: Tag): TagResponse {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    created_at: tag.created_at,
    updated_at: tag.updated_at,
  };
}

// Tag CRUD Operations
export const tagDB = {
  // Create a new tag
  create: (userId: number, name: string, color: string = '#3B82F6'): Tag => {
    const now = getSingaporeNow().toISO();
    const stmt = db.prepare(`
      INSERT INTO tags (user_id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, name.trim(), color, now, now);
    return tagDB.getById(userId, result.lastInsertRowid as number)!;
  },

  // Get all tags for a user
  getAll: (userId: number): Tag[] => {
    const stmt = db.prepare(`
      SELECT * FROM tags
      WHERE user_id = ?
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(userId);
    return rows.map(rowToTag);
  },

  // Get a single tag by ID
  getById: (userId: number, tagId: number): Tag | null => {
    const stmt = db.prepare(`
      SELECT * FROM tags
      WHERE id = ? AND user_id = ?
    `);
    const row = stmt.get(tagId, userId);
    return row ? rowToTag(row) : null;
  },

  // Update a tag
  update: (userId: number, tagId: number, updates: { name?: string; color?: string }): Tag | null => {
    const tag = tagDB.getById(userId, tagId);
    if (!tag) return null;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name.trim());
    }

    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      values.push(updates.color);
    }

    if (updateFields.length === 0) return tag;

    const now = getSingaporeNow().toISO();
    updateFields.push('updated_at = ?');
    values.push(now);

    values.push(tagId);
    values.push(userId);

    const stmt = db.prepare(`
      UPDATE tags
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(...values);

    return tagDB.getById(userId, tagId);
  },

  // Delete a tag (CASCADE removes from todo_tags)
  delete: (userId: number, tagId: number): boolean => {
    const stmt = db.prepare(`
      DELETE FROM tags
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(tagId, userId);
    return result.changes > 0;
  },

  // Check if tag name already exists for user (case-insensitive)
  existsByName: (userId: number, name: string, excludeId?: number): boolean => {
    let stmt;
    let result;
    
    if (excludeId) {
      stmt = db.prepare(`
        SELECT COUNT(*) as count FROM tags 
        WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id != ?
      `);
      result = stmt.get(userId, name.trim(), excludeId) as any;
    } else {
      stmt = db.prepare(`
        SELECT COUNT(*) as count FROM tags 
        WHERE user_id = ? AND LOWER(name) = LOWER(?)
      `);
      result = stmt.get(userId, name.trim()) as any;
    }
    
    return result.count > 0;
  },

  // Get tags for a specific todo
  getByTodoId: (todoId: number): TagResponse[] => {
    const stmt = db.prepare(`
      SELECT t.id, t.name, t.color, t.created_at, t.updated_at
      FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.created_at ASC
    `);
    const rows = stmt.all(todoId);
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  // Get count of todos using a tag
  getTodoCount: (tagId: number): number => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM todo_tags WHERE tag_id = ?
    `);
    const result = stmt.get(tagId) as any;
    return result.count;
  },
};

// Todo-Tag Association Operations
export const todoTagDB = {
  // Add a tag to a todo
  add: (todoId: number, tagId: number): boolean => {
    const now = getSingaporeNow().toISO();
    try {
      const stmt = db.prepare(`
        INSERT INTO todo_tags (todo_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(todoId, tagId, now);
      return true;
    } catch (e: any) {
      // Already exists or constraint violation
      return false;
    }
  },

  // Remove a tag from a todo
  remove: (todoId: number, tagId: number): boolean => {
    const stmt = db.prepare(`
      DELETE FROM todo_tags
      WHERE todo_id = ? AND tag_id = ?
    `);
    const result = stmt.run(todoId, tagId);
    return result.changes > 0;
  },

  // Remove all tags from a todo
  removeAll: (todoId: number): boolean => {
    const stmt = db.prepare(`
      DELETE FROM todo_tags
      WHERE todo_id = ?
    `);
    const result = stmt.run(todoId);
    return result.changes > 0;
  },

  // Set tags for a todo (replace all existing tags)
  setTags: (todoId: number, tagIds: number[]): boolean => {
    // Use a transaction to ensure atomicity
    const removeStmt = db.prepare(`DELETE FROM todo_tags WHERE todo_id = ?`);
    const insertStmt = db.prepare(`
      INSERT INTO todo_tags (todo_id, tag_id, created_at)
      VALUES (?, ?, ?)
    `);

    try {
      db.transaction(() => {
        // Remove all existing tags
        removeStmt.run(todoId);
        
        // Add new tags
        const now = getSingaporeNow().toISO();
        for (const tagId of tagIds) {
          insertStmt.run(todoId, tagId, now);
        }
      })();
      
      return true;
    } catch (e) {
      console.error('Error setting tags:', e);
      return false;
    }
  },

  // Get all tag IDs for a todo
  getTagIds: (todoId: number): number[] => {
    const stmt = db.prepare(`
      SELECT tag_id FROM todo_tags WHERE todo_id = ?
    `);
    const rows = stmt.all(todoId) as any[];
    return rows.map(row => row.tag_id);
  },
};

// Template Operations
export const templateDB = {
  // Helper function to convert DB row to Template object
  rowToTemplate: (row: any): Template => {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category,
      priority: row.priority as Priority,
      recurrence_pattern: row.recurrence_pattern as RecurrencePattern | null,
      reminder_minutes: row.reminder_minutes,
      due_date_offset_days: row.due_date_offset_days,
      subtasks_json: row.subtasks_json,
      created_at: row.created_at,
    };
  },

  // Create a new template
  create: (template: Omit<Template, 'id' | 'created_at'>): Template | null => {
    const stmt = db.prepare(`
      INSERT INTO templates 
      (user_id, name, description, category, priority, recurrence_pattern, 
       reminder_minutes, due_date_offset_days, subtasks_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = getSingaporeNow().toISO();
    const result = stmt.run(
      template.user_id,
      template.name,
      template.description,
      template.category,
      template.priority,
      template.recurrence_pattern,
      template.reminder_minutes,
      template.due_date_offset_days,
      template.subtasks_json
    );
    
    return templateDB.getById(template.user_id, Number(result.lastInsertRowid));
  },

  // Get template by ID
  getById: (userId: number, templateId: number): Template | null => {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?');
    const row = stmt.get(templateId, userId) as any;
    return row ? templateDB.rowToTemplate(row) : null;
  },

  // Get template with tags
  getByIdWithTags: (userId: number, templateId: number): TemplateWithTags | null => {
    const template = templateDB.getById(userId, templateId);
    if (!template) return null;

    const tags = templateDB.getTags(templateId);
    return {
      ...template,
      tags,
    };
  },

  // Get all templates for a user
  getAll: (userId: number, category?: string): Template[] => {
    if (category) {
      const stmt = db.prepare(
        'SELECT * FROM templates WHERE user_id = ? AND category = ? ORDER BY created_at DESC'
      );
      const rows = stmt.all(userId, category) as any[];
      return rows.map(templateDB.rowToTemplate);
    }
    
    const stmt = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(templateDB.rowToTemplate);
  },

  // Get all templates with tags
  getAllWithTags: (userId: number, category?: string): TemplateWithTags[] => {
    const templates = templateDB.getAll(userId, category);
    return templates.map(template => ({
      ...template,
      tags: templateDB.getTags(template.id),
    }));
  },

  // Update template
  update: (userId: number, templateId: number, updates: Partial<Template>): Template | null => {
    // Filter out fields that shouldn't be updated
    const allowedFields = [
      'name', 'description', 'category', 'priority', 
      'recurrence_pattern', 'reminder_minutes', 'due_date_offset_days', 'subtasks_json'
    ];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
    
    if (fields.length === 0) {
      return templateDB.getById(userId, templateId);
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);
    
    const stmt = db.prepare(`UPDATE templates SET ${setClause} WHERE id = ? AND user_id = ?`);
    stmt.run(...values, templateId, userId);
    
    return templateDB.getById(userId, templateId);
  },

  // Delete template
  delete: (userId: number, templateId: number): boolean => {
    const stmt = db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?');
    const result = stmt.run(templateId, userId);
    return result.changes > 0;
  },

  // Add tag to template
  addTag: (templateId: number, tagId: number): boolean => {
    const now = getSingaporeNow().toISO();
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO template_tags (template_id, tag_id, created_at) VALUES (?, ?, ?)');
      stmt.run(templateId, tagId, now);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Remove tag from template
  removeTag: (templateId: number, tagId: number): boolean => {
    const stmt = db.prepare('DELETE FROM template_tags WHERE template_id = ? AND tag_id = ?');
    const result = stmt.run(templateId, tagId);
    return result.changes > 0;
  },

  // Get all tags for a template
  getTags: (templateId: number): TagResponse[] => {
    const stmt = db.prepare(`
      SELECT t.id, t.name, t.color, t.created_at, t.updated_at
      FROM tags t
      INNER JOIN template_tags tt ON t.id = tt.tag_id
      WHERE tt.template_id = ?
      ORDER BY t.name
    `);
    const rows = stmt.all(templateId) as any[];
    return rows;
  },

  // Set all tags for a template (replace existing)
  setTags: (templateId: number, tagIds: number[]): boolean => {
    const removeStmt = db.prepare('DELETE FROM template_tags WHERE template_id = ?');
    const insertStmt = db.prepare('INSERT INTO template_tags (template_id, tag_id, created_at) VALUES (?, ?, ?)');

    try {
      db.transaction(() => {
        // Remove all existing tags
        removeStmt.run(templateId);
        
        // Add new tags
        const now = getSingaporeNow().toISO();
        for (const tagId of tagIds) {
          insertStmt.run(templateId, tagId, now);
        }
      })();
      
      return true;
    } catch (e) {
      console.error('Error setting template tags:', e);
      return false;
    }
  },

  // Get count of templates by user
  getCount: (userId: number): number => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM templates WHERE user_id = ?');
    const result = stmt.get(userId) as any;
    return result.count;
  },
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

// Holiday operations
export const holidayDB = {
  // Get holidays for a specific month and year
  getHolidaysByMonth: (year: number, month: number): Holiday[] => {
    const monthStr = month.toString().padStart(2, '0');
    const stmt = db.prepare(`
      SELECT * FROM holidays
      WHERE (year = ? OR is_recurring = 1)
        AND strftime('%m', date) = ?
      ORDER BY date ASC
    `);
    const rows = stmt.all(year, monthStr) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
      year: row.year,
      is_recurring: Boolean(row.is_recurring),
      created_at: row.created_at,
    }));
  },

  // Get holiday by specific date
  getHolidayByDate: (date: string): Holiday | null => {
    const year = parseInt(date.split('-')[0]);
    const stmt = db.prepare(`
      SELECT * FROM holidays
      WHERE date = ? AND (year = ? OR is_recurring = 1)
      LIMIT 1
    `);
    const row = stmt.get(date, year) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      year: row.year,
      is_recurring: Boolean(row.is_recurring),
      created_at: row.created_at,
    };
  },

  // Get all holidays for a specific year
  getAllHolidays: (year: number): Holiday[] => {
    const stmt = db.prepare(`
      SELECT * FROM holidays
      WHERE year = ? OR is_recurring = 1
      ORDER BY date ASC
    `);
    const rows = stmt.all(year) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
      year: row.year,
      is_recurring: Boolean(row.is_recurring),
      created_at: row.created_at,
    }));
  },
};

export { db };
