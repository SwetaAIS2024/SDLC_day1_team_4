# PRP-01: Todo CRUD Operations

## Feature Overview

The Todo CRUD Operations feature provides the foundation for managing todo items in the application. Users can create, read, update, and delete todos with proper validation, error handling, and timezone awareness. All date/time operations use Singapore timezone (Asia/Singapore) to ensure consistency across the application. The implementation includes optimistic UI updates for a responsive user experience, with automatic rollback on server errors.

**Core Capabilities:**
- Create new todos with title and optional due date
- View all todos for the authenticated user
- Edit existing todo titles and due dates
- Delete todos with cascade deletion of related data
- Real-time validation with user feedback
- Singapore timezone handling for all date operations
- Optimistic UI updates with error recovery

## User Stories

### Primary Users

**User Persona 1: Sarah - Busy Professional**
- **Background**: Marketing manager in Singapore, manages multiple projects
- **Goal**: Quickly capture tasks as they come up during meetings
- **Need**: "As a busy professional, I want to quickly create todos so that I don't forget important tasks during my workday."

**User Persona 2: Alex - Detail-Oriented Planner**
- **Background**: Project coordinator, likes to organize tasks by deadlines
- **Goal**: Set due dates for tasks to prioritize work
- **Need**: "As a planner, I want to set due dates for my todos so that I can see what needs to be completed by when."

**User Persona 3: Jamie - Task Completer**
- **Background**: Software developer, tracks daily development tasks
- **Goal**: Mark tasks as done and clean up completed items
- **Need**: "As a task completer, I want to mark todos as complete and delete finished tasks so that my list stays manageable."

### User Stories

1. **Create Todo**
   - As a user, I want to create a todo with just a title so that I can quickly capture tasks
   - As a user, I want to optionally set a due date when creating a todo so that I can track deadlines
   - As a user, I want to see my new todo immediately after creation so that I know it was saved

2. **Read Todos**
   - As a user, I want to see all my todos on the main page so that I have an overview of my tasks
   - As a user, I want to see due dates in Singapore time so that deadlines are accurate for my location
   - As a user, I want to see my most recently created todos first so that new tasks are prominent

3. **Update Todo**
   - As a user, I want to edit a todo's title so that I can correct typos or clarify the task
   - As a user, I want to change or remove a due date so that I can adjust deadlines as plans change
   - As a user, I want to mark a todo as complete so that I can track my progress

4. **Delete Todo**
   - As a user, I want to delete a todo so that I can remove tasks I no longer need
   - As a user, I want confirmation before deleting so that I don't accidentally lose important tasks
   - As a user, I want deleted todos to disappear immediately from my view

## User Flow

### Flow 1: Create a New Todo

```
1. User lands on main page (/)
2. User sees "Add new todo" input field at the top
3. User types todo title (e.g., "Review Q4 budget report")
4. User optionally clicks calendar icon to set due date
   - Date picker opens in modal/popover
   - User selects date (e.g., "Nov 15, 2025")
   - Date picker closes, selected date shows next to input
5. User presses Enter or clicks "Add" button
6. Todo appears immediately at top of list (optimistic update)
7. API call completes in background
   - SUCCESS: Todo persists with server-generated ID
   - FAILURE: Todo disappears, error message shows "Failed to create todo. Please try again."
8. Input field clears, ready for next todo
```

### Flow 2: View All Todos

```
1. User navigates to main page (/)
2. Page loads and fetches todos from API
3. Loading state shows (e.g., skeleton screens or spinner)
4. Todos render in list format, newest first
5. Each todo displays:
   - Title text
   - Due date (if set) in format "Due: Nov 15, 2025, 2:30 PM SGT"
   - Completion checkbox
   - Edit and delete action buttons
6. Empty state shows if no todos: "No todos yet. Create your first one!"
```

### Flow 3: Edit an Existing Todo

```
1. User clicks "Edit" button on a todo
2. Todo switches to edit mode:
   - Title becomes editable text input (pre-filled with current title)
   - Due date picker appears (pre-filled with current date or empty)
   - "Save" and "Cancel" buttons replace "Edit" button
3. User modifies title and/or due date
4. User clicks "Save"
5. Todo updates immediately in UI (optimistic update)
6. API call completes in background
   - SUCCESS: Todo persists with updated values
   - FAILURE: Todo reverts to original values, error message shows
7. Todo switches back to view mode
```

### Flow 4: Complete a Todo

```
1. User clicks checkbox next to todo
2. Checkbox fills immediately (optimistic update)
3. Todo gets visual styling change (e.g., strikethrough, gray text)
4. API call updates completed status
   - SUCCESS: Todo stays marked as complete
   - FAILURE: Checkbox unchecks, error message shows
5. (Optional) Completed todos move to bottom of list or separate section
```

