# PRP-03: Recurring Todos

## Feature Overview

The Recurring Todos feature enables users to create tasks that automatically regenerate on a defined schedule (daily, weekly, monthly, or yearly). This eliminates manual recreation of routine tasks and ensures consistent habit tracking.

**Key Capabilities:**
- **Four Recurrence Patterns**: Daily, weekly, monthly, and yearly repetition
- **Automatic Instance Creation**: When a recurring todo is completed, the system immediately creates the next instance with a calculated due date
- **Metadata Inheritance**: Priority, tags, reminder settings, subtasks, and description carry over to the next instance
- **Singapore Timezone Handling**: All date calculations use `Asia/Singapore` timezone to ensure accuracy across daylight saving boundaries
- **Independent Instance Management**: Each generated instance can be modified or deleted without affecting the recurrence chain

This feature is essential for:
- Daily habits (exercise, journaling, medication)
- Weekly routines (team meetings, grocery shopping, lawn care)
- Monthly obligations (bill payments, reports, maintenance checks)
- Yearly events (renewals, birthdays, annual reviews)

## User Stories

### Primary User Personas

**1. Health-Conscious Professional (Emma)**
> "As someone tracking daily wellness habits, I need my 'Morning workout' and 'Take vitamins' tasks to automatically recreate every day so I can maintain consistency without manual task creation."

**Goals:**
- Build daily habits with visual tracking
- Reduce decision fatigue from repetitive task entry
- Maintain streaks and accountability

**2. Project Manager (David)**
> "As a project manager running weekly standups and monthly retrospectives, I need recurring meeting preparation tasks so I never forget to send agendas or compile status reports."

**Goals:**
- Automate routine project management tasks
- Ensure timely preparation for recurring meetings
- Standardize team processes

**3. Homeowner (Lisa)**
> "As a homeowner managing property maintenance, I need yearly reminders for HVAC servicing, insurance renewals, and inspection scheduling so critical tasks don't slip through the cracks."

**Goals:**
- Track infrequent but important tasks
- Avoid costly missed maintenance windows
- Plan ahead for annual expenses

### User Needs

- Eliminate repetitive task creation for routine activities
- Maintain task consistency (same priority, tags, subtasks)
- Flexible recurrence patterns for different frequencies
- Ability to skip or modify individual instances
- Clear visual indication of recurring vs. one-time tasks

## User Flow

### Primary Flow: Creating a Recurring Todo

1. User clicks **"Add Todo"** button
2. User enters todo title: "Weekly team standup prep"
3. User sets **due date**: "2025-11-15 Friday 9:00 AM"
4. User sets **priority**: "High"
5. User adds **tags**: "Work", "Meetings"
6. User clicks **"Recurrence"** dropdown → selects **"Weekly"**
7. User optionally adds **reminder**: "1 day before"
8. User clicks **"Add Todo"**
9. **System creates todo** with `recurrence_pattern = 'weekly'`
10. **System displays recurring icon** (🔄) next to todo title
11. Todo appears in list with all standard features active

### Secondary Flow: Completing Recurring Todo (Triggers Next Instance)

