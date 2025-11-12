# Recurring Todos Feature - Implementation Guide

This guide shows how to integrate the recurring todos feature into your existing Next.js todo application.

## 📁 Files Created

```
implementation/
├── lib/
│   ├── types.ts                    # TypeScript type definitions
│   ├── migrations.ts               # Database migration script
│   └── recurrence-utils.ts         # Date calculation utilities
├── app/api/todos/[id]/
│   └── route.ts                    # API route with recurring logic
└── components/
    ├── RecurrenceSelector.tsx      # Dropdown for selecting pattern
    ├── RecurrenceIndicator.tsx     # Visual indicator icons
    └── TodoItem.tsx                # Example todo item component
```

## 🔧 Integration Steps

### Step 1: Update Database Schema

Add the `recurrence_pattern` column to your `todos` table:

```typescript
// In your lib/db.ts initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    recurrence_pattern TEXT,  -- ADD THIS LINE
    reminder_minutes INTEGER,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
```

**For existing databases**, run the migration:

```typescript
import { migrateRecurringTodos } from './implementation/lib/migrations';

// After db initialization
migrateRecurringTodos(db);
```

### Step 2: Add Type Definitions

Merge the types from `implementation/lib/types.ts` into your `lib/db.ts`:

```typescript
// Add to lib/db.ts
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Update your existing Todo interface
export interface Todo {
  // ... existing fields
  recurrence_pattern: RecurrencePattern | null; // ADD THIS
}
```

### Step 3: Add Utility Functions

Copy functions from `implementation/lib/recurrence-utils.ts` to your `lib/timezone.ts`:

```typescript
// Add these to lib/timezone.ts
export { 
  calculateNextDueDate,
  getRecurrenceDescription 
} from './implementation/lib/recurrence-utils';
```

Or copy the entire content into `lib/timezone.ts`.

### Step 4: Update API Route

Replace or merge `implementation/app/api/todos/[id]/route.ts` with your existing `app/api/todos/[id]/route.ts`.

**Key changes:**
- Import `calculateNextDueDate` from timezone utilities
- Add `handleRecurringTodoCompletion()` function
- Modify PUT handler to detect recurring completion
- Create next instance with cloned metadata

**Critical code section:**

```typescript
// In PUT handler
if (body.completed && !todo.completed && todo.recurrence_pattern) {
  return handleRecurringTodoCompletion(todo, session.userId);
}
```

### Step 5: Update Todo Creation API

Modify `POST /api/todos` to accept `recurrence_pattern`:

```typescript
// In app/api/todos/route.ts
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { title, due_date, priority, recurrence_pattern, reminder_minutes, tag_ids, subtasks } = body;

  // Validate recurrence pattern
  const validPatterns = ['daily', 'weekly', 'monthly', 'yearly', null];
  if (recurrence_pattern && !validPatterns.includes(recurrence_pattern)) {
    return NextResponse.json({ error: 'Invalid recurrence pattern' }, { status: 400 });
  }

  // Create todo with recurrence_pattern
  const result = db.prepare(`
    INSERT INTO todos (user_id, title, due_date, priority, recurrence_pattern, reminder_minutes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(session.userId, title, due_date || null, priority || 'medium', recurrence_pattern || null, reminder_minutes || null);

  // ... rest of creation logic
}
```

### Step 6: Integrate UI Components

#### In your Todo Creation/Edit Modal

```typescript
'use client';

import { useState } from 'react';
import { RecurrenceSelector } from '@/implementation/components/RecurrenceSelector';
import type { RecurrencePattern } from '@/lib/types';

function TodoModal({ isOpen, onClose, existingTodo }) {
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(
    existingTodo?.recurrence_pattern || null
  );

  const handleSubmit = async () => {
    const todoData = {
      title,
      due_date,
      priority,
      recurrence_pattern: recurrencePattern, // Include this
      // ... other fields
    };

    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todoData)
    });
  };

  return (
    <div>
      {/* Other form fields */}
      
      <RecurrenceSelector
        value={recurrencePattern}
        onChange={setRecurrencePattern}
      />
      
      <button onClick={handleSubmit}>Save Todo</button>
    </div>
  );
}
```

#### In your Todo List Display

```typescript
import { RecurrenceIcon } from '@/implementation/components/RecurrenceIndicator';