### Flow 5: Delete a Todo

```
1. User clicks "Delete" button (trash icon) on a todo
2. Confirmation dialog appears: "Delete 'Review Q4 budget report'? This cannot be undone."
3. User clicks "Delete" in confirmation dialog
4. Todo disappears immediately from list (optimistic update)
5. API call completes in background
   - SUCCESS: Todo permanently deleted
   - FAILURE: Todo reappears in list, error message shows
6. If user clicks "Cancel", dialog closes and no action taken
```

### Flow 6: Error Handling

```
SCENARIO: Network failure during creation
1. User creates todo "Call dentist"
2. Todo appears in UI immediately
3. Network request fails (timeout, 500 error, etc.)
4. Todo shakes/flashes red and disappears
5. Toast notification: "Failed to create todo. Please check your connection."
6. User can retry by creating the todo again
```

## Technical Requirements

### Database Schema

**Table: `todos`**

```sql
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK(length(title) <= 500),
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
  due_date TEXT, -- ISO 8601 format in Singapore timezone (e.g., "2025-11-15T14:30:00+08:00")
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_completed ON todos(completed);
```

**Key Constraints:**
- `title`: Required, max 500 characters
- `completed`: Boolean stored as 0 (false) or 1 (true)
- `due_date`: Optional, stored as ISO 8601 string with timezone
- `user_id`: Foreign key to users table, cascade delete

### TypeScript Types

**File: `lib/db.ts`**

```typescript
export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean; // Converted from 0/1 in DB
  due_date: string | null; // ISO 8601 string or null
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
}

export interface CreateTodoInput {
  title: string;
  due_date?: string | null; // Optional ISO 8601 string
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  due_date?: string | null; // Can be set to null to remove due date
}

export interface TodoResponse {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  // user_id excluded from API responses for security
}
```

### Database Operations (lib/db.ts)

```typescript
import Database from 'better-sqlite3';
import { getSingaporeNow } from './timezone';

const db = new Database('todos.db');

// Initialize todos table
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL CHECK(length(title) <= 500),
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
`);

export const todoDB = {
  // Create a new todo
  create: (userId: number, input: CreateTodoInput): Todo => {
    const now = getSingaporeNow().toISOString();
    const stmt = db.prepare(`
      INSERT INTO todos (user_id, title, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, input.title, input.due_date || null, now, now);
    return todoDB.getById(userId, result.lastInsertRowid as number)!;
  },

  // Get all todos for a user
  getAll: (userId: number): Todo[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      ...row,
      completed: Boolean(row.completed)
    }));
  },

  // Get a single todo by ID
  getById: (userId: number, todoId: number): Todo | null => {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE id = ? AND user_id = ?
    `);
    const row = stmt.get(todoId, userId) as any;
    if (!row) return null;
    return {
      ...row,
      completed: Boolean(row.completed)
    };
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
    if (input.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(input.due_date);
    }

    if (updates.length === 0) return todo;

    updates.push('updated_at = ?');
    values.push(getSingaporeNow().toISOString());
    values.push(todoId, userId);

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
  }
};

