# PRP-01: Todo CRUD Operations

**Feature**: Core Todo Create, Read, Update, Delete Operations  
**Version**: 1.0  
**Last Updated**: November 12, 2025  
**Status**: Foundation Feature  
**Dependencies**: None (base feature)  
**Tech Stack**: Next.js 16 App Router, React 19, better-sqlite3, Tailwind CSS 4

---

## Feature Overview

The Todo CRUD Operations feature provides the fundamental create, read, update, and delete functionality for managing todo items in the application. This is the foundation upon which all other features are built.

**Key Capabilities:**
- Create new todo items with title and optional due date
- View all todos with real-time updates
- Update todo properties (title, due date, completion status)
- Delete individual todos
- Singapore timezone handling for all date/time operations
- Optimistic UI updates for responsive user experience
- Client-side validation with server-side enforcement

**Technical Approach:**
- **Frontend**: Next.js 16 App Router with React 19 client components, Tailwind CSS 4
- **Backend**: Next.js API routes (no separate server)
- **Database**: SQLite via better-sqlite3 (synchronous operations, no async/await)
- **Timezone**: Singapore (`Asia/Singapore`) for all date/time operations via `lib/timezone.ts`
- **Auth**: Session-based via JWT in HTTP-only cookies (WebAuthn integration in PRP-11)
- **Testing**: Playwright E2E tests with virtual authenticators

---

## User Stories

### Primary Users

**Story 1: Basic Todo Creation**
```
As a busy professional
I want to quickly add a new task to my todo list
So that I can capture important items without losing focus
```

**Story 2: Setting Due Dates**
```
As a project manager
I want to assign due dates to my tasks
So that I can track deadlines and prioritize work
```

**Story 3: Task Completion**
```
As a daily user
I want to mark tasks as complete when I finish them
So that I can track my progress and feel accomplished
```

**Story 4: Editing Task Details**
```
As a user who plans ahead
I want to update task titles and due dates as priorities change
So that my todo list stays current and accurate
```

**Story 5: Removing Completed Tasks**
```
As someone who likes a clean workspace
I want to delete tasks I no longer need
So that my todo list remains focused and manageable
```

---

## User Flow

### Flow 1: Creating a New Todo

```
1. User views the main todo list page
2. User clicks "Add Todo" button or presses input field
3. User enters todo title (required, 1-500 characters)
4. [Optional] User clicks calendar icon to select due date
5. [Optional] User selects date from date picker
6. User presses Enter or clicks "Add" button
7. System validates input client-side
8. UI immediately shows new todo (optimistic update)
9. System sends POST request to /api/todos
10. Server validates input and creates todo in database
11. Server returns created todo with ID and timestamp
12. UI updates with server-confirmed data
13. [Error case] If server fails, UI rolls back optimistic update and shows error
```

### Flow 2: Viewing Todos

```
1. User navigates to home page (/)
2. System checks for valid session (JWT cookie)
3. Page component mounts and fetches todos
4. GET request to /api/todos with user session
5. Server queries database for user's todos
6. Server returns todos sorted by created_at DESC
7. UI renders todo list with:
   - Title
   - Due date (if set, formatted in Singapore timezone)
   - Completion status checkbox
   - Edit and delete buttons
8. User sees real-time list of all their todos
```

### Flow 3: Updating a Todo

**A. Toggle Completion**
```
1. User clicks checkbox next to todo
2. UI immediately toggles visual state (optimistic)
3. System sends PUT request to /api/todos/[id]
4. Server updates completed_at timestamp (or sets to null)
5. Server returns updated todo
6. UI confirms update with server data
7. [Error case] If fails, checkbox reverts and error shown
```

**B. Edit Title/Due Date**
```
1. User clicks "Edit" button on todo
2. Todo row transforms into edit mode
3. User modifies title and/or due date
4. User clicks "Save" or presses Enter
5. System validates input client-side
6. UI shows updated values (optimistic)
7. System sends PUT request with changes
8. Server validates and updates database
9. Server returns updated todo
10. UI confirms with server data
11. [Error case] If validation fails, show error and allow correction
```

### Flow 4: Deleting a Todo