1. User locates recurring todo: "Weekly team standup prep" (due Nov 15)
2. User clicks **checkbox** to mark complete
3. **System marks current instance as completed**
4. **System calculates next due date**: Nov 15 + 7 days = Nov 22
5. **System creates new todo instance** with:
   - Same title: "Weekly team standup prep"
   - Same priority: "High"
   - Same tags: "Work", "Meetings"
   - Same recurrence pattern: "Weekly"
   - Same reminder offset: "1 day before"
   - New due date: "2025-11-22 Friday 9:00 AM"
   - **No subtasks** (subtasks don't inherit by default—see Edge Cases)
6. **System displays new instance** at top of todo list (high priority)
7. Completed instance moves to completed section
8. User sees visual continuity with recurring icon on both instances

### Tertiary Flow: Modifying Recurring Todo Instance

1. User wants to reschedule one instance without affecting future occurrences
2. User clicks **edit** on "Weekly team standup prep" (due Nov 22)
3. User changes **due date** to Nov 23 (Saturday)
4. User clicks **"Save"**
5. **System updates only this instance**
6. When user completes this instance, next instance calculates from **original pattern** (Nov 22 + 7 days = Nov 29), not modified date
7. Recurrence chain continues normally

### Quaternary Flow: Breaking Recurrence Chain

1. User decides to stop recurring todo permanently
2. User clicks **edit** on recurring todo
3. User changes **recurrence dropdown** to **"None"**
4. User clicks **"Save"**
5. **System updates `recurrence_pattern` to NULL**
6. When user completes this instance, **no next instance is created**
7. Todo behaves as one-time task from this point forward

### Edge Flow: Skipping an Instance

1. User realizes they won't complete this week's instance (on vacation)
2. User **deletes** current instance without marking complete
3. **No next instance is automatically created** (deletion doesn't trigger creation)
4. User must manually create next instance or wait for return to resume pattern
5. Alternative: User can mark complete to generate next instance, then delete the new one

## Technical Requirements

### Database Schema

The `todos` table includes recurrence support:

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  is_completed INTEGER DEFAULT 0,
  due_date TEXT, -- ISO 8601 format with timezone: 2025-11-15T09:00:00+08:00
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_todos_recurrence ON todos(recurrence_pattern);
CREATE INDEX idx_todos_user_due_date ON todos(user_id, due_date);
```

**Key Fields:**
- `recurrence_pattern`: NULL for one-time todos, or one of the four patterns
- `due_date`: Used as base for calculating next instance due date
- **No** `parent_todo_id` or chain tracking—each instance is independent

### TypeScript Types

Add to `lib/db.ts`:

```typescript
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  is_completed: number;
  due_date: string | null; // ISO 8601 with timezone
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

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
```

### Due Date Calculation Logic

**Critical**: All calculations must use Singapore timezone via `lib/timezone.ts`:

```typescript
// lib/timezone.ts
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

const SINGAPORE_TZ = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  return utcToZonedTime(new Date(), SINGAPORE_TZ);
}

export function calculateNextDueDate(
  currentDueDate: string | null,
  recurrencePattern: RecurrencePattern
): string {
  if (!currentDueDate) {
    throw new Error('Due date required for recurring todos');
  }
  
  // Parse current due date in Singapore timezone
  const currentDate = new Date(currentDueDate);
  const sgDate = utcToZonedTime(currentDate, SINGAPORE_TZ);
  
  let nextDate: Date;
  
  switch (recurrencePattern) {
    case 'daily':
      nextDate = addDays(sgDate, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(sgDate, 1);
      break;
    case 'monthly':
      nextDate = addMonths(sgDate, 1);
      break;
    case 'yearly':
      nextDate = addYears(sgDate, 1);
      break;
    default:
      throw new Error(`Invalid recurrence pattern: ${recurrencePattern}`);
  }
  
  // Convert back to ISO string with timezone
  return format(nextDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: SINGAPORE_TZ });
}
```

**Edge Case Handling:**

1. **Monthly recurrence on day 31**: If current date is Jan 31 and pattern is monthly, next date is Feb 28/29 (last day of month)
   ```typescript
   // Use date-fns addMonths which handles this automatically
   addMonths(new Date('2025-01-31'), 1) // Returns Feb 28, 2025
   ```

2. **Leap year handling**: Yearly recurrence from Feb 29 → non-leap year becomes Feb 28
   ```typescript
   addYears(new Date('2024-02-29'), 1) // Returns Feb 28, 2025
   ```

3. **Daylight saving time**: Singapore doesn't observe DST, but calculations use `date-fns-tz` for consistency

### API Endpoints

#### 1. Create Recurring Todo

**Endpoint**: `POST /api/todos`

**Request Body**:
```json
{
  "title": "Daily morning workout",
  "description": "30-minute cardio session",
  "priority": "high",
  "due_date": "2025-11-13T07:00:00+08:00",
  "recurrence_pattern": "daily",
  "reminder_minutes": 60
}
```

**Response** (201 Created):
```json
{
  "id": 100,
  "user_id": 1,
  "title": "Daily morning workout",
  "description": "30-minute cardio session",
  "priority": "high",
  "is_completed": 0,
  "due_date": "2025-11-13T07:00:00+08:00",
  "recurrence_pattern": "daily",
  "reminder_minutes": 60,
  "last_notification_sent": null,
  "created_at": "2025-11-12T14:30:00+08:00",
  "updated_at": "2025-11-12T14:30:00+08:00"
}
```

**Validation Rules**:
- `recurrence_pattern` must be one of: `daily`, `weekly`, `monthly`, `yearly`, or `null`
- `due_date` is **required** when `recurrence_pattern` is set
- Returns 400 if recurrence pattern is set without due date

#### 2. Complete Recurring Todo (Triggers Next Instance)

**Endpoint**: `PUT /api/todos/[id]`

**Request Body**:
```json
{
  "is_completed": 1
}
```

**Response** (200 OK):
```json
{
  "completedTodo": {
    "id": 100,
    "is_completed": 1,
    "updated_at": "2025-11-13T07:30:00+08:00"
  },
  "nextTodo": {
    "id": 101,
    "title": "Daily morning workout",
    "priority": "high",
    "due_date": "2025-11-14T07:00:00+08:00",
    "recurrence_pattern": "daily",
    "reminder_minutes": 60,
    "created_at": "2025-11-13T07:30:00+08:00"
  }
}
```

**Server-Side Logic** (in `app/api/todos/[id]/route.ts`):

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const { id } = await params;
  const updates = await request.json();
  
  // Get current todo
  const todo = todoDB.getById(parseInt(id), session.userId);
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }
  
  // Update current todo
  const success = todoDB.update(parseInt(id), session.userId, updates);
  if (!success) {
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
  
  let nextTodo = null;
  
  // If marking as completed AND has recurrence pattern, create next instance
  if (updates.is_completed === 1 && todo.recurrence_pattern && todo.due_date) {
    const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);
    
    // Fetch current tags and subtasks
    const tags = tagDB.getByTodoId(todo.id);
    
    // Create next instance
    const newTodoId = todoDB.create({
      user_id: session.userId,
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      due_date: nextDueDate,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes
    });
    
    // Copy tags to next instance
    tags.forEach(tag => {
      db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)')
        .run(newTodoId, tag.id);
    });
    
    nextTodo = todoDB.getById(newTodoId, session.userId);
  }
  
  return NextResponse.json({
    completedTodo: todoDB.getById(parseInt(id), session.userId),
    nextTodo
  });
}
```

#### 3. Update Recurrence Pattern

**Endpoint**: `PUT /api/todos/[id]`

**Request Body** (change pattern):
```json
{
  "recurrence_pattern": "weekly"
}
```

**Request Body** (remove recurrence):
```json
{
  "recurrence_pattern": null
}
```

**Response** (200 OK):
```json
{
  "id": 100,
  "recurrence_pattern": "weekly",
  "updated_at": "2025-11-13T08:00:00+08:00"
}
```

**Validation**:
- Changing to non-null pattern requires `due_date` to exist
- Returns 400 if trying to set pattern without due date

### Database Operations

Add to `lib/db.ts`:

```typescript
export const todoDB = {
  // ... existing methods ...
  
  getRecurring(userId: number): Todo[] {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? AND recurrence_pattern IS NOT NULL
      ORDER BY due_date ASC NULLS LAST
    `);
    return stmt.all(userId) as Todo[];
  },
  
  getByRecurrencePattern(userId: number, pattern: RecurrencePattern): Todo[] {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? AND recurrence_pattern = ?
      ORDER BY due_date ASC
    `);
    return stmt.all(userId, pattern) as Todo[];
  },
  
  createNextInstance(originalTodo: Todo, nextDueDate: string): number {
    const stmt = db.prepare(`
      INSERT INTO todos (
        user_id, title, description, priority, due_date,
        recurrence_pattern, reminder_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      originalTodo.user_id,
      originalTodo.title,
      originalTodo.description,
      originalTodo.priority,
      nextDueDate,
      originalTodo.recurrence_pattern,
      originalTodo.reminder_minutes
    );
    
    return result.lastInsertRowid as number;
  }
};
```

## UI Components

### Recurrence Selector Component

```tsx
import { RecurrencePattern, RECURRENCE_CONFIG } from '@/lib/db';