function TodoList({ todos }) {
  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id} className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={todo.completed}
            onChange={() => handleToggle(todo.id)}
          />
          <span>{todo.title}</span>
          <RecurrenceIcon pattern={todo.recurrence_pattern} />
        </div>
      ))}
    </div>
  );
}
```

### Step 7: Handle Completion Response

Update your todo completion handler to handle the recurring response:

```typescript
async function handleToggleComplete(todoId: number) {
  const response = await fetch(`/api/todos/${todoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true })
  });

  const data = await response.json();

  if (data.next_instance) {
    // This was a recurring todo
    toast.success(
      `Recurring todo completed! Next instance scheduled for ${formatSingaporeDate(data.next_instance.due_date)}`
    );
    
    // Update state with both completed and next instance
    setTodos(prev => [
      ...prev.filter(t => t.id !== todoId),
      data.next_instance
    ]);
  } else {
    // Regular todo
    toast.success('Todo completed!');
    setTodos(prev => 
      prev.map(t => t.id === todoId ? data : t)
    );
  }
}
```

## 🧪 Testing

### Manual Testing Checklist

1. **Create Recurring Todo**
   - [ ] Create todo with daily recurrence
   - [ ] Verify recurrence icon appears
   - [ ] Check database has `recurrence_pattern = 'daily'`

2. **Complete Recurring Todo**
   - [ ] Mark recurring todo as complete
   - [ ] Verify success message shows next due date
   - [ ] Confirm next instance appears in list
   - [ ] Check next instance has same priority
   - [ ] Verify tags are cloned
   - [ ] Verify subtasks are cloned (uncompleted)

3. **Test All Patterns**
   - [ ] Daily: Next due date is +1 day
   - [ ] Weekly: Next due date is +7 days
   - [ ] Monthly: Next due date is +1 month
   - [ ] Yearly: Next due date is +1 year

4. **Edit Recurrence**
   - [ ] Change pattern from daily to weekly
   - [ ] Set pattern to "Does not repeat" (removes recurrence)

5. **Edge Cases**
   - [ ] Complete recurring todo without due date (uses current time)
   - [ ] Complete monthly recurring on Jan 31 (adjusts to Feb 28/29)
   - [ ] Delete recurring todo (only current instance deleted)

### Automated Tests

Use the Playwright test file (see Step 8 below):

```bash
npx playwright test tests/03-recurring-todos.spec.ts
```

## 🎨 UI Customization

### Change Recurrence Icons

Edit `RecurrenceIndicator.tsx`:

```typescript
const icons: Record<RecurrencePattern, string> = {
  daily: '↻',      // or any other icon
  weekly: '📆',
  monthly: '📅',
  yearly: '🎂'
};
```

### Change Color Scheme

Edit the `colors` object in `RecurrenceIndicator.tsx`:

```typescript
const colors: Record<RecurrencePattern, string> = {
  daily: 'text-blue-600 dark:text-blue-400',
  weekly: 'text-green-600 dark:text-green-400',
  monthly: 'text-purple-600 dark:text-purple-400',
  yearly: 'text-orange-600 dark:text-orange-400'
};
```

## 📊 Database Queries

### Get all recurring todos

```typescript
const recurringTodos = db.prepare(`
  SELECT * FROM todos 
  WHERE user_id = ? AND recurrence_pattern IS NOT NULL
`).all(userId);
```

### Get todos by pattern

```typescript
const dailyTodos = db.prepare(`
  SELECT * FROM todos 
  WHERE user_id = ? AND recurrence_pattern = 'daily'
`).all(userId);
```

### Count recurring completions

```typescript
const stats = db.prepare(`
  SELECT 
    recurrence_pattern,
    COUNT(*) as count
  FROM todos 
  WHERE user_id = ? AND completed = 1 AND recurrence_pattern IS NOT NULL
  GROUP BY recurrence_pattern
`).all(userId);
```

## 🐛 Common Issues

### Issue: Next instance not created

**Cause:** Missing recurrence pattern in database

**Fix:** Verify column exists:
```bash
sqlite3 todos.db "PRAGMA table_info(todos);"
```

### Issue: Wrong due date calculation

**Cause:** Not using Singapore timezone

**Fix:** Ensure all date operations use `getSingaporeNow()`:
```typescript
import { getSingaporeNow } from '@/lib/timezone';
const now = getSingaporeNow(); // NOT new Date()
```

### Issue: Tags/subtasks not cloned

**Cause:** Missing cloning logic in API route

**Fix:** Verify `handleRecurringTodoCompletion()` includes:
```typescript
// Clone tags
for (const tag of todo.tags) {
  db.prepare(`INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)`).run(nextTodoId, tag.id);
}

// Clone subtasks
for (const subtask of todo.subtasks) {
  db.prepare(`INSERT INTO subtasks (todo_id, title, position, completed) VALUES (?, ?, ?, 0)`)
    .run(nextTodoId, subtask.title, subtask.position);
}
```

## 🚀 Advanced Features (Optional)

### Preview Next Instances

Show users the next 3 due dates:

```typescript
function getNextInstances(dueDate: string, pattern: RecurrencePattern, count: number = 3) {
  const dates = [];
  let current = dueDate;
  
  for (let i = 0; i < count; i++) {
    current = calculateNextDueDate(current, pattern);
    dates.push(current);
  }
  
  return dates;
}
```

### Skip Next Instance

Add a "Complete without creating next" option:

```typescript
// In API route
if (body.completed && body.skipNextInstance) {
  // Don't create next instance
  updateTodo(todoId, { completed: true }, userId);
  return NextResponse.json({ ...todo, completed: true });
}
```

### Recurring Series Analytics

Track completion rate per recurring series:

```typescript
// Add series_id to track related instances
ALTER TABLE todos ADD COLUMN series_id TEXT;

// When creating first recurring todo
const seriesId = `recurring-${userId}-${Date.now()}`;

// Include series_id in next instances
// Query all instances: SELECT * FROM todos WHERE series_id = ?
```

## 📚 API Reference

### POST /api/todos
Create a new todo (possibly recurring)

**Body:**
```json
{
  "title": "Daily standup",
  "due_date": "2025-11-13T09:00:00+08:00",
  "priority": "high",
  "recurrence_pattern": "daily",
  "reminder_minutes": 30,
  "tag_ids": [1, 2],
  "subtasks": [
    { "title": "Prepare updates", "position": 0 }
  ]
}
```

### PUT /api/todos/[id]
Update todo (handle recurring completion)

**Body (regular update):**
```json
{
  "title": "Updated title",
  "recurrence_pattern": "weekly"
}
```

**Body (complete recurring):**
```json
{
  "completed": true
}
```

**Response (recurring completion):**
```json
{
  "completed_todo": { ... },
  "next_instance": {
    "id": 43,
    "title": "Daily standup",
    "due_date": "2025-11-14T09:00:00+08:00",
    "recurrence_pattern": "daily",
    "tags": [...],
    "subtasks": [...]
  }
}
```

## 🎯 Success Criteria

Your implementation is complete when:

- [ ] Database has `recurrence_pattern` column
- [ ] Can create todos with recurrence patterns
- [ ] Recurrence indicator shows in UI
- [ ] Completing recurring todo creates next instance
- [ ] Next instance has correct due date
- [ ] Tags are cloned to next instance
- [ ] Subtasks are cloned (uncompleted)
- [ ] Priority is inherited
- [ ] Reminder offset is inherited
- [ ] Can edit recurrence pattern
- [ ] Can remove recurrence (set to null)
- [ ] Singapore timezone used throughout
- [ ] Success message shows next due date

## 📞 Support

If you encounter issues:

1. Check the PRP document: `PRPs/03-recurring-todos.md`
2. Review `.github/copilot-instructions.md` for project patterns
3. Verify database schema with: `sqlite3 todos.db ".schema todos"`
4. Check API responses in browser DevTools Network tab
5. Review server logs for errors

---

**Last Updated:** November 12, 2025  
**Feature Version:** 1.0  
**Compatible with:** Next.js 16, React 19, better-sqlite3