export { db };
```

### API Endpoints

#### 1. Create Todo: `POST /api/todos`

**Request Body:**
```json
{
  "title": "Review Q4 budget report",
  "due_date": "2025-11-15T14:30:00+08:00" // Optional
}
```

**Response (201 Created):**
```json
{
  "id": 42,
  "title": "Review Q4 budget report",
  "completed": false,
  "due_date": "2025-11-15T14:30:00+08:00",
  "created_at": "2025-11-12T10:15:30+08:00",
  "updated_at": "2025-11-12T10:15:30+08:00"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input (empty title, title too long)
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Database error

**Implementation (app/api/todos/route.ts):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, CreateTodoInput } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, due_date } = body as CreateTodoInput;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > 500) {
      return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 });
    }

    const todo = todoDB.create(session.userId, { title: title.trim(), due_date });

    // Remove user_id from response
    const { user_id, ...todoResponse } = todo;
    return NextResponse.json(todoResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
```

#### 2. Get All Todos: `GET /api/todos`

**Response (200 OK):**
```json
[
  {
    "id": 42,
    "title": "Review Q4 budget report",
    "completed": false,
    "due_date": "2025-11-15T14:30:00+08:00",
    "created_at": "2025-11-12T10:15:30+08:00",
    "updated_at": "2025-11-12T10:15:30+08:00"
  },
  {
    "id": 41,
    "title": "Call dentist",
    "completed": true,
    "due_date": null,
    "created_at": "2025-11-11T09:20:00+08:00",
    "updated_at": "2025-11-12T08:45:00+08:00"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Database error

**Implementation (app/api/todos/route.ts):**
```typescript
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const todos = todoDB.getAll(session.userId);
    
    // Remove user_id from all responses
    const todosResponse = todos.map(({ user_id, ...todo }) => todo);
    return NextResponse.json(todosResponse);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}
```

#### 3. Update Todo: `PUT /api/todos/[id]`

**Request Body (partial updates allowed):**
```json
{
  "title": "Review Q4 budget report (URGENT)",
  "completed": true,
  "due_date": "2025-11-16T14:30:00+08:00"
}
```

**Response (200 OK):**
```json
{
  "id": 42,
  "title": "Review Q4 budget report (URGENT)",
  "completed": true,
  "due_date": "2025-11-16T14:30:00+08:00",
  "created_at": "2025-11-12T10:15:30+08:00",
  "updated_at": "2025-11-12T11:30:00+08:00"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Todo doesn't exist or doesn't belong to user
- `500 Internal Server Error`: Database error

**Implementation (app/api/todos/[id]/route.ts):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, UpdateTodoInput } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates = body as UpdateTodoInput;

    // Validation
    if (updates.title !== undefined) {
      if (updates.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (updates.title.length > 500) {
        return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 });
      }
      updates.title = updates.title.trim();
    }

    const todo = todoDB.update(session.userId, todoId, updates);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const { user_id, ...todoResponse } = todo;
    return NextResponse.json(todoResponse);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}
```

#### 4. Delete Todo: `DELETE /api/todos/[id]`

**Response (204 No Content):**
```
(empty body)
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Todo doesn't exist or doesn't belong to user
- `500 Internal Server Error`: Database error

**Implementation (app/api/todos/[id]/route.ts):**
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const deleted = todoDB.delete(session.userId, todoId);

    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
```

### Singapore Timezone Utilities

**File: `lib/timezone.ts`**

```typescript
import { DateTime } from 'luxon';

const SINGAPORE_TIMEZONE = 'Asia/Singapore';

/**
 * Get current date/time in Singapore timezone
 * USE THIS instead of new Date() throughout the application
 */
export function getSingaporeNow(): DateTime {
  return DateTime.now().setZone(SINGAPORE_TIMEZONE);
}

/**
 * Parse an ISO string as Singapore time
 */
export function parseSingaporeDate(isoString: string): DateTime {
  return DateTime.fromISO(isoString, { zone: SINGAPORE_TIMEZONE });
}

/**
 * Format a date for display in Singapore timezone
 */
export function formatSingaporeDate(date: DateTime | string, format: string = 'MMM d, yyyy, h:mm a'): string {
  const dt = typeof date === 'string' ? parseSingaporeDate(date) : date;
  return dt.toFormat(format) + ' SGT';
}

/**
 * Check if a date is in the past (Singapore time)
 */
export function isPastDue(dueDate: string): boolean {
  const now = getSingaporeNow();
  const due = parseSingaporeDate(dueDate);
  return due < now;
}
```

**Usage Example:**
```typescript
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';

// Creating a todo with current timestamp
const now = getSingaporeNow().toISOString(); // "2025-11-12T10:15:30+08:00"

// Displaying a due date
const displayDate = formatSingaporeDate("2025-11-15T14:30:00+08:00"); 
// "Nov 15, 2025, 2:30 PM SGT"
```

## UI Components

### Main Todo Page Component

**File: `app/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getSingaporeNow, formatSingaporeDate, isPastDue } from '@/lib/timezone';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState<string>('');

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
      setTodos(data);
      setError(null);
    } catch (err) {
      setError('Failed to load todos. Please refresh the page.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    // Optimistic update
    const tempId = Date.now();
    const tempTodo: Todo = {
      id: tempId,
      title: newTodoTitle.trim(),
      completed: false,
      due_date: newTodoDueDate || null,
      created_at: getSingaporeNow().toISOString(),
      updated_at: getSingaporeNow().toISOString(),
    };
    setTodos([tempTodo, ...todos]);
    setNewTodoTitle('');
    setNewTodoDueDate('');

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tempTodo.title,
          due_date: tempTodo.due_date,
        }),
      });

      if (!res.ok) throw new Error('Failed to create todo');

      const createdTodo = await res.json();
      // Replace temp todo with real one
      setTodos(prev => prev.map(t => t.id === tempId ? createdTodo : t));
    } catch (err) {
      // Rollback optimistic update
      setTodos(prev => prev.filter(t => t.id !== tempId));
      setError('Failed to create todo. Please try again.');
      console.error(err);
    }
  };

  const updateTodo = async (id: number, updates: Partial<Todo>) => {
    // Optimistic update
    const originalTodos = [...todos];
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updated_at: getSingaporeNow().toISOString() } : t
    ));

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update todo');

      const updatedTodo = await res.json();
      setTodos(prev => prev.map(t => t.id === id ? updatedTodo : t));
    } catch (err) {
      // Rollback optimistic update
      setTodos(originalTodos);
      setError('Failed to update todo. Please try again.');
      console.error(err);
    }
  };

  const deleteTodo = async (id: number) => {
    if (!confirm('Delete this todo? This cannot be undone.')) return;

    // Optimistic update
    const originalTodos = [...todos];
    setTodos(prev => prev.filter(t => t.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete todo');
    } catch (err) {
      // Rollback optimistic update
      setTodos(originalTodos);
      setError('Failed to delete todo. Please try again.');
      console.error(err);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    await updateTodo(editingId, {
      title: editTitle.trim(),
      due_date: editDueDate || null,
    });

    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading todos...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Todos</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Create Todo Form */}
      <form onSubmit={createTodo} className="mb-8 flex gap-2">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="Add new todo..."
          maxLength={500}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="datetime-local"
          value={newTodoDueDate}
          onChange={(e) => setNewTodoDueDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newTodoTitle.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {/* Todos List */}
      {todos.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No todos yet. Create your first one!
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map(todo => (
            <div
              key={todo.id}
              className={`p-4 border rounded-lg ${
                todo.completed ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
              }`}
            >
              {editingId === todo.id ? (
                // Edit Mode
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={(e) => updateTodo(todo.id, { completed: e.target.checked })}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className={`text-lg ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                      {todo.title}
                    </div>
                    {todo.due_date && (
                      <div className={`text-sm mt-1 ${
                        isPastDue(todo.due_date) && !todo.completed
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-600'
                      }`}>
                        Due: {formatSingaporeDate(todo.due_date)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(todo)}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Key UI Patterns

1. **Optimistic Updates**: UI updates immediately, with rollback on failure
2. **Loading States**: Skeleton screens or spinners during data fetch
3. **Error Display**: Toast notifications or inline error messages
4. **Form Validation**: Client-side validation before API calls
5. **Confirmation Dialogs**: For destructive actions (delete)
6. **Responsive Design**: Mobile-friendly with Tailwind CSS

## Edge Cases

### 1. Empty Title Handling
**Scenario**: User tries to create a todo with whitespace-only title
- **Frontend**: Disable submit button if `title.trim()` is empty
- **Backend**: Return 400 error if title is empty after trimming
- **Expected**: User sees disabled button, or error message if they bypass frontend validation

### 2. Title Length Limit
**Scenario**: User enters title longer than 500 characters
- **Frontend**: `maxLength={500}` on input field, show character counter near limit
- **Backend**: Validate length and return 400 error
- **Database**: `CHECK(length(title) <= 500)` constraint
- **Expected**: User cannot exceed 500 characters in input; backend rejects if bypassed

### 3. Invalid Due Date Format
**Scenario**: API receives malformed date string (e.g., "not-a-date")
- **Backend**: Attempt to parse with Luxon, return 400 if invalid
- **Expected**: API returns error "Invalid due date format"

### 4. Due Date in the Past
**Scenario**: User sets due date to yesterday
- **System**: Allow creation (user may be logging past tasks)
- **UI**: Mark as "Overdue" with red styling
- **Expected**: Todo created successfully, displayed with overdue indicator

### 5. Concurrent Updates
**Scenario**: User edits todo in two browser tabs simultaneously
- **System**: Last write wins (standard for this application)
- **No**: Optimistic locking or conflict resolution in this version
- **Expected**: Second save overwrites first; user may see unexpected state

### 6. Deleting Non-Existent Todo
**Scenario**: User deletes a todo that was already deleted in another tab
- **API**: Returns 404 Not Found
- **Frontend**: Handles gracefully, removes from UI if present
- **Expected**: No error shown to user, todo already gone

### 7. Network Timeout During Creation
**Scenario**: Slow network causes request timeout
- **Frontend**: Optimistic update shows todo immediately
- **Timeout**: After 30 seconds, rollback and show error
- **Expected**: User sees "Failed to create todo. Please try again."

### 8. XSS in Todo Title
**Scenario**: User enters `<script>alert('xss')</script>` as title
- **React**: Automatically escapes HTML in JSX
- **Storage**: Stored as-is in database (raw string)
- **Display**: Rendered as text, not executed
- **Expected**: Script tag displayed as text, not executed

### 9. SQL Injection Attempt
**Scenario**: User enters `'; DROP TABLE todos; --` as title
- **Protection**: Prepared statements with parameterized queries
- **Result**: String stored safely in database
- **Expected**: Title stored literally, no SQL execution

### 10. Extremely Long Todo List
**Scenario**: User has 10,000+ todos
- **Current**: All loaded at once (performance issue)
- **Mitigation**: Pagination or infinite scroll in future version
- **Expected**: Page may be slow; out of scope for this PRP

### 11. Authentication Token Expiry
**Scenario**: User's session expires while viewing todos
- **API**: Returns 401 Unauthorized
- **Frontend**: Redirect to login page
- **Expected**: User must re-authenticate

### 12. Database Locked
**Scenario**: SQLite database locked by another process
- **Better-sqlite3**: Throws error
- **API**: Returns 500 error
- **Expected**: User sees "Failed to [action] todo. Please try again."

## Acceptance Criteria

### Functional Requirements

✅ **FR-1: Create Todo**
- Given: User is authenticated
- When: User enters title "Buy groceries" and clicks Add
- Then: Todo appears in list immediately with generated ID

✅ **FR-2: Create Todo with Due Date**
- Given: User is authenticated
- When: User enters title "Meeting" and sets due date to "Nov 15, 2025, 2:00 PM"
- Then: Todo appears with due date displayed as "Due: Nov 15, 2025, 2:00 PM SGT"

✅ **FR-3: Title Validation**
- Given: User tries to create todo with empty title
- When: User clicks Add
- Then: Add button is disabled, todo not created

✅ **FR-4: Title Length Limit**
- Given: User enters 501-character title
- When: User submits form
- Then: API returns 400 error with message "Title must be 500 characters or less"

✅ **FR-5: View All Todos**
- Given: User has 3 todos in database
- When: User loads main page
- Then: All 3 todos displayed in descending creation order (newest first)

✅ **FR-6: Empty State**
- Given: User has no todos
- When: User loads main page
- Then: Message "No todos yet. Create your first one!" displayed

✅ **FR-7: Edit Todo Title**
- Given: Todo "Buy milk" exists
- When: User clicks Edit, changes to "Buy almond milk", clicks Save
- Then: Todo updates to "Buy almond milk" with new updated_at timestamp

✅ **FR-8: Edit Todo Due Date**
- Given: Todo with due date "Nov 15" exists
- When: User edits due date to "Nov 16"
- Then: Todo updates with new due date

✅ **FR-9: Remove Due Date**
- Given: Todo with due date exists
- When: User clears due date field and saves
- Then: Todo updates with due_date set to null

✅ **FR-10: Complete Todo**
- Given: Incomplete todo exists
- When: User clicks checkbox
- Then: Todo marked as complete, checkbox filled, text gets strikethrough

✅ **FR-11: Uncomplete Todo**
- Given: Completed todo exists
- When: User unchecks checkbox
- Then: Todo marked as incomplete, checkbox empty, strikethrough removed

✅ **FR-12: Delete Todo**
- Given: Todo "Old task" exists
- When: User clicks Delete, confirms in dialog
- Then: Todo removed from list and database

✅ **FR-13: Cancel Delete**
- Given: User clicks Delete on a todo
- When: User clicks Cancel in confirmation dialog
- Then: Todo remains in list, no changes made

✅ **FR-14: Optimistic Create**
- Given: User creates todo "New task"
- When: API call is in progress
- Then: Todo appears in UI immediately before API response

✅ **FR-15: Optimistic Update**
- Given: User completes a todo
- When: API call is in progress
- Then: Checkbox fills and strikethrough applies immediately

✅ **FR-16: Optimistic Delete**
- Given: User deletes a todo
- When: API call is in progress
- Then: Todo disappears from UI immediately

✅ **FR-17: Rollback on Create Failure**
- Given: API returns 500 error during todo creation
- When: Optimistic update was shown
- Then: Todo removed from UI, error message displayed

✅ **FR-18: Rollback on Update Failure**
- Given: API returns 404 error during todo update
- When: Optimistic update was shown
- Then: Todo reverts to original state, error message displayed

✅ **FR-19: Rollback on Delete Failure**
- Given: API returns error during todo deletion
- When: Optimistic update removed todo from UI
- Then: Todo reappears in UI, error message displayed

✅ **FR-20: Singapore Timezone Display**
- Given: Todo has due_date "2025-11-15T14:30:00+08:00"
- When: User views todo
- Then: Due date displays as "Nov 15, 2025, 2:30 PM SGT"

### Non-Functional Requirements

✅ **NFR-1: Response Time**
- API responses complete within 200ms for database operations on local development

✅ **NFR-2: Concurrent User Support**
- Application handles multiple authenticated users with isolated data (user_id filtering)

✅ **NFR-3: Data Persistence**
- All todo data persists in SQLite database, survives server restarts

✅ **NFR-4: Security**
- All API endpoints require authentication
- SQL injection prevented via prepared statements
- XSS prevented via React's automatic escaping

✅ **NFR-5: Error Recovery**
- Application handles database errors gracefully without crashing
- Network errors trigger user-friendly error messages

## Testing Requirements

### Unit Tests

**File: `__tests__/lib/db.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { todoDB } from '@/lib/db';
import Database from 'better-sqlite3';

describe('todoDB', () => {
  let testDb: Database.Database;
  const testUserId = 1;

  beforeEach(() => {
    // Use in-memory database for tests
    testDb = new Database(':memory:');
    // Initialize schema (same as lib/db.ts)
  });

  afterEach(() => {
    testDb.close();
  });

  describe('create', () => {
    it('should create a todo with title only', () => {
      const todo = todoDB.create(testUserId, { title: 'Test todo' });
      expect(todo.title).toBe('Test todo');
      expect(todo.completed).toBe(false);
      expect(todo.due_date).toBeNull();
      expect(todo.user_id).toBe(testUserId);
    });

    it('should create a todo with title and due date', () => {
      const dueDate = '2025-11-15T14:30:00+08:00';
      const todo = todoDB.create(testUserId, { title: 'Meeting', due_date: dueDate });
      expect(todo.due_date).toBe(dueDate);
    });

    it('should throw error for title longer than 500 characters', () => {
      const longTitle = 'a'.repeat(501);
      expect(() => todoDB.create(testUserId, { title: longTitle })).toThrow();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no todos exist', () => {
      const todos = todoDB.getAll(testUserId);
      expect(todos).toEqual([]);
    });

    it('should return todos in descending creation order', () => {
      todoDB.create(testUserId, { title: 'First' });
      todoDB.create(testUserId, { title: 'Second' });
      todoDB.create(testUserId, { title: 'Third' });

      const todos = todoDB.getAll(testUserId);
      expect(todos[0].title).toBe('Third');
      expect(todos[2].title).toBe('First');
    });

    it('should only return todos for specified user', () => {
      todoDB.create(1, { title: 'User 1 todo' });
      todoDB.create(2, { title: 'User 2 todo' });

      const user1Todos = todoDB.getAll(1);
      expect(user1Todos).toHaveLength(1);
      expect(user1Todos[0].title).toBe('User 1 todo');
    });
  });

  describe('update', () => {
    it('should update todo title', () => {
      const todo = todoDB.create(testUserId, { title: 'Original' });
      const updated = todoDB.update(testUserId, todo.id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
    });

    it('should update completed status', () => {
      const todo = todoDB.create(testUserId, { title: 'Task' });
      const updated = todoDB.update(testUserId, todo.id, { completed: true });
      expect(updated?.completed).toBe(true);
    });

    it('should return null for non-existent todo', () => {
      const updated = todoDB.update(testUserId, 999, { title: 'New' });
      expect(updated).toBeNull();
    });

    it('should not update todo belonging to different user', () => {
      const todo = todoDB.create(1, { title: 'User 1 todo' });
      const updated = todoDB.update(2, todo.id, { title: 'Hacked' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete existing todo', () => {
      const todo = todoDB.create(testUserId, { title: 'To delete' });
      const deleted = todoDB.delete(testUserId, todo.id);
      expect(deleted).toBe(true);
      expect(todoDB.getById(testUserId, todo.id)).toBeNull();
    });

    it('should return false for non-existent todo', () => {
      const deleted = todoDB.delete(testUserId, 999);
      expect(deleted).toBe(false);
    });

    it('should not delete todo belonging to different user', () => {
      const todo = todoDB.create(1, { title: 'User 1 todo' });
      const deleted = todoDB.delete(2, todo.id);
      expect(deleted).toBe(false);
    });
  });
});
```

### E2E Tests (Playwright)

**File: `tests/02-todo-crud.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers';

test.describe('Todo CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate user with virtual WebAuthn
    await authenticateUser(page);
    await page.goto('/');
  });

  test('should create a todo with title only', async ({ page }) => {
    const todoTitle = 'Buy groceries';

    // Type title and submit
    await page.fill('input[placeholder="Add new todo..."]', todoTitle);
    await page.click('button:has-text("Add")');

    // Verify todo appears in list
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
  });

  test('should create a todo with title and due date', async ({ page }) => {
    const todoTitle = 'Team meeting';
    const dueDate = '2025-11-15T14:30';

    await page.fill('input[placeholder="Add new todo..."]', todoTitle);
    await page.fill('input[type="datetime-local"]', dueDate);
    await page.click('button:has-text("Add")');

    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
    await expect(page.locator('text=/Due:.*Nov 15, 2025.*SGT/')).toBeVisible();
  });

  test('should not create todo with empty title', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add")');

    // Button should be disabled when input is empty
    await expect(addButton).toBeDisabled();

    // Type spaces only
    await page.fill('input[placeholder="Add new todo..."]', '   ');
    await expect(addButton).toBeDisabled();
  });

  test('should display all todos in descending order', async ({ page }) => {
    // Create multiple todos
    await page.fill('input[placeholder="Add new todo..."]', 'First todo');
    await page.click('button:has-text("Add")');
    
    await page.fill('input[placeholder="Add new todo..."]', 'Second todo');
    await page.click('button:has-text("Add")');
    
    await page.fill('input[placeholder="Add new todo..."]', 'Third todo');
    await page.click('button:has-text("Add")');

    // Verify order (newest first)
    const todos = page.locator('[class*="space-y-2"] > div');
    await expect(todos.nth(0)).toContainText('Third todo');
    await expect(todos.nth(1)).toContainText('Second todo');
    await expect(todos.nth(2)).toContainText('First todo');
  });

  test('should edit todo title', async ({ page }) => {
    // Create todo
    await page.fill('input[placeholder="Add new todo..."]', 'Original title');
    await page.click('button:has-text("Add")');

    // Click Edit
    await page.click('button:has-text("Edit")');

    // Change title
    const editInput = page.locator('input[value="Original title"]');
    await editInput.fill('Updated title');
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Updated title')).toBeVisible();
    await expect(page.locator('text=Original title')).not.toBeVisible();
  });

  test('should cancel edit without saving', async ({ page }) => {
    await page.fill('input[placeholder="Add new todo..."]', 'Original title');
    await page.click('button:has-text("Add")');

    await page.click('button:has-text("Edit")');
    await page.locator('input[value="Original title"]').fill('Changed title');
    await page.click('button:has-text("Cancel")');

    // Original title should still be visible
    await expect(page.locator('text=Original title')).toBeVisible();
    await expect(page.locator('text=Changed title')).not.toBeVisible();
  });

  test('should complete and uncomplete todo', async ({ page }) => {
    await page.fill('input[placeholder="Add new todo..."]', 'Task to complete');
    await page.click('button:has-text("Add")');

    const checkbox = page.locator('input[type="checkbox"]').first();
    const todoText = page.locator('text=Task to complete').first();

    // Complete todo
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(todoText).toHaveCSS('text-decoration-line', 'line-through');

    // Uncomplete todo
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(todoText).not.toHaveCSS('text-decoration-line', 'line-through');
  });

  test('should delete todo after confirmation', async ({ page }) => {
    await page.fill('input[placeholder="Add new todo..."]', 'Todo to delete');
    await page.click('button:has-text("Add")');

    // Setup dialog handler to accept
    page.once('dialog', dialog => dialog.accept());

    await page.click('button:has-text("Delete")');

    // Todo should be removed
    await expect(page.locator('text=Todo to delete')).not.toBeVisible();
  });

  test('should not delete todo if confirmation cancelled', async ({ page }) => {
    await page.fill('input[placeholder="Add new todo..."]', 'Todo to keep');
    await page.click('button:has-text("Add")');

    // Setup dialog handler to dismiss
    page.once('dialog', dialog => dialog.dismiss());

    await page.click('button:has-text("Delete")');

    // Todo should still be visible
    await expect(page.locator('text=Todo to keep')).toBeVisible();
  });

  test('should show empty state when no todos', async ({ page }) => {
    await expect(page.locator('text=No todos yet. Create your first one!')).toBeVisible();
  });

  test('should show error message on network failure', async ({ page }) => {
    // Intercept API and return error
    await page.route('/api/todos', route => route.abort('failed'));

    await page.fill('input[placeholder="Add new todo..."]', 'Will fail');
    await page.click('button:has-text("Add")');

    // Error message should appear
    await expect(page.locator('text=/Failed to create todo/')).toBeVisible();
  });

  test('should handle very long todo title', async ({ page }) => {
    const longTitle = 'a'.repeat(500);

    await page.fill('input[placeholder="Add new todo..."]', longTitle);
    await page.click('button:has-text("Add")');

    // Should create successfully
    await expect(page.locator(`text=${longTitle.substring(0, 50)}`)).toBeVisible();
  });

  test('should display overdue todos in red', async ({ page }) => {
    // Create todo with past due date
    const pastDate = '2023-01-01T12:00';
    
    await page.fill('input[placeholder="Add new todo..."]', 'Overdue task');
    await page.fill('input[type="datetime-local"]', pastDate);
    await page.click('button:has-text("Add")');

    // Due date should be red
    const dueText = page.locator('text=/Due:.*Jan 1, 2023/');
    await expect(dueText).toHaveCSS('color', 'rgb(220, 38, 38)'); // red-600
  });
});
```

### Manual Test Cases

1. **Accessibility Testing**
   - Navigate todo list with keyboard (Tab, Enter, Space)
   - Use screen reader to verify ARIA labels
   - Check color contrast for due dates and completed todos

2. **Browser Compatibility**
   - Test in Chrome, Firefox, Safari, Edge
   - Verify datetime-local input works across browsers
   - Check optimistic updates in all browsers

3. **Mobile Responsiveness**
   - Test on iPhone and Android devices
   - Verify touch interactions for checkboxes and buttons
   - Check form inputs on mobile keyboards

4. **Performance Testing**
   - Create 1000 todos, verify page load time
   - Measure time to complete optimistic update cycle
   - Check memory usage with large todo list

## Out of Scope

The following features are explicitly **not included** in this PRP:

1. **Pagination/Infinite Scroll** - All todos loaded at once
2. **Search/Filtering** - Covered in separate PRP (08-search-filtering.md)
3. **Priority Levels** - Covered in separate PRP (02-priority-system.md)
4. **Recurring Todos** - Covered in separate PRP (03-recurring-todos.md)
5. **Reminders/Notifications** - Covered in separate PRP (04-reminders-notifications.md)
6. **Subtasks** - Covered in separate PRP (05-subtasks-progress.md)
7. **Tags/Labels** - Covered in separate PRP (06-tag-system.md)
8. **Templates** - Covered in separate PRP (07-template-system.md)
9. **Calendar View** - Covered in separate PRP (10-calendar-view.md)
10. **Export/Import** - Covered in separate PRP (09-export-import.md)
11. **Bulk Operations** - Multi-select and bulk delete/complete
12. **Undo/Redo** - Action history and reversal
13. **Collaboration** - Shared todos or team features
14. **Attachments** - File uploads for todos
15. **Comments** - Discussion threads on todos
16. **Activity Log** - Audit trail of changes
17. **Real-time Sync** - WebSocket updates across devices
18. **Offline Support** - Service worker and local storage
19. **Dark Mode** - Theme switching (may be added later)
20. **Internationalization** - Multi-language support

## Success Metrics

### User Engagement Metrics

1. **Todo Creation Rate**
   - Target: Users create average 5+ todos per day
   - Measurement: Track POST /api/todos calls per user

2. **Completion Rate**
   - Target: 70%+ of created todos marked complete within 7 days
   - Measurement: Compare completed vs created todos

3. **Error Rate**
   - Target: <1% of CRUD operations result in errors
   - Measurement: Monitor API error responses vs successful responses

4. **Optimistic Update Success**
   - Target: 99%+ of optimistic updates succeed (don't rollback)
   - Measurement: Track rollback events vs optimistic updates

### Technical Performance Metrics

5. **API Response Time**
   - Target: 95th percentile <200ms for all CRUD endpoints
   - Measurement: Server-side latency monitoring

6. **Page Load Time**
   - Target: Initial load <2 seconds with 100 todos
   - Measurement: Lighthouse performance score

7. **Database Query Performance**
   - Target: All queries execute <50ms
   - Measurement: SQLite query execution time logging

### Data Quality Metrics

8. **Data Integrity**
   - Target: 100% of todos have valid user_id, title, and timestamps
   - Measurement: Database constraint violations = 0

9. **Timezone Accuracy**
   - Target: 100% of due dates stored in Singapore timezone
   - Measurement: Audit due_date strings for "+08:00" suffix

### User Satisfaction Metrics

10. **Feature Usage**
    - Target: 80%+ of active users use edit and complete features
    - Measurement: Track usage of PUT endpoints per user

11. **Error Recovery**
    - Target: 90%+ of users retry after failed operation
    - Measurement: Track retry attempts after error responses

12. **Session Length**
    - Target: Average session includes 3+ todo operations
    - Measurement: Count CRUD operations per session

---

**Document Version**: 1.0  
**Last Updated**: November 12, 2025  
**Dependencies**: Authentication (PRP-11), Timezone utilities (lib/timezone.ts)  
**Related PRPs**: All feature PRPs depend on this foundation