interface RecurrenceSelectorProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
  disabled?: boolean;
  hasDueDate: boolean; // Required to enable recurrence
}

export function RecurrenceSelector({ 
  value, 
  onChange, 
  disabled,
  hasDueDate 
}: RecurrenceSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="recurrence" className="text-sm font-medium text-gray-700">
        Recurrence
      </label>
      <select
        id="recurrence"
        value={value ?? 'none'}
        onChange={(e) => {
          const val = e.target.value === 'none' ? null : (e.target.value as RecurrencePattern);
          onChange(val);
        }}
        disabled={disabled || !hasDueDate}
        className="
          rounded-md border border-gray-300 px-3 py-2 text-sm
          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
        "
        aria-label="Select recurrence pattern"
      >
        <option value="none">No recurrence</option>
        <option value="daily">
          {RECURRENCE_CONFIG.daily.icon} {RECURRENCE_CONFIG.daily.label}
        </option>
        <option value="weekly">
          {RECURRENCE_CONFIG.weekly.icon} {RECURRENCE_CONFIG.weekly.label}
        </option>
        <option value="monthly">
          {RECURRENCE_CONFIG.monthly.icon} {RECURRENCE_CONFIG.monthly.label}
        </option>
        <option value="yearly">
          {RECURRENCE_CONFIG.yearly.icon} {RECURRENCE_CONFIG.yearly.label}
        </option>
      </select>
      
      {!hasDueDate && (
        <p className="text-xs text-amber-600">
          ⚠️ Set a due date to enable recurrence
        </p>
      )}
      
      {value && (
        <p className="text-xs text-gray-500">
          {RECURRENCE_CONFIG[value].description}
        </p>
      )}
    </div>
  );
}
```

### Recurrence Badge Component

```tsx
import { RecurrencePattern, RECURRENCE_CONFIG } from '@/lib/db';

interface RecurrenceBadgeProps {
  pattern: RecurrencePattern;
}

export function RecurrenceBadge({ pattern }: RecurrenceBadgeProps) {
  const config = RECURRENCE_CONFIG[pattern];
  
  return (
    <span 
      className="
        inline-flex items-center gap-1 rounded-full border
        bg-blue-50 text-blue-700 border-blue-200
        px-2.5 py-1 text-xs font-medium
      "
      aria-label={`Recurring: ${config.label}`}
      title={config.description}
    >
      <span className="text-sm">{config.icon}</span>
      {config.label}
    </span>
  );
}
```

### Todo Card with Recurrence Indicator

```tsx
import { Todo } from '@/lib/db';
import { RecurrenceBadge } from './RecurrenceBadge';
import { PriorityBadge } from './PriorityBadge';