```
1. User clicks "Delete" (trash icon) button
2. [Optional] System shows confirmation dialog
3. User confirms deletion
4. UI immediately removes todo from list (optimistic)
5. System sends DELETE request to /api/todos/[id]
6. Server deletes todo from database
7. Server returns success response
8. [Error case] If fails, todo reappears and error shown
9. [Cascade] All associated subtasks are deleted automatically
```

---

## Technical Requirements

### Database Schema

**Table: `todos`**
```sql
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK(length(title) >= 1 AND length(title) <= 500),
  completed_at TEXT,  -- ISO 8601 timestamp in Singapore timezone
  due_date TEXT,      -- ISO 8601 date string (YYYY-MM-DD)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Future feature columns (nullable, implemented in other PRPs)
  priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);
```

**Note**: This schema includes columns for future features (priority, recurrence, reminders) to avoid migrations later. These fields are nullable and unused in this PRP.

### TypeScript Types

**File: `lib/db.ts`**
```typescript
export type Priority = 'low' | 'medium' | 'high';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed_at: string | null;
  due_date: string | null;  // YYYY-MM-DD format
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
```

### API Endpoints

#### 1. Create Todo
```typescript
POST /api/todos
Content-Type: application/json
Cookie: session=<jwt-token>

Request Body:
{
  "title": "Complete project proposal",
  "due_date": "2025-11-15"  // Optional, YYYY-MM-DD format
}

Success Response (201 Created):
{
  "id": 42,
  "user_id": 1,
  "title": "Complete project proposal",
  "completed_at": null,
  "due_date": "2025-11-15",
  "created_at": "2025-11-12T14:30:00+08:00",
  "updated_at": "2025-11-12T14:30:00+08:00",
  "priority": null,
  "recurrence_pattern": null,
  "reminder_minutes": null,
  "last_notification_sent": null
}

Error Responses:
400 Bad Request - { "error": "Title is required" }
400 Bad Request - { "error": "Title must be between 1 and 500 characters" }
400 Bad Request - { "error": "Invalid due_date format. Use YYYY-MM-DD" }
401 Unauthorized - { "error": "Not authenticated" }
500 Internal Server Error - { "error": "Failed to create todo" }
```

**Implementation Pattern (app/api/todos/route.ts):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { isValidDateFormat } from '@/lib/timezone';