interface TodoCardProps {
  todo: Todo;
  onComplete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function TodoCard({ todo, onComplete, onEdit }: TodoCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={todo.is_completed === 1}
          onChange={() => onComplete(todo.id)}
          className="mt-1 h-5 w-5 rounded border-gray-300"
          aria-label={`Mark "${todo.title}" as complete`}
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            text-lg font-semibold text-gray-900
            ${todo.is_completed ? 'line-through text-gray-500' : ''}
          `}>
            {todo.title}
          </h3>
          
          {todo.description && (
            <p className="mt-1 text-sm text-gray-600">{todo.description}</p>
          )}
          
          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={todo.priority} />
            
            {todo.recurrence_pattern && (
              <RecurrenceBadge pattern={todo.recurrence_pattern} />
            )}
            
            {todo.due_date && (
              <span className="text-xs text-gray-500">
                Due: {new Date(todo.due_date).toLocaleString('en-SG', {
                  timeZone: 'Asia/Singapore',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <button
          onClick={() => onEdit(todo.id)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Edit todo"
        >
          ✏️
        </button>
      </div>
    </div>
  );
}
```

### Integration in Main Todo Component

```tsx
// In app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Todo, RecurrencePattern } from '@/lib/db';
import { RecurrenceSelector } from '@/components/RecurrenceSelector';
import { TodoCard } from '@/components/TodoCard';

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    recurrence_pattern: null as RecurrencePattern | null,
    reminder_minutes: null as number | null
  });
  
  const handleCreateTodo = async () => {
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create todo');
        return;
      }
      
      const created = await response.json();
      setTodos(prev => [created, ...prev]);
      
      // Reset form
      setNewTodo({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        recurrence_pattern: null,
        reminder_minutes: null
      });
    } catch (error) {
      console.error('Error creating todo:', error);
      alert('Failed to create todo');
    }
  };
  
  const handleCompleteTodo = async (todoId: number) => {
    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === todoId ? { ...t, is_completed: 1 } : t
    ));
    
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: 1 })
      });
      
      if (!response.ok) throw new Error('Failed to complete todo');
      
      const { completedTodo, nextTodo } = await response.json();
      
      // Update state with completed todo and add next instance if created
      setTodos(prev => {
        const updated = prev.map(t => 
          t.id === todoId ? completedTodo : t
        );
        
        if (nextTodo) {
          return [nextTodo, ...updated];
        }
        
        return updated;
      });
    } catch (error) {
      // Revert on error
      setTodos(prev => prev.map(t => 
        t.id === todoId ? { ...t, is_completed: 0 } : t
      ));
      console.error('Error completing todo:', error);
      alert('Failed to complete todo');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Create Todo Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Add New Todo</h2>
        
        <input
          type="text"
          placeholder="Todo title"
          value={newTodo.title}
          onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md mb-4"
        />
        
        <input
          type="datetime-local"
          value={newTodo.due_date}
          onChange={(e) => setNewTodo(prev => ({ ...prev, due_date: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md mb-4"
        />
        
        <RecurrenceSelector
          value={newTodo.recurrence_pattern}
          onChange={(pattern) => setNewTodo(prev => ({ ...prev, recurrence_pattern: pattern }))}
          hasDueDate={!!newTodo.due_date}
        />
        
        <button
          onClick={handleCreateTodo}
          disabled={!newTodo.title}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add Todo
        </button>
      </div>
      
      {/* Todo List */}
      <div className="space-y-4">
        {todos.map(todo => (
          <TodoCard
            key={todo.id}
            todo={todo}
            onComplete={handleCompleteTodo}
            onEdit={() => {/* Edit logic */}}
          />
        ))}
      </div>
    </div>
  );
}
```

## Edge Cases

### 1. Completing Recurring Todo Without Due Date

**Scenario**: User creates recurring todo but later removes due date, then tries to complete it

**Expected Behavior**:
- System marks todo as complete normally
- **No next instance is created** (due date required for calculation)
- System logs warning but doesn't throw error
- User can manually add due date and recurrence back if needed

**Implementation**:
```typescript
if (updates.is_completed === 1 && todo.recurrence_pattern) {
  if (!todo.due_date) {
    console.warn(`Cannot create next instance for todo ${todo.id}: missing due date`);
    // Just complete the todo, no next instance
  } else {
    // Proceed with next instance creation
  }
}
```

### 2. Monthly Recurrence on Day 29-31

**Scenario**: User creates monthly recurring todo on Jan 31

**Expected Behavior**:
- Feb instance: Feb 28 (or Feb 29 in leap years)
- Mar instance: Mar 31
- Apr instance: Apr 30
- May instance: May 31
- Uses `date-fns addMonths()` which handles this correctly

**Test Cases**:
```typescript
// Jan 31 → Feb 28 (non-leap year)
calculateNextDueDate('2025-01-31T10:00:00+08:00', 'monthly')
// Returns: '2025-02-28T10:00:00+08:00'

// Jan 31 → Feb 29 (leap year)
calculateNextDueDate('2024-01-31T10:00:00+08:00', 'monthly')
// Returns: '2024-02-29T10:00:00+08:00'
```

### 3. Yearly Recurrence on Feb 29 (Leap Year)

**Scenario**: User creates yearly recurring todo on Feb 29, 2024

**Expected Behavior**:
- 2025 instance: Feb 28, 2025 (non-leap year adjustment)
- 2026 instance: Feb 28, 2026
- 2028 instance: Feb 29, 2028 (next leap year)

**Implementation**:
```typescript
// date-fns addYears handles leap year edge cases
addYears(new Date('2024-02-29'), 1) // Returns Feb 28, 2025
addYears(new Date('2024-02-29'), 4) // Returns Feb 29, 2028
```

### 4. Subtask Inheritance

**Scenario**: User completes recurring todo that has subtasks

**Expected Behavior** (Current Scope):
- **Subtasks do NOT inherit** to next instance
- Only metadata (priority, tags, reminder, description) carries over
- User must manually add subtasks to each new instance

**Rationale**:
- Subtask completion status is instance-specific
- Copying incomplete subtasks could be confusing
- Users may want different subtasks for each occurrence

**Future Enhancement** (Out of Scope):
- Template system (PRP-07) will handle subtask patterns
- Users can create templates with predefined subtasks

### 5. Rapid Completion (Completing Multiple Instances Quickly)

**Scenario**: User completes several days of daily todo at once (catching up)

**Expected Behavior**:
- Each completion creates next instance immediately
- User sees: Nov 12 (complete) → creates Nov 13 → complete Nov 13 → creates Nov 14 → etc.
- No "bulk skip" to current date
- Each instance is independent and can be individually reviewed

**User Flow**:
1. User has "Daily meditation" due Nov 10 (today is Nov 12)
2. User completes Nov 10 instance → creates Nov 11 instance
3. User completes Nov 11 instance → creates Nov 12 instance
4. User completes Nov 12 instance → creates Nov 13 instance (future)

### 6. Changing Recurrence Pattern Mid-Chain

**Scenario**: User has weekly recurring todo, changes it to monthly

**Expected Behavior**:
- Change applies to current instance only
- Next instance uses **new pattern** (monthly from current due date)
- Previous instances remain unchanged (already completed)
- No retroactive chain modification

**Example**:
- Original: Weekly todo every Friday
- User changes to monthly on Nov 15
- When completed, next instance is Dec 15 (monthly pattern)

### 7. Deleting Recurring Todo Instance

**Scenario**: User deletes a recurring todo without completing it

**Expected Behavior**:
- Instance is deleted from database
- **No next instance is created** (deletion doesn't trigger creation logic)
- Recurrence chain is effectively broken at this point
- User must manually create new instance to resume pattern

### 8. Timezone Edge Cases

**Scenario**: System crosses midnight during completion

**Expected Behavior**:
- All calculations use Singapore timezone consistently
- Completion timestamp: Singapore time when API request processed
- Next due date: Calculated from original due date + pattern offset
- No timezone confusion even if server is in different timezone

**Implementation**:
```typescript
// Always use Singapore timezone for consistency
import { getSingaporeNow, calculateNextDueDate } from '@/lib/timezone';

// Completion time
const completedAt = getSingaporeNow().toISOString();

// Next due date calculation
const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);
```

### 9. Completing Before Due Date

**Scenario**: User completes recurring todo 2 days before due date

**Expected Behavior**:
- Current instance marked complete immediately
- Next instance calculates from **original due date**, not completion date
- Example: Due Nov 15, completed Nov 13 → next instance due Nov 22 (weekly)
- Prevents pattern drift from early completions

### 10. No Due Date Validation on Create

**Scenario**: User tries to create recurring todo without due date

**Expected Behavior**:
- API returns 400 Bad Request
- Error message: "Due date is required for recurring todos"
- UI prevents selection of recurrence pattern when due date is empty

**Validation**:
```typescript
// In POST /api/todos
if (recurrence_pattern && !due_date) {
  return NextResponse.json(
    { error: 'Due date is required for recurring todos' },
    { status: 400 }
  );
}
```

## Acceptance Criteria

### Functional Requirements

✅ **AC-1**: User can create todo with recurrence pattern (daily/weekly/monthly/yearly)
- Recurrence selector is visible in create form
- Selector disabled until due date is set
- Selected pattern is saved to database

✅ **AC-2**: Completing recurring todo automatically creates next instance
- Next instance appears immediately after completion
- Next due date calculated correctly based on pattern
- Original metadata (priority, tags, reminder) copied to next instance

✅ **AC-3**: Next instance due date calculation is accurate
- Daily: +1 day
- Weekly: +7 days
- Monthly: +1 month (handles end-of-month correctly)
- Yearly: +1 year (handles leap year correctly)

✅ **AC-4**: Each instance is independent
- Editing one instance doesn't affect others
- Deleting one instance doesn't cascade
- Completion status is per-instance

✅ **AC-5**: Recurring todos display recurrence badge
- Badge shows pattern type (Daily/Weekly/Monthly/Yearly)
- Badge visible on both incomplete and completed instances
- Badge includes icon for quick visual recognition

✅ **AC-6**: User can change recurrence pattern of existing todo
- Pattern can be changed from any type to any other type
- Pattern can be removed (set to none) to break recurrence
- Change applies to current instance and future instances

✅ **AC-7**: User can remove recurrence to make todo one-time
- Setting pattern to "none" breaks recurrence chain
- Completing de-recurred todo doesn't create next instance
- Original metadata preserved

✅ **AC-8**: Recurrence requires due date
- Cannot set recurrence pattern without due date
- API validation prevents invalid state
- UI shows clear message when due date missing

✅ **AC-9**: Tags are copied to next instance
- All tags from completed instance copied to next
- Tag relationships maintained in junction table
- Tag count consistent across instances

✅ **AC-10**: Deleting recurring todo doesn't trigger next instance
- Only completion triggers next instance creation
- Deletion breaks recurrence chain
- No orphaned instances created

### Non-Functional Requirements

✅ **AC-11**: All date calculations use Singapore timezone
- Uses `lib/timezone.ts` for all date operations
- No timezone drift or inconsistencies
- Works correctly across DST boundaries (though SG has none)

✅ **AC-12**: Next instance creation is atomic
- Either both completion and creation succeed, or both fail
- No partial state (completed without next instance)
- Database transaction ensures consistency

✅ **AC-13**: Recurrence patterns are type-safe
- TypeScript enum prevents invalid patterns
- Database constraint validates patterns
- API returns 400 for invalid patterns

✅ **AC-14**: Performance with many recurring todos
- Creating next instance completes in <500ms
- No performance degradation with 100+ recurring todos
- Efficient database queries with proper indexes

✅ **AC-15**: Accessibility compliance
- Recurrence selector keyboard navigable
- Screen readers announce pattern selection
- Recurring badge has descriptive aria-label

## Testing Requirements

### E2E Tests (Playwright)

**Test File**: `tests/03-recurring-todos.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers';

test.describe('Recurring Todos', () => {
  let authHelper: AuthHelper;
  
  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.registerAndLogin();
  });
  
  test('should create daily recurring todo', async ({ page }) => {
    await page.fill('input[name="title"]', 'Daily standup');
    await page.fill('input[name="due_date"]', '2025-11-15T09:00');
    await page.selectOption('select[name="recurrence"]', 'daily');
    await page.click('button:has-text("Add Todo")');
    
    // Verify badge
    const badge = page.locator('text=Daily standup').locator('..').locator('.bg-blue-50');
    await expect(badge).toContainText('Daily');
  });
  
  test('should create next instance when completing daily todo', async ({ page }) => {
    // Create daily todo
    await authHelper.createTodo('Morning workout', {
      dueDate: '2025-11-13T07:00:00+08:00',
      recurrence: 'daily'
    });
    
    // Complete todo
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify next instance created
    const todos = page.locator('[data-testid="todo-item"]');
    await expect(todos).toHaveCount(2);
    
    // First is completed (Nov 13)
    await expect(todos.nth(0)).toHaveAttribute('data-completed', 'true');
    
    // Second is new instance (Nov 14)
    const newTodo = todos.nth(1);
    await expect(newTodo).toContainText('Morning workout');
    await expect(newTodo).toContainText('Nov 14');
    await expect(newTodo).toHaveAttribute('data-completed', 'false');
  });
  
  test('should calculate weekly recurrence correctly', async ({ page }) => {
    await authHelper.createTodo('Team meeting', {
      dueDate: '2025-11-15T10:00:00+08:00', // Friday
      recurrence: 'weekly'
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Next instance should be Nov 22 (next Friday)
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo).toContainText('Nov 22');
  });
  
  test('should calculate monthly recurrence correctly', async ({ page }) => {
    await authHelper.createTodo('Pay rent', {
      dueDate: '2025-11-01T12:00:00+08:00',
      recurrence: 'monthly'
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Next instance should be Dec 1
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo).toContainText('Dec 1');
  });
  
  test('should handle end-of-month edge case', async ({ page }) => {
    // Jan 31 → Feb 28
    await authHelper.createTodo('Monthly report', {
      dueDate: '2025-01-31T17:00:00+08:00',
      recurrence: 'monthly'
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Next instance should be Feb 28 (not Feb 31)
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo).toContainText('Feb 28');
  });
  
  test('should calculate yearly recurrence correctly', async ({ page }) => {
    await authHelper.createTodo('Insurance renewal', {
      dueDate: '2025-11-15T00:00:00+08:00',
      recurrence: 'yearly'
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Next instance should be Nov 15, 2026
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo).toContainText('2026');
    await expect(newTodo).toContainText('Nov 15');
  });
  
  test('should copy priority to next instance', async ({ page }) => {
    await authHelper.createTodo('High priority task', {
      priority: 'high',
      dueDate: '2025-11-13T10:00:00+08:00',
      recurrence: 'daily'
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify next instance has high priority
    const newTodoBadge = page.locator('[data-testid="todo-2"] .bg-red-100');
    await expect(newTodoBadge).toContainText('High');
  });
  
  test('should copy tags to next instance', async ({ page }) => {
    // Create todo with tags
    await authHelper.createTodo('Project task', {
      dueDate: '2025-11-13T14:00:00+08:00',
      recurrence: 'weekly',
      tags: ['Work', 'Development']
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify tags on next instance
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo).toContainText('Work');
    await expect(newTodo).toContainText('Development');
  });
  
  test('should copy reminder to next instance', async ({ page }) => {
    await authHelper.createTodo('Meeting prep', {
      dueDate: '2025-11-15T09:00:00+08:00',
      recurrence: 'weekly',
      reminder: 60 // 1 hour before
    });
    
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify reminder on next instance
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo).toContainText('🔔'); // Reminder icon
  });
  
  test('should not copy subtasks to next instance', async ({ page }) => {
    await authHelper.createTodo('Project milestone', {
      dueDate: '2025-11-20T17:00:00+08:00',
      recurrence: 'monthly'
    });
    
    // Add subtasks
    await authHelper.addSubtask(1, 'Subtask 1');
    await authHelper.addSubtask(1, 'Subtask 2');
    
    // Complete todo
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify next instance has no subtasks
    const newTodo = page.locator('[data-testid="todo-2"]');
    await expect(newTodo.locator('[data-testid="subtask-item"]')).toHaveCount(0);
  });
  
  test('should remove recurrence when pattern set to none', async ({ page }) => {
    await authHelper.createTodo('One-time event', {
      dueDate: '2025-11-20T18:00:00+08:00',
      recurrence: 'weekly'
    });
    
    // Edit and remove recurrence
    await page.click('[data-testid="todo-1"] button[aria-label="Edit"]');
    await page.selectOption('select[name="recurrence"]', 'none');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    // Complete todo
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify no next instance created
    const todos = page.locator('[data-testid="todo-item"]');
    await expect(todos).toHaveCount(1);
  });
  
  test('should not create next instance when deleting recurring todo', async ({ page }) => {
    await authHelper.createTodo('Delete test', {
      dueDate: '2025-11-15T10:00:00+08:00',
      recurrence: 'daily'
    });
    
    // Delete instead of completing
    await page.click('[data-testid="todo-1"] button[aria-label="Delete"]');
    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(500);
    
    // Verify no todos exist
    const todos = page.locator('[data-testid="todo-item"]');
    await expect(todos).toHaveCount(0);
  });
  
  test('should prevent recurrence without due date', async ({ page }) => {
    await page.fill('input[name="title"]', 'No due date task');
    
    // Recurrence selector should be disabled
    const selector = page.locator('select[name="recurrence"]');
    await expect(selector).toBeDisabled();
    
    // Warning message visible
    await expect(page.locator('text=Set a due date to enable recurrence')).toBeVisible();
  });
  
  test('should handle rapid multiple completions', async ({ page }) => {
    await authHelper.createTodo('Daily habit', {
      dueDate: '2025-11-10T08:00:00+08:00',
      recurrence: 'daily'
    });
    
    // Complete 3 times rapidly
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid^="todo-"] input[type="checkbox"]');
      await page.waitForTimeout(300);
    }
    
    // Should have 4 todos (1 original + 3 next instances, all completed except last)
    const todos = page.locator('[data-testid="todo-item"]');
    await expect(todos).toHaveCount(4);
    
    // Last one should be incomplete and due Nov 13
    const lastTodo = todos.nth(3);
    await expect(lastTodo).toHaveAttribute('data-completed', 'false');
    await expect(lastTodo).toContainText('Nov 13');
  });
});
```

### Unit Tests

**Test File**: `tests/unit/recurrence.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateNextDueDate } from '@/lib/timezone';

describe('Recurrence Date Calculations', () => {
  describe('Daily recurrence', () => {
    it('should add 1 day', () => {
      const result = calculateNextDueDate('2025-11-15T09:00:00+08:00', 'daily');
      expect(result).toBe('2025-11-16T09:00:00+08:00');
    });
    
    it('should handle month boundary', () => {
      const result = calculateNextDueDate('2025-11-30T23:00:00+08:00', 'daily');
      expect(result).toBe('2025-12-01T23:00:00+08:00');
    });
  });
  
  describe('Weekly recurrence', () => {
    it('should add 7 days', () => {
      const result = calculateNextDueDate('2025-11-15T10:00:00+08:00', 'weekly');
      expect(result).toBe('2025-11-22T10:00:00+08:00');
    });
    
    it('should maintain same day of week', () => {
      // Nov 15 is Friday
      const result = calculateNextDueDate('2025-11-15T10:00:00+08:00', 'weekly');
      const nextDate = new Date(result);
      expect(nextDate.getDay()).toBe(5); // Still Friday
    });
  });
  
  describe('Monthly recurrence', () => {
    it('should add 1 month', () => {
      const result = calculateNextDueDate('2025-11-15T12:00:00+08:00', 'monthly');
      expect(result).toBe('2025-12-15T12:00:00+08:00');
    });
    
    it('should handle Jan 31 → Feb 28', () => {
      const result = calculateNextDueDate('2025-01-31T10:00:00+08:00', 'monthly');
      expect(result).toBe('2025-02-28T10:00:00+08:00');
    });
    
    it('should handle Jan 31 → Feb 29 (leap year)', () => {
      const result = calculateNextDueDate('2024-01-31T10:00:00+08:00', 'monthly');
      expect(result).toBe('2024-02-29T10:00:00+08:00');
    });
  });
  
  describe('Yearly recurrence', () => {
    it('should add 1 year', () => {
      const result = calculateNextDueDate('2025-11-15T00:00:00+08:00', 'yearly');
      expect(result).toBe('2026-11-15T00:00:00+08:00');
    });
    
    it('should handle Feb 29 → Feb 28 (leap to non-leap)', () => {
      const result = calculateNextDueDate('2024-02-29T10:00:00+08:00', 'yearly');
      expect(result).toBe('2025-02-28T10:00:00+08:00');
    });
    
    it('should handle Feb 29 → Feb 29 (leap to leap)', () => {
      const result = calculateNextDueDate('2024-02-29T10:00:00+08:00', 'yearly');
      // 4 years later
      const result4 = calculateNextDueDate(result, 'yearly');
      expect(result4).toContain('2028-02-29');
    });
  });
  
  describe('Error handling', () => {
    it('should throw error for null due date', () => {
      expect(() => calculateNextDueDate(null, 'daily')).toThrow('Due date required');
    });
    
    it('should throw error for invalid pattern', () => {
      expect(() => calculateNextDueDate('2025-11-15T10:00:00+08:00', 'invalid' as any))
        .toThrow('Invalid recurrence pattern');
    });
  });
});
```

### API Tests

**Test File**: `tests/api/recurrence.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as createTodo } from '@/app/api/todos/route';
import { PUT as updateTodo } from '@/app/api/todos/[id]/route';

describe('Recurrence API Endpoints', () => {
  it('should create recurring todo', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        title: 'Daily task',
        due_date: '2025-11-15T09:00:00+08:00',
        recurrence_pattern: 'daily'
      }
    });
    
    const response = await createTodo(req);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.recurrence_pattern).toBe('daily');
  });
  
  it('should reject recurrence without due date', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        title: 'Invalid task',
        recurrence_pattern: 'daily'
      }
    });
    
    const response = await createTodo(req);
    
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('Due date is required')
    });
  });
  
  it('should create next instance when completing', async () => {
    // Create todo
    const createRes = await createTodo(/* ... */);
    const { id } = await createRes.json();
    
    // Complete todo
    const { req: updateReq } = createMocks({
      method: 'PUT',
      body: { is_completed: 1 }
    });
    
    const response = await updateTodo(updateReq, { params: { id } });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.nextTodo).toBeDefined();
    expect(data.nextTodo.recurrence_pattern).toBe(data.completedTodo.recurrence_pattern);
  });
  
  it('should not create next instance when deleting', async () => {
    // Test that DELETE endpoint doesn't trigger next instance creation
    // (should use DELETE endpoint, not PUT with is_completed)
  });
});
```

## Out of Scope

The following features are explicitly **not included** in this PRP:

### 1. Custom Recurrence Intervals
- No "every 3 days" or "every 2 weeks"
- No custom day-of-week selection (e.g., "every Tuesday and Thursday")
- Fixed patterns only: daily, weekly, monthly, yearly

### 2. Recurrence End Dates
- No "repeat until [date]"
- No "repeat 10 times then stop"
- Recurrence continues indefinitely until manually stopped

### 3. Subtask Inheritance
- Subtasks do NOT copy to next instance
- Each instance starts with empty subtask list
- Template system (PRP-07) handles subtask patterns

### 4. Recurrence Chain Visualization
- No calendar view of all future instances
- No "show next 10 occurrences" preview
- Each instance exists only after previous is completed

### 5. Bulk Recurrence Operations
- No "complete all past due instances"
- No "skip next 3 instances"
- Each instance must be handled individually

### 6. Smart Recurrence Adjustments
- No automatic rescheduling for weekends/holidays
- No "skip if holiday" option
- No business day awareness

### 7. Recurrence History/Analytics
- No tracking of completion streaks
- No "completed 15 of 20 instances" statistics
- No visual streak indicators

### 8. Conditional Recurrence
- No "only if previous was completed"
- No "pause if [condition]"
- Automatic creation regardless of completion timeliness

### 9. Multi-Instance Management
- No selecting multiple instances at once
- No bulk editing future instances
- Each instance is independent

### 10. Recurrence Templates with Subtasks
- Handled by separate Template System (PRP-07)
- Current scope: metadata inheritance only
- Templates provide full pattern replication including subtasks

## Success Metrics

### User Engagement Metrics

1. **Recurrence Adoption Rate**
   - Target: >50% of active users create at least one recurring todo within first month
   - Measure: `COUNT(DISTINCT user_id WHERE recurrence_pattern IS NOT NULL) / COUNT(DISTINCT user_id) * 100`

2. **Recurring Todo Completion Rate**
   - Target: >70% of recurring todo instances are completed
   - Measure: `COUNT(recurring todos with is_completed=1) / COUNT(recurring todos) * 100`

3. **Average Recurring Todos per User**
   - Target: 3-5 active recurring todos per user
   - Measure: `AVG(COUNT(todos WHERE recurrence_pattern IS NOT NULL)) GROUP BY user_id`

### System Performance Metrics

4. **Next Instance Creation Time**
   - Target: <500ms from completion to next instance visible in UI
   - Measure: API response time for `PUT /api/todos/[id]` with recurrence

5. **Date Calculation Accuracy**
   - Target: 100% correct calculations (no off-by-one errors)
   - Measure: Automated tests + manual verification of edge cases

### User Satisfaction Metrics

6. **Time Saved on Task Creation**
   - Target: 80% reduction in time spent creating repetitive tasks
   - Measure: User surveys pre/post feature launch

7. **Habit Consistency Score**
   - Target: 20% increase in daily todo completion rates
   - Measure: Completion rate for daily recurring todos vs one-time todos

### Technical Quality Metrics

8. **Error Rate**
   - Target: <0.05% error rate on recurrence operations
   - Measure: API error responses / total recurrence API calls

9. **Test Coverage**
   - Target: >95% code coverage for recurrence logic
   - Measure: Jest/Vitest coverage report for `lib/timezone.ts` and recurrence endpoints

10. **Timezone Consistency**
    - Target: 0 timezone-related bugs in production
    - Measure: Bug tracker + user reports

---

## Implementation Checklist

- [ ] Add `calculateNextDueDate()` function to `lib/timezone.ts`
- [ ] Implement next instance creation logic in `PUT /api/todos/[id]`
- [ ] Create `RecurrenceSelector` component
- [ ] Create `RecurrenceBadge` component
- [ ] Add recurrence validation to API routes (require due date)
- [ ] Implement tag copying to next instance
- [ ] Add database indexes for recurrence queries
- [ ] Write E2E tests for all 4 recurrence patterns
- [ ] Write unit tests for date calculations (including edge cases)
- [ ] Write API tests for recurrence endpoints
- [ ] Test end-of-month edge cases (Jan 31, Feb 29)
- [ ] Test timezone consistency across completions
- [ ] Verify next instance inherits priority, reminder, description
- [ ] Update USER_GUIDE.md with recurrence documentation

---

**Version**: 1.0  
**Last Updated**: November 12, 2025  
**Related PRPs**: 01-todo-crud-operations.md, 02-priority-system.md, 06-tag-system.md, 07-template-system.md