export async function POST(request: NextRequest) {
  // Pattern from copilot-instructions.md: Always check auth first
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, due_date } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 500) {
      return NextResponse.json(
        { error: 'Title must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    if (due_date && !isValidDateFormat(due_date)) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Database operation (synchronous - no await needed)
    const todo = todoDB.create(session.userId, {
      title: title.trim(),
      due_date: due_date || null
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error('Failed to create todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
```

#### 2. Get All Todos
```typescript
GET /api/todos
Cookie: session=<jwt-token>

Success Response (200 OK):
{
  "todos": [
    {
      "id": 42,
      "user_id": 1,
      "title": "Complete project proposal",
      "completed_at": null,
      "due_date": "2025-11-15",
      "created_at": "2025-11-12T14:30:00+08:00",
      "updated_at": "2025-11-12T14:30:00+08:00",
      "priority": null,
      "recurrence_pattern": null,
      "reminder_minutes": null,
      "last_notification_sent": null
    },
    // ... more todos, sorted by created_at DESC
  ]
}

Error Responses:
401 Unauthorized - { "error": "Not authenticated" }
500 Internal Server Error - { "error": "Failed to fetch todos" }
```

**Implementation Pattern (app/api/todos/route.ts):**
```typescript
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Synchronous database call
    const todos = todoDB.getAll(session.userId);
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}
```

#### 3. Get Single Todo
```typescript
GET /api/todos/[id]
Cookie: session=<jwt-token>

Success Response (200 OK):
{
  "id": 42,
  "user_id": 1,
  "title": "Complete project proposal",
  "completed_at": null,
  "due_date": "2025-11-15",
  "created_at": "2025-11-12T14:30:00+08:00",
  "updated_at": "2025-11-12T14:30:00+08:00",
  "priority": null,
  "recurrence_pattern": null,
  "reminder_minutes": null,
  "last_notification_sent": null
}

Error Responses:
401 Unauthorized - { "error": "Not authenticated" }
404 Not Found - { "error": "Todo not found" }
500 Internal Server Error - { "error": "Failed to fetch todo" }
```

#### 4. Update Todo
```typescript
PUT /api/todos/[id]
Content-Type: application/json
Cookie: session=<jwt-token>

Request Body (all fields optional):
{
  "title": "Updated title",
  "completed_at": "2025-11-12T15:45:00+08:00",  // or null to mark incomplete
  "due_date": "2025-11-20"  // or null to remove due date
}

Success Response (200 OK):
{
  "id": 42,
  "user_id": 1,
  "title": "Updated title",
  "completed_at": "2025-11-12T15:45:00+08:00",
  "due_date": "2025-11-20",
  "created_at": "2025-11-12T14:30:00+08:00",
  "updated_at": "2025-11-12T15:45:00+08:00",
  "priority": null,
  "recurrence_pattern": null,
  "reminder_minutes": null,
  "last_notification_sent": null
}

Error Responses:
400 Bad Request - { "error": "Title must be between 1 and 500 characters" }
400 Bad Request - { "error": "Invalid due_date format. Use YYYY-MM-DD" }
401 Unauthorized - { "error": "Not authenticated" }
404 Not Found - { "error": "Todo not found" }
500 Internal Server Error - { "error": "Failed to update todo" }
```

**Implementation Pattern (app/api/todos/[id]/route.ts):**
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // CRITICAL: params is async in Next.js 16 (copilot-instructions.md pattern #4)
  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const body = await request.json();

    // Validation
    if (body.title !== undefined) {
      if (!body.title || body.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      if (body.title.length > 500) {
        return NextResponse.json(
          { error: 'Title must be between 1 and 500 characters' },
          { status: 400 }
        );
      }
    }

    if (body.due_date && !isValidDateFormat(body.due_date)) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Update (synchronous)
    const updated = todoDB.update(session.userId, todoId, body);
    
    if (!updated) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}
```

#### 5. Delete Todo
```typescript
DELETE /api/todos/[id]
Cookie: session=<jwt-token>

Success Response (200 OK):
{
  "success": true,
  "message": "Todo deleted successfully"
}

Error Responses:
401 Unauthorized - { "error": "Not authenticated" }
404 Not Found - { "error": "Todo not found" }
500 Internal Server Error - { "error": "Failed to delete todo" }
```

**Implementation Pattern (app/api/todos/[id]/route.ts):**
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // CRITICAL: params is async in Next.js 16
  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const deleted = todoDB.delete(session.userId, todoId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
```

### Database Operations (lib/db.ts)

```typescript
import Database from 'better-sqlite3';
import { getSingaporeNow } from './timezone';

// Database file in project root
const db = new Database('todos.db');

// Initialize schema
db.exec(`
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
  
  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);
`);

// Export database instance and CRUD operations
export const todoDB = {
  // Create new todo
  create: (userId: number, input: CreateTodoInput): Todo => {
    const now = getSingaporeNow().toISOString();
    const stmt = db.prepare(`
      INSERT INTO todos (user_id, title, due_date, created_at, updated_at, priority, recurrence_pattern, reminder_minutes)
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

  // Get all todos for a user
  getAll: (userId: number): Todo[] => {
    const stmt = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Todo[];
  },

  // Get single todo by ID
  getById: (userId: number, todoId: number): Todo | null => {
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?');
    return (stmt.get(todoId, userId) as Todo) || null;
  },

  // Update todo (dynamic field updates)
  update: (userId: number, todoId: number, input: UpdateTodoInput): Todo | null => {
    const now = getSingaporeNow().toISOString();
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

    if (updates.length === 0) return todoDB.getById(userId, todoId);

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

  // Delete todo
  delete: (userId: number, todoId: number): boolean => {
    const stmt = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?');
    const result = stmt.run(todoId, userId);
    return result.changes > 0;
  }
};

export { db };
```

**Key Patterns from copilot-instructions.md:**
- All DB operations are **synchronous** (better-sqlite3) - no async/await
- Use prepared statements for all queries (SQL injection prevention)
- Always use `getSingaporeNow()` instead of `new Date()`
- Export DB object with CRUD methods (`todoDB`)
- Single source of truth: all database interfaces in `lib/db.ts`

### Singapore Timezone Handling (lib/timezone.ts)

```typescript
/**
 * Get current date/time in Singapore timezone
 * CRITICAL: ALWAYS use this instead of new Date() for consistency
 * Mandated by copilot-instructions.md pattern #3
 */
export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
}

/**
 * Format date for Singapore timezone display
 */
export function formatSingaporeDate(date: Date | string, format: 'date' | 'datetime' | 'time' = 'date'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Singapore',
    ...(format === 'date' && { year: 'numeric', month: 'short', day: 'numeric' }),
    ...(format === 'datetime' && { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    ...(format === 'time' && { hour: '2-digit', minute: '2-digit' })
  };
  
  return d.toLocaleString('en-US', options);
}

/**
 * Parse date string to Singapore timezone Date object
 */
export function parseSingaporeDate(dateString: string): Date {
  return new Date(new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
}

/**
 * Validate YYYY-MM-DD date format
 */
export function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
```

**Why Singapore Timezone?**
- Per copilot-instructions.md: ALL date/time operations use `Asia/Singapore`
- Applies to: due dates, reminders, recurring todos, holiday calculations
- Centralized in `lib/timezone.ts` to prevent `new Date()` usage

---

## UI Components

### Main Todo List Component (app/page.tsx - excerpt)

**Note**: Per copilot-instructions.md, main todo page is a large (~2200 lines) monolithic client component handling all features. This excerpt shows CRUD-specific patterns.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Todo, CreateTodoInput, UpdateTodoInput } from '@/lib/db';
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone';

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error('Failed to fetch todos');
      const data = await res.json();
      setTodos(data.todos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Create todo with optimistic update pattern
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) {
      setError('Title is required');
      return;
    }

    if (newTodoTitle.length > 500) {
      setError('Title must be 500 characters or less');
      return;
    }

    const tempId = Date.now(); // Temporary ID for optimistic update
    const optimisticTodo: Todo = {
      id: tempId,
      user_id: 0, // Will be set by server
      title: newTodoTitle.trim(),
      completed_at: null,
      due_date: newTodoDueDate || null,
      created_at: getSingaporeNow().toISOString(),
      updated_at: getSingaporeNow().toISOString(),
      priority: null,
      recurrence_pattern: null,
      reminder_minutes: null,
      last_notification_sent: null
    };

    // Optimistic update - show immediately
    setTodos(prev => [optimisticTodo, ...prev]);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setError(null);

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          due_date: newTodoDueDate || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create todo');
      }

      const createdTodo: Todo = await res.json();
      
      // Replace optimistic todo with real server-confirmed one
      setTodos(prev => prev.map(t => t.id === tempId ? createdTodo : t));
    } catch (err) {
      // Rollback optimistic update on error
      setTodos(prev => prev.filter(t => t.id !== tempId));
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Toggle completion with optimistic update
  const handleToggleComplete = async (todo: Todo) => {
    const newCompletedAt = todo.completed_at 
      ? null 
      : getSingaporeNow().toISOString();

    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === todo.id ? { ...t, completed_at: newCompletedAt } : t
    ));

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: newCompletedAt })
      });

      if (!res.ok) throw new Error('Failed to update todo');
      
      const updatedTodo: Todo = await res.json();
      setTodos(prev => prev.map(t => t.id === todo.id ? updatedTodo : t));
    } catch (err) {
      // Rollback on error
      setTodos(prev => prev.map(t => 
        t.id === todo.id ? { ...t, completed_at: todo.completed_at } : t
      ));
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Start editing
  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || '');
  };

  // Save edit with optimistic update
  const handleSaveEdit = async (todoId: number) => {
    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }

    if (editTitle.length > 500) {
      setError('Title must be 500 characters or less');
      return;
    }

    const originalTodo = todos.find(t => t.id === todoId);
    
    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === todoId 
        ? { ...t, title: editTitle.trim(), due_date: editDueDate || null }
        : t
    ));
    setEditingId(null);

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          due_date: editDueDate || null
        })
      });

      if (!res.ok) throw new Error('Failed to update todo');
      
      const updatedTodo: Todo = await res.json();
      setTodos(prev => prev.map(t => t.id === todoId ? updatedTodo : t));
      setError(null);
    } catch (err) {
      // Rollback on error
      if (originalTodo) {
        setTodos(prev => prev.map(t => t.id === todoId ? originalTodo : t));
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Delete todo with optimistic update
  const handleDelete = async (todoId: number) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    const originalTodos = [...todos];
    
    // Optimistic update - remove immediately
    setTodos(prev => prev.filter(t => t.id !== todoId));

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete todo');
      setError(null);
    } catch (err) {
      // Rollback on error
      setTodos(originalTodos);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) return <div className="p-4">Loading todos...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Todos</h1>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Create Todo Form */}
      <form onSubmit={handleCreateTodo} className="mb-8 flex gap-2">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={500}
        />
        <input
          type="date"
          value={newTodoDueDate}
          onChange={(e) => setNewTodoDueDate(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Add
        </button>
      </form>

      {/* Todo List */}
      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No todos yet. Create one above!</p>
        ) : (
          todos.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={!!todo.completed_at}
                onChange={() => handleToggleComplete(todo)}
                className="w-5 h-5 cursor-pointer"
              />

              {/* Todo Content */}
              {editingId === todo.id ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded"
                    maxLength={500}
                  />
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => handleSaveEdit(todo.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className={`${todo.completed_at ? 'line-through text-gray-500' : ''}`}>
                      {todo.title}
                    </p>
                    {todo.due_date && (
                      <p className="text-sm text-gray-500">
                        Due: {formatSingaporeDate(todo.due_date, 'date')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartEdit(todo)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**Key Patterns from copilot-instructions.md:**
- Client component (`'use client'`) - never import `lib/db.ts` directly
- All API calls use fetch with proper error handling
- Optimistic UI updates for responsive feel
- Singapore timezone via `getSingaporeNow()` and `formatSingaporeDate()`
- State management via React hooks (no external state library)
- Monolithic pattern - keep additions in this file

---

## Edge Cases

### 1. Empty Title
**Scenario**: User tries to create todo with empty or whitespace-only title  
**Handling**: 
- Client: Trim input and show validation error
- Server: Return 400 with "Title is required"

### 2. Title Length Exceeding 500 Characters
**Scenario**: User pastes very long text as title  
**Handling**:
- Client: maxLength attribute on input + validation
- Server: CHECK constraint on database + 400 error response

### 3. Invalid Due Date Format
**Scenario**: User manually enters malformed date (e.g., "2025-13-45")  
**Handling**:
- Client: Use native date picker to prevent invalid input
- Server: Validate with `isValidDateFormat()` function, return 400

### 4. Past Due Dates
**Scenario**: User sets due date in the past  
**Handling**: Allow it (user may be recording past tasks)

### 5. Concurrent Edits
**Scenario**: User has two browser tabs, edits same todo in both  
**Handling**: Last write wins (no conflict resolution in v1)

### 6. Network Failures During Optimistic Updates
**Scenario**: User creates todo but API call fails  
**Handling**:
- Show error message
- Remove optimistic todo from UI
- Allow user to retry

### 7. Session Expiry During Operation
**Scenario**: JWT expires while user is editing  
**Handling**:
- API returns 401 Unauthorized
- Middleware redirects to login
- User loses unsaved changes (warn before redirect in future)

### 8. Deleting Non-Existent Todo
**Scenario**: Todo deleted in another tab, user clicks delete here  
**Handling**:
- Server returns 404
- Client shows error but doesn't crash
- Remove from client state anyway (idempotent)

### 9. Special Characters in Title
**Scenario**: User enters emojis, Unicode, HTML, etc.  
**Handling**: Allow all Unicode characters, no sanitization needed (SQLite stores as-is, React escapes on render)

### 10. Rapid Successive Operations
**Scenario**: User clicks "Add" button 10 times quickly  
**Handling**:
- Each click creates separate API call
- All should succeed and create separate todos
- Consider debouncing in future if becomes issue

### 11. Database Lock (SQLite Concurrent Writes)
**Scenario**: Multiple API requests try to write simultaneously  
**Handling**:
- better-sqlite3 handles locking automatically
- Failed operations throw exception
- Return 500 error to client

### 12. Very Large Number of Todos
**Scenario**: User has 10,000+ todos  
**Handling**:
- No pagination in v1 (return all)
- Performance may degrade
- Future: Add pagination/virtual scrolling

---

## Acceptance Criteria

### Functional Requirements

✅ **AC-1**: User can create a new todo with only a title (1-500 chars)  
✅ **AC-2**: User can create a todo with title and due date  
✅ **AC-3**: Due dates must be in YYYY-MM-DD format  
✅ **AC-4**: User can view all their todos sorted by creation date (newest first)  
✅ **AC-5**: User can toggle todo completion status via checkbox  
✅ **AC-6**: Completed todos show strikethrough text  
✅ **AC-7**: User can edit todo title and due date  
✅ **AC-8**: User can delete a todo with confirmation dialog  
✅ **AC-9**: All date/time operations use Singapore timezone (Asia/Singapore)  
✅ **AC-10**: Optimistic UI updates occur before server confirmation  

### Technical Requirements

✅ **AC-11**: All API routes require valid JWT session cookie  
✅ **AC-12**: Database enforces title length constraint (1-500 chars)  
✅ **AC-13**: Database uses foreign key cascade for user deletion  
✅ **AC-14**: Server validates all input before database operations  
✅ **AC-15**: Client handles API errors gracefully with rollback  
✅ **AC-16**: Timestamps stored as ISO 8601 strings  
✅ **AC-17**: Database operations use prepared statements (SQL injection prevention)  

### User Experience

✅ **AC-18**: Create form clears after successful submission  
✅ **AC-19**: Error messages display in red alert box  
✅ **AC-20**: Loading state shown while fetching todos  
✅ **AC-21**: Edit mode transforms inline (no modal)  
✅ **AC-22**: Cancel button in edit mode discards changes  
✅ **AC-23**: Empty state message shown when no todos exist  

---

## Testing Requirements

### Unit Tests (Database Layer)

```typescript
// tests/unit/db-todos.test.ts

describe('todoDB.create', () => {
  test('creates todo with valid title only', () => {
    const todo = todoDB.create(1, { title: 'Test todo' });
    expect(todo.title).toBe('Test todo');
    expect(todo.user_id).toBe(1);
    expect(todo.due_date).toBeNull();
  });

  test('creates todo with title and due date', () => {
    const todo = todoDB.create(1, { 
      title: 'Test', 
      due_date: '2025-12-31' 
    });
    expect(todo.due_date).toBe('2025-12-31');
  });

  test('throws error for empty title', () => {
    expect(() => todoDB.create(1, { title: '' }))
      .toThrow();
  });

  test('throws error for title > 500 chars', () => {
    const longTitle = 'a'.repeat(501);
    expect(() => todoDB.create(1, { title: longTitle }))
      .toThrow();
  });
});

describe('todoDB.update', () => {
  test('updates title only', () => {
    const todo = todoDB.create(1, { title: 'Original' });
    const updated = todoDB.update(1, todo.id, { title: 'Updated' });
    expect(updated?.title).toBe('Updated');
  });

  test('toggles completion status', () => {
    const todo = todoDB.create(1, { title: 'Test' });
    const completed = todoDB.update(1, todo.id, { 
      completed_at: new Date().toISOString() 
    });
    expect(completed?.completed_at).not.toBeNull();
  });

  test('returns null for non-existent todo', () => {
    const result = todoDB.update(1, 99999, { title: 'Test' });
    expect(result).toBeNull();
  });
});

describe('todoDB.delete', () => {
  test('deletes existing todo', () => {
    const todo = todoDB.create(1, { title: 'To delete' });
    const result = todoDB.delete(1, todo.id);
    expect(result).toBe(true);
    expect(todoDB.getById(1, todo.id)).toBeNull();
  });

  test('returns false for non-existent todo', () => {
    const result = todoDB.delete(1, 99999);
    expect(result).toBe(false);
  });
});
```

### E2E Tests (Playwright)

**Test File**: `tests/02-todo-crud.spec.ts`

**Configuration Note**: Per copilot-instructions.md, tests use:
- Virtual WebAuthn authenticators (configured in `playwright.config.ts`)
- `timezoneId: 'Asia/Singapore'` to match app timezone
- Helper class `tests/helpers.ts` for reusable methods

```typescript
// tests/02-todo-crud.spec.ts

import { test, expect } from '@playwright/test';
import { TestHelper } from './helpers';

test.describe('Todo CRUD Operations', () => {
  let helper: TestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelper(page);
    await helper.registerAndLogin('testuser');
  });

  test('creates new todo with title only', async ({ page }) => {
    await page.fill('[placeholder="What needs to be done?"]', 'Buy groceries');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Buy groceries')).toBeVisible();
  });

  test('creates todo with title and due date', async ({ page }) => {
    await page.fill('[placeholder="What needs to be done?"]', 'Submit report');
    await page.fill('input[type="date"]', '2025-11-20');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Submit report')).toBeVisible();
    await expect(page.locator('text=Due: Nov 20, 2025')).toBeVisible();
  });

  test('shows error for empty title', async ({ page }) => {
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Title is required')).toBeVisible();
  });

  test('toggles todo completion', async ({ page }) => {
    await helper.createTodo('Complete task');
    
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    
    await expect(page.locator('text=Complete task').first())
      .toHaveClass(/line-through/);
  });

  test('edits todo title', async ({ page }) => {
    await helper.createTodo('Original title');
    
    await page.click('button:has-text("Edit")');
    await page.fill('input[type="text"]', 'Updated title');
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Updated title')).toBeVisible();
    await expect(page.locator('text=Original title')).not.toBeVisible();
  });

  test('cancels edit without saving', async ({ page }) => {
    await helper.createTodo('Original title');
    
    await page.click('button:has-text("Edit")');
    await page.fill('input[type="text"]', 'Changed title');
    await page.click('button:has-text("Cancel")');
    
    await expect(page.locator('text=Original title')).toBeVisible();
    await expect(page.locator('text=Changed title')).not.toBeVisible();
  });

  test('deletes todo with confirmation', async ({ page }) => {
    await helper.createTodo('To be deleted');
    
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Delete")');
    
    await expect(page.locator('text=To be deleted')).not.toBeVisible();
  });

  test('displays empty state when no todos', async ({ page }) => {
    await expect(page.locator('text=No todos yet')).toBeVisible();
  });

  test('sorts todos by creation date descending', async ({ page }) => {
    await helper.createTodo('First todo');
    await page.waitForTimeout(100);
    await helper.createTodo('Second todo');
    await page.waitForTimeout(100);
    await helper.createTodo('Third todo');
    
    const todos = page.locator('[class*="space-y-2"] > div');
    await expect(todos.nth(0)).toContainText('Third todo');
    await expect(todos.nth(1)).toContainText('Second todo');
    await expect(todos.nth(2)).toContainText('First todo');
  });

  test('persists todos after page refresh', async ({ page }) => {
    await helper.createTodo('Persistent todo');
    await page.reload();
    await expect(page.locator('text=Persistent todo')).toBeVisible();
  });
});

test.describe('Todo Validation', () => {
  test('rejects title over 500 characters', async ({ page }) => {
    const helper = new TestHelper(page);
    await helper.registerAndLogin('testuser');
    
    const longTitle = 'a'.repeat(501);
    await page.fill('[placeholder="What needs to be done?"]', longTitle);
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Title must be 500 characters or less'))
      .toBeVisible();
  });

  test('accepts special characters and emojis in title', async ({ page }) => {
    const helper = new TestHelper(page);
    await helper.registerAndLogin('testuser');
    
    await helper.createTodo('Buy 🍎 & 🥖 @ store (50% off!)');
    await expect(page.locator('text=Buy 🍎 & 🥖 @ store (50% off!)')).toBeVisible();
  });
});
```

**Helper Class Reference** (`tests/helpers.ts`):
```typescript
export class TestHelper {
  constructor(private page: Page) {}

  async createTodo(title: string, dueDate?: string): Promise<void> {
    await this.page.fill('[placeholder="What needs to be done?"]', title);
    if (dueDate) {
      await this.page.fill('input[type="date"]', dueDate);
    }
    await this.page.click('button:has-text("Add")');
    await this.page.waitForTimeout(100); // Allow optimistic update
  }

  async registerAndLogin(username: string): Promise<void> {
    // WebAuthn registration/login flow
    // Implementation details in actual helpers.ts
  }
}
```

---

## Out of Scope

The following features are **explicitly excluded** from this PRP and will be covered in separate PRPs:

❌ Priority levels (high/medium/low) - See PRP-02  
❌ Recurring todo patterns - See PRP-03  
❌ Reminder notifications - See PRP-04  
❌ Subtasks and progress tracking - See PRP-05  
❌ Tag system - See PRP-06  
❌ Template creation - See PRP-07  
❌ Search and filtering - See PRP-08  
❌ Export/import functionality - See PRP-09  
❌ Calendar view - See PRP-10  
❌ Pagination or infinite scroll  
❌ Bulk operations (select multiple, bulk delete)  
❌ Undo/redo functionality  
❌ Todo sharing or collaboration  
❌ Attachments or file uploads  
❌ Comments or notes on todos  
❌ Drag-and-drop reordering  
❌ Keyboard shortcuts  
❌ Dark mode  
❌ Mobile responsive design optimizations  

---

## Success Metrics

### Quantitative Metrics

1. **Performance**
   - Page load time: < 1 second for 100 todos
   - API response time: < 200ms for CRUD operations
   - Optimistic update renders: < 50ms

2. **Reliability**
   - Database write success rate: > 99.9%
   - Optimistic update rollback rate: < 1%
   - Zero data loss incidents

3. **Code Quality**
   - Test coverage: > 90% for database layer
   - E2E test pass rate: 100%
   - Zero SQL injection vulnerabilities

### Qualitative Metrics

1. **User Experience**
   - User can create todo in < 5 seconds
   - Checkbox toggle feels instant (< 100ms perceived delay)
   - Error messages are clear and actionable

2. **Developer Experience**
   - API is RESTful and predictable
   - TypeScript types prevent common errors
   - Database schema is normalized and efficient

3. **Maintainability**
   - Code follows Next.js 16 best practices
   - Singapore timezone handling is centralized
   - Error handling is consistent across routes

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `lib/db.ts` with schema and CRUD operations
- [ ] Create `lib/timezone.ts` with Singapore timezone utilities
- [ ] Write unit tests for database layer
- [ ] Test constraint enforcement (title length, etc.)

### Phase 2: API Routes
- [ ] Implement `POST /api/todos` (create)
- [ ] Implement `GET /api/todos` (list all)
- [ ] Implement `GET /api/todos/[id]` (get single)
- [ ] Implement `PUT /api/todos/[id]` (update)
- [ ] Implement `DELETE /api/todos/[id]` (delete)
- [ ] Add input validation to all routes
- [ ] Add authentication checks (session middleware)
- [ ] Test all endpoints with Postman/curl

### Phase 3: Frontend UI
- [ ] Create main todo page component (`app/page.tsx`)
- [ ] Implement create todo form
- [ ] Implement todo list display
- [ ] Implement completion toggle
- [ ] Implement inline edit mode
- [ ] Implement delete with confirmation
- [ ] Add optimistic UI updates
- [ ] Add error handling and rollback
- [ ] Add loading states

### Phase 4: Testing
- [ ] Write E2E tests for create operations
- [ ] Write E2E tests for read/list operations
- [ ] Write E2E tests for update operations
- [ ] Write E2E tests for delete operations
- [ ] Write E2E tests for validation errors
- [ ] Test optimistic update rollback scenarios
- [ ] Test concurrent operations (multiple tabs)

### Phase 5: Polish
- [ ] Add empty state messaging
- [ ] Improve error message clarity
- [ ] Add form reset after submission
- [ ] Test with various title lengths
- [ ] Test with special characters/emojis
- [ ] Verify Singapore timezone in all scenarios
- [ ] Performance test with 1000+ todos

---

## Related Documentation

**Critical Reference**: `.github/copilot-instructions.md`
- Pattern #2: Database Architecture (single source of truth in `lib/db.ts`)
- Pattern #3: Singapore Timezone (mandatory use of `lib/timezone.ts`)
- Pattern #4: API Route Patterns (async params in Next.js 16)
- Pattern #1: Authentication Flow (JWT sessions, will integrate in PRP-11)

**Supporting Documentation**:
- `USER_GUIDE.md` - Comprehensive 2000+ line user documentation
- `README.md` - Setup and installation guide
- `PRPs/README.md` - Index of all Product Requirement Prompts

**File References**:
- **Database**: `lib/db.ts` (single file, ~700 lines)
- **Timezone**: `lib/timezone.ts`
- **Main UI**: `app/page.tsx` (~2200 lines, monolithic client component)
- **API Routes**: `app/api/todos/route.ts`, `app/api/todos/[id]/route.ts`
- **Tests**: `tests/02-todo-crud.spec.ts`, `tests/helpers.ts`

---

**End of PRP-01: Todo CRUD Operations**
