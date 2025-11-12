# PRP-03: Recurring Todos

## Feature Overview

Recurring todos enable users to create tasks that automatically regenerate on a schedule (daily, weekly, monthly, or yearly). When a recurring todo is marked as completed, the system automatically creates the next instance with the same properties, calculated due date, and inherited metadata (priority, tags, subtasks, reminders). This feature eliminates the need to manually recreate repetitive tasks and ensures consistent task management for routine activities.

**Key Capabilities:**
- Four recurrence patterns: daily, weekly, monthly, yearly
- Automatic next instance creation upon completion
- Singapore timezone-aware due date calculation
- Complete metadata inheritance (priority, tags, reminder offsets, subtasks)
- Visual indicators for recurring status in UI
- Ability to edit/delete recurrence patterns

## User Stories

### Primary Persona: Busy Professional
> "As a busy professional, I want my daily standup preparation task to automatically recreate itself every weekday, so I don't have to manually add it each day."

**Needs:**
- Set up daily recurring tasks for routine work activities
- Inherit all subtasks (e.g., "Review yesterday's work", "Plan today's priorities")
- Maintain priority and tags across instances
- Automatic scheduling without manual intervention

### Secondary Persona: Fitness Enthusiast
> "As a fitness enthusiast, I want my gym workout to recur three times per week, so I stay accountable to my fitness goals."

**Needs:**
- Weekly recurring tasks with flexible scheduling
- Visual distinction between one-time and recurring tasks
- Ability to modify recurrence pattern if schedule changes
- Progress tracking via subtasks (exercises completed)

### Tertiary Persona: Project Manager
> "As a project manager, I want monthly status reports to automatically appear on the last Friday of each month, so I never miss a reporting deadline."

**Needs:**
- Monthly recurrence with smart date calculation
- Reminder notifications inherited across instances
- Tags for categorization (e.g., "reporting", "management")
- Ability to complete early without disrupting schedule

## User Flow

### Creating a Recurring Todo

```
1. User creates a new todo with title, due date, and other properties
2. User selects recurrence pattern from dropdown:
   - "None" (default)
   - "Daily"
   - "Weekly"
   - "Monthly"
   - "Yearly"
3. System displays recurrence indicator icon next to todo
4. User optionally adds:
   - Priority (high/medium/low)
   - Tags (work, personal, etc.)
   - Subtasks (checklist items)
   - Reminder (15m, 30m, 1h, 2h, 1d, 2d, 1w before)
5. User saves todo
6. System stores recurrence pattern in database
```

### Completing a Recurring Todo

```
1. User marks recurring todo as completed
2. System:
   a. Sets current instance `completed` = true, `completed_at` = Singapore now
   b. Calculates next due date based on pattern:
      - Daily: current_due_date + 1 day
      - Weekly: current_due_date + 7 days
      - Monthly: current_due_date + 1 month (same day)
      - Yearly: current_due_date + 1 year (same date)
   c. Creates new todo instance with:
      - Same title
      - Same recurrence_pattern
      - Calculated next due_date
      - Same priority
      - Same reminder_minutes offset
      - completed = false
   d. Clones tags (many-to-many relationship)
   e. Clones subtasks with same titles and positions
3. System returns both completed todo and new instance
4. UI:
   - Moves completed todo to completed section
   - Displays new instance in active todos
   - Shows success message: "Recurring todo completed. Next instance created for [date]"
```

### Editing Recurrence Pattern

```
1. User opens edit modal for recurring todo
2. System displays current recurrence pattern in dropdown
3. User changes pattern or sets to "None" to remove recurrence
4. User saves changes
5. System:
   - Updates recurrence_pattern in database
   - Does NOT affect previously created instances
   - Only applies to future instances when current is completed
6. UI updates recurrence indicator icon
```

### Deleting a Recurring Todo

```
1. User clicks delete on recurring todo
2. System prompts: "This is a recurring todo. Delete this instance only?"
3. User confirms
4. System deletes current instance (CASCADE deletes subtasks and tag relationships)
5. Future instances are NOT affected (they don't exist yet)
6. UI removes todo from list
```

## Technical Requirements

### Database Schema

**Existing `todos` table** (relevant columns):

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  due_date TEXT,
  recurrence_pattern TEXT,  -- 'daily', 'weekly', 'monthly', 'yearly', or NULL
  reminder_minutes INTEGER,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Note:** No additional tables needed. Recurring todos are managed through the `recurrence_pattern` column and logic in API routes.

### TypeScript Types

**Location:** `lib/db.ts`

```typescript
// Recurrence pattern enum
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Todo interface (excerpt)
export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  recurrence_pattern: RecurrencePattern | null; // NEW
  reminder_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Todo with relationships
export interface TodoWithRelations extends Todo {
  tags: Tag[];
  subtasks: Subtask[];
}
```

### API Endpoints

#### 1. Create Recurring Todo
**Endpoint:** `POST /api/todos`

**Request Body:**
```json
{
  "title": "Daily standup preparation",
  "due_date": "2025-11-13T09:00:00+08:00",
  "priority": "high",
  "recurrence_pattern": "daily",
  "reminder_minutes": 30,
  "tag_ids": [1, 2],
  "subtasks": [
    { "title": "Review yesterday's work", "position": 0 },
    { "title": "Plan today's priorities", "position": 1 }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": 42,
  "title": "Daily standup preparation",
  "due_date": "2025-11-13T09:00:00+08:00",
  "recurrence_pattern": "daily",
  "priority": "high",
  "reminder_minutes": 30,
  "completed": false,
  "tags": [...],
  "subtasks": [...]
}
```

#### 2. Complete Recurring Todo (Update with Auto-Creation)
**Endpoint:** `PUT /api/todos/[id]`

**Request Body:**
```json
{
  "completed": true
}
```

**Response:** `200 OK`
```json
{
  "completed_todo": {
    "id": 42,
    "title": "Daily standup preparation",
    "completed": true,
    "completed_at": "2025-11-13T08:45:00+08:00",
    "recurrence_pattern": "daily"
  },
  "next_instance": {
    "id": 43,
    "title": "Daily standup preparation",
    "due_date": "2025-11-14T09:00:00+08:00",
    "recurrence_pattern": "daily",
    "priority": "high",
    "reminder_minutes": 30,
    "completed": false,
    "tags": [...],
    "subtasks": [...]
  }
}
```

**Logic (Pseudo-code in `app/api/todos/[id]/route.ts`):**

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Get existing todo with relations
  const todo = todoDB.getById(parseInt(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check if marking as completed and has recurrence
  if (body.completed && !todo.completed && todo.recurrence_pattern) {
    // Mark current as completed
    const completedAt = getSingaporeNow().toISOString();
    todoDB.update(todo.id, { completed: true, completed_at: completedAt }, session.userId);

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);

    // Create next instance
    const nextTodo = todoDB.create({
      user_id: session.userId,
      title: todo.title,
      due_date: nextDueDate,
      priority: todo.priority,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes ?? null,
      completed: false
    });

    // Clone tags
    todo.tags.forEach(tag => {
      todoTagDB.create(nextTodo.id, tag.id);
    });

    // Clone subtasks
    todo.subtasks.forEach(subtask => {
      subtaskDB.create({
        todo_id: nextTodo.id,
        title: subtask.title,
        position: subtask.position,
        completed: false
      });
    });

    // Fetch complete next instance with relations
    const nextInstance = todoDB.getById(nextTodo.id, session.userId);

    return NextResponse.json({
      completed_todo: todoDB.getById(todo.id, session.userId),
      next_instance: nextInstance
    });
  }

  // Regular update (no recurrence logic)
  todoDB.update(parseInt(id), body, session.userId);
  return NextResponse.json(todoDB.getById(parseInt(id), session.userId));
}
```

#### 3. Update Recurrence Pattern
**Endpoint:** `PUT /api/todos/[id]`

**Request Body:**
```json
{
  "recurrence_pattern": "weekly"  // or null to remove recurrence
}
```

**Response:** `200 OK`
```json
{
  "id": 42,
  "recurrence_pattern": "weekly"
}
```

### Due Date Calculation Logic

**Location:** `lib/timezone.ts` or `lib/db.ts`

```typescript
import { getSingaporeNow } from '@/lib/timezone';

export function calculateNextDueDate(
  currentDueDate: string | null,
  pattern: RecurrencePattern
): string {
  if (!currentDueDate) {
    // If no due date, use current time + pattern offset
    const now = getSingaporeNow();
    return addRecurrenceOffset(now, pattern).toISOString();
  }

  // Parse current due date in Singapore timezone
  const current = new Date(currentDueDate);
  
  switch (pattern) {
    case 'daily':
      current.setDate(current.getDate() + 1);
      break;
    
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    
    case 'monthly':
      // Add 1 month, handle edge cases (e.g., Jan 31 -> Feb 28)
      current.setMonth(current.getMonth() + 1);
      break;
    
    case 'yearly':
      current.setFullYear(current.getFullYear() + 1);
      break;
    
    default:
      throw new Error(`Invalid recurrence pattern: ${pattern}`);
  }

  return current.toISOString();
}

function addRecurrenceOffset(date: Date, pattern: RecurrencePattern): Date {
  const result = new Date(date);
  switch (pattern) {
    case 'daily': result.setDate(result.getDate() + 1); break;
    case 'weekly': result.setDate(result.getDate() + 7); break;
    case 'monthly': result.setMonth(result.getMonth() + 1); break;
    case 'yearly': result.setFullYear(result.getFullYear() + 1); break;
  }
  return result;
}
```

### Database CRUD Methods

**Location:** `lib/db.ts`

```typescript
// Add to todoDB object
export const todoDB = {
  // ... existing methods

  /**
   * Clone a todo with new due date (for recurrence)
   */
  cloneForRecurrence(
    originalId: number,
    nextDueDate: string,
    userId: number
  ): Todo {
    const original = this.getById(originalId, userId);
    if (!original) throw new Error('Original todo not found');

    return this.create({
      user_id: userId,
      title: original.title,
      due_date: nextDueDate,
      priority: original.priority,
      recurrence_pattern: original.recurrence_pattern,
      reminder_minutes: original.reminder_minutes ?? null,
      completed: false
    });
  }
};
```

## UI Components

### Recurrence Pattern Selector

**Location:** `app/page.tsx` (in todo creation/edit modal)

```typescript
'use client';

import { RecurrencePattern } from '@/lib/db';

interface RecurrenceSelectorProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
}

function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Recurrence
      </label>
      <select
        value={value || 'none'}
        onChange={(e) => onChange(e.target.value === 'none' ? null : e.target.value as RecurrencePattern)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
      
      {value && (
        <p className="text-xs text-gray-500">
          Next instance will be created automatically when completed
        </p>
      )}
    </div>
  );
}
```

### Recurrence Indicator Icon

**Location:** `app/page.tsx` (in todo list item)

```typescript
function RecurrenceIndicator({ pattern }: { pattern: RecurrencePattern | null }) {
  if (!pattern) return null;

  const icons = {
    daily: '🔄',
    weekly: '📅',
    monthly: '🗓️',
    yearly: '📆'
  };

  const labels = {
    daily: 'Repeats daily',
    weekly: 'Repeats weekly',
    monthly: 'Repeats monthly',
    yearly: 'Repeats yearly'
  };

  return (
    <span
      title={labels[pattern]}
      className="text-sm cursor-help"
      aria-label={labels[pattern]}
    >
      {icons[pattern]}
    </span>
  );
}

// Usage in todo item
<div className="flex items-center gap-2">
  <input type="checkbox" checked={todo.completed} onChange={handleToggle} />
  <span>{todo.title}</span>
  <RecurrenceIndicator pattern={todo.recurrence_pattern} />
</div>
```

### Success Message After Completion

```typescript
function handleCompleteTodo(id: number) {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true })
  });

  const data = await response.json();

  if (data.next_instance) {
    // Recurring todo - show next instance info
    toast.success(
      `Recurring todo completed! Next instance scheduled for ${formatSingaporeDate(data.next_instance.due_date)}`
    );
    
    // Update state with both todos
    setTodos(prev => [
      ...prev.filter(t => t.id !== id),
      data.next_instance
    ]);
  } else {
    // Regular todo
    toast.success('Todo completed!');
    setTodos(prev => prev.filter(t => t.id !== id));
  }
}
```

## Edge Cases

### 1. Month Overflow (e.g., Jan 31 + 1 month)
**Scenario:** Todo due Jan 31, monthly recurrence

**Handling:**
- JavaScript `Date.setMonth()` automatically adjusts to last valid day
- Jan 31 → Feb 28/29 (depending on leap year)
- User should be warned if creating monthly todos on days 29-31

**Implementation:**
```typescript
// In calculateNextDueDate for monthly pattern
if (pattern === 'monthly') {
  const originalDay = current.getDate();
  current.setMonth(current.getMonth() + 1);
  
  // Warn if day changed due to overflow
  if (current.getDate() !== originalDay) {
    console.warn(`Monthly recurrence adjusted from day ${originalDay} to ${current.getDate()}`);
  }
}
```

### 2. Leap Year Handling (Feb 29 yearly recurrence)
**Scenario:** Todo due Feb 29, 2024 (leap year), yearly recurrence

**Handling:**
- 2025 is not a leap year → adjust to Feb 28
- JavaScript handles this automatically via `setFullYear()`

**No special code needed** - native Date object behavior is acceptable.

### 3. No Due Date on Recurring Todo
**Scenario:** User creates recurring todo without due date

**Handling:**
- Allow creation (due_date = null)
- On completion, calculate next due date from current time + pattern offset
- Example: Daily recurring todo completed at 2PM → next instance due 2PM tomorrow

**Implementation:**
```typescript
if (!currentDueDate) {
  const now = getSingaporeNow();
  return addRecurrenceOffset(now, pattern).toISOString();
}
```

### 4. Completing Todo Before Due Date
**Scenario:** User completes weekly todo 3 days early

**Handling:**
- Next instance due date calculated from **original due date**, not completion date
- Prevents schedule drift
- Example: Weekly todo due Friday, completed Tuesday → next instance still due next Friday

### 5. Editing Recurrence Pattern
**Scenario:** User changes daily recurring todo to weekly

**Handling:**
- Update only affects current instance
- Future instances (not yet created) will use new pattern
- Previously completed instances remain unchanged

### 6. Deleting Recurring Todo
**Scenario:** User deletes a recurring todo instance

**Handling:**
- Only deletes current instance (future instances don't exist yet)
- No "delete all future instances" option needed
- CASCADE deletes subtasks and tag relationships

### 7. Uncompleting a Recurring Todo
**Scenario:** User accidentally marks recurring todo complete, wants to undo

**Handling:**
- Uncompleting does NOT delete the next instance
- User now has two instances: original (uncompleted) + next (active)
- This is acceptable behavior - user can delete duplicate manually

**UI Warning:**
```typescript
if (todo.recurrence_pattern && nextInstanceExists) {
  // Show warning: "This will create a duplicate. Delete the next instance if needed."
}
```

### 8. Timezone Edge Case (Due at Midnight)
**Scenario:** Daily recurring todo due at 00:00 Singapore time

**Handling:**
- Use `getSingaporeNow()` consistently
- Add exactly 24 hours for daily pattern
- Midnight → next midnight (no DST in Singapore)

### 9. Very Old Due Dates
**Scenario:** User completes overdue recurring todo from 6 months ago

**Handling:**
- Calculate next due date from **old due date**, not current time
- This may create next instance in the past
- User can manually update due date if needed

### 10. Rapid Completion (Multiple Instances)
**Scenario:** User completes multiple recurring todo instances in quick succession

**Handling:**
- Each completion creates exactly one next instance
- No automatic "catch-up" (e.g., don't create 7 instances if daily todo overdue by week)
- User completes → next created → user completes again → next created

## Acceptance Criteria

### Must Have
- [ ] User can select recurrence pattern (daily/weekly/monthly/yearly) when creating todo
- [ ] Recurrence pattern displayed in todo list with appropriate icon
- [ ] Completing recurring todo creates next instance with same title
- [ ] Next due date calculated correctly for all patterns (daily: +1 day, weekly: +7 days, monthly: +1 month, yearly: +1 year)
- [ ] Priority inherited to next instance
- [ ] Tags inherited to next instance (many-to-many relationships cloned)
- [ ] Subtasks inherited to next instance with same titles and positions
- [ ] Reminder offset inherited (not absolute time)
- [ ] Singapore timezone used for all date calculations
- [ ] User can edit recurrence pattern on existing todo
- [ ] User can remove recurrence by setting pattern to "None"
- [ ] API returns both completed todo and next instance in response
- [ ] UI displays success message with next due date after completion
- [ ] Recurrence pattern stored in `todos.recurrence_pattern` column

### Should Have
- [ ] Warning message when creating monthly recurring todo on days 29-31
- [ ] Helpful tooltip on recurrence icon (hover shows pattern)
- [ ] Visual distinction between recurring and one-time todos (icon + color)
- [ ] Confirmation prompt when deleting recurring todo
- [ ] Next instance subtasks are marked as uncompleted (position preserved)

### Nice to Have
- [ ] Preview next 3 due dates when selecting recurrence pattern
- [ ] Statistics on recurring todo completion rate
- [ ] Option to "skip" next instance (complete without creating next)
- [ ] Bulk operations: "Mark all recurring todos as complete"

## Testing Requirements

### E2E Tests (Playwright)

**Test File:** `tests/03-recurring-todos.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Recurring Todos', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupAuthenticatedUser();
  });

  test('should create daily recurring todo', async ({ page }) => {
    await helpers.createTodo({
      title: 'Daily standup',
      dueDate: '2025-11-13T09:00',
      recurrencePattern: 'daily',
      priority: 'high'
    });

    // Verify recurrence icon displayed
    await expect(page.locator('text=Daily standup').locator('..').locator('[title="Repeats daily"]')).toBeVisible();
  });

  test('should create next instance when completing recurring todo', async ({ page }) => {
    // Create recurring todo
    const todoId = await helpers.createTodo({
      title: 'Weekly report',
      dueDate: '2025-11-15T17:00',
      recurrencePattern: 'weekly'
    });

    // Complete it
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();

    // Wait for success message
    await expect(page.locator('text=/Next instance scheduled for.*2025-11-22/i')).toBeVisible();

    // Verify new instance exists
    await expect(page.locator('text=Weekly report').first()).toBeVisible();
  });

  test('should inherit priority and tags to next instance', async ({ page }) => {
    // Create tag
    const tagId = await helpers.createTag('Work', '#3b82f6');

    // Create recurring todo with tag and priority
    const todoId = await helpers.createTodo({
      title: 'Team meeting',
      dueDate: '2025-11-13T14:00',
      recurrencePattern: 'weekly',
      priority: 'high',
      tagIds: [tagId]
    });

    // Complete it
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();

    // Wait for next instance
    await page.waitForTimeout(500);

    // Verify next instance has high priority badge
    const nextTodo = page.locator('text=Team meeting').first();
    await expect(nextTodo.locator('..').locator('text=High')).toBeVisible();

    // Verify next instance has Work tag
    await expect(nextTodo.locator('..').locator('text=Work')).toBeVisible();
  });

  test('should inherit subtasks to next instance', async ({ page }) => {
    // Create recurring todo
    const todoId = await helpers.createTodo({
      title: 'Morning routine',
      recurrencePattern: 'daily'
    });

    // Add subtasks
    await helpers.addSubtask(todoId, 'Exercise');
    await helpers.addSubtask(todoId, 'Meditate');

    // Complete todo
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();

    // Wait for next instance
    await page.waitForTimeout(500);

    // Expand next instance subtasks
    await page.locator('text=Morning routine').first().click();

    // Verify subtasks exist and are uncompleted
    await expect(page.locator('text=Exercise')).toBeVisible();
    await expect(page.locator('text=Meditate')).toBeVisible();
    
    // Verify subtasks are NOT checked
    const exerciseCheckbox = page.locator('text=Exercise').locator('..').locator('input[type="checkbox"]');
    await expect(exerciseCheckbox).not.toBeChecked();
  });

  test('should calculate monthly recurrence correctly', async ({ page }) => {
    // Create monthly recurring todo due Jan 15
    await helpers.createTodo({
      title: 'Monthly review',
      dueDate: '2025-01-15T10:00',
      recurrencePattern: 'monthly'
    });

    // Complete it
    await page.locator('text=Monthly review').locator('..').locator('input[type="checkbox"]').check();

    // Verify next instance due Feb 15
    await expect(page.locator('text=/Next instance scheduled for.*2025-02-15/i')).toBeVisible();
  });

  test('should handle yearly recurrence', async ({ page }) => {
    await helpers.createTodo({
      title: 'Annual review',
      dueDate: '2025-12-31T23:59',
      recurrencePattern: 'yearly'
    });

    await page.locator('text=Annual review').locator('..').locator('input[type="checkbox"]').check();

    // Next instance should be 2026-12-31
    await expect(page.locator('text=/Next instance scheduled for.*2026-12-31/i')).toBeVisible();
  });

  test('should allow editing recurrence pattern', async ({ page }) => {
    const todoId = await helpers.createTodo({
      title: 'Flexible task',
      recurrencePattern: 'daily'
    });

    // Open edit modal
    await page.locator(`[data-todo-id="${todoId}"]`).click();
    
    // Change to weekly
    await page.locator('select[name="recurrence_pattern"]').selectOption('weekly');
    await page.locator('button:has-text("Save")').click();

    // Verify icon changed
    await expect(page.locator('text=Flexible task').locator('..').locator('[title="Repeats weekly"]')).toBeVisible();
  });

  test('should allow removing recurrence', async ({ page }) => {
    const todoId = await helpers.createTodo({
      title: 'One-time task now',
      recurrencePattern: 'daily'
    });

    // Edit and remove recurrence
    await page.locator(`[data-todo-id="${todoId}"]`).click();
    await page.locator('select[name="recurrence_pattern"]').selectOption('none');
    await page.locator('button:has-text("Save")').click();

    // Verify recurrence icon removed
    await expect(page.locator('text=One-time task now').locator('..').locator('[title^="Repeats"]')).not.toBeVisible();
  });

  test('should handle completion without due date', async ({ page }) => {
    await helpers.createTodo({
      title: 'Anytime task',
      recurrencePattern: 'daily',
      dueDate: null
    });

    await page.locator('text=Anytime task').locator('..').locator('input[type="checkbox"]').check();

    // Should still create next instance (due date calculated from now)
    await expect(page.locator('text=/Next instance scheduled/i')).toBeVisible();
  });
});
```

### Unit Tests

**Test File:** `tests/unit/recurrence-logic.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateNextDueDate } from '@/lib/timezone';

describe('Recurrence Date Calculation', () => {
  it('should add 1 day for daily pattern', () => {
    const current = '2025-11-13T09:00:00+08:00';
    const next = calculateNextDueDate(current, 'daily');
    expect(next).toBe('2025-11-14T09:00:00+08:00');
  });

  it('should add 7 days for weekly pattern', () => {
    const current = '2025-11-13T14:00:00+08:00';
    const next = calculateNextDueDate(current, 'weekly');
    expect(next).toBe('2025-11-20T14:00:00+08:00');
  });

  it('should add 1 month for monthly pattern', () => {
    const current = '2025-11-15T10:00:00+08:00';
    const next = calculateNextDueDate(current, 'monthly');
    expect(next).toBe('2025-12-15T10:00:00+08:00');
  });

  it('should handle month overflow (Jan 31 -> Feb 28)', () => {
    const current = '2025-01-31T12:00:00+08:00';
    const next = calculateNextDueDate(current, 'monthly');
    // Feb 2025 has 28 days
    expect(new Date(next).getDate()).toBeLessThanOrEqual(28);
  });

  it('should add 1 year for yearly pattern', () => {
    const current = '2025-12-31T23:59:00+08:00';
    const next = calculateNextDueDate(current, 'yearly');
    expect(next).toBe('2026-12-31T23:59:00+08:00');
  });

  it('should handle null due date by using current time', () => {
    const next = calculateNextDueDate(null, 'daily');
    expect(next).toBeTruthy();
    // Verify it's approximately 1 day from now
    const nextDate = new Date(next);
    const now = new Date();
    const diff = nextDate.getTime() - now.getTime();
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000); // >23 hours
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000); // <25 hours
  });
});
```

### Integration Tests

**Test File:** `tests/integration/recurring-api.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('Recurring Todo API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup authenticated session
    authToken = await setupTestUser();
  });

  it('should create recurring todo via API', async () => {
    const response = await fetch('http://localhost:3000/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${authToken}`
      },
      body: JSON.stringify({
        title: 'API recurring test',
        recurrence_pattern: 'weekly',
        priority: 'medium'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.recurrence_pattern).toBe('weekly');
  });

  it('should return next instance when completing recurring todo', async () => {
    // Create recurring todo
    const createRes = await fetch('http://localhost:3000/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${authToken}`
      },
      body: JSON.stringify({
        title: 'Completion test',
        recurrence_pattern: 'daily',
        due_date: '2025-11-15T10:00:00+08:00'
      })
    });
    const todo = await createRes.json();

    // Complete it
    const completeRes = await fetch(`http://localhost:3000/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${authToken}`
      },
      body: JSON.stringify({ completed: true })
    });

    expect(completeRes.status).toBe(200);
    const data = await completeRes.json();
    
    expect(data.completed_todo).toBeDefined();
    expect(data.completed_todo.completed).toBe(true);
    
    expect(data.next_instance).toBeDefined();
    expect(data.next_instance.id).not.toBe(todo.id);
    expect(data.next_instance.due_date).toBe('2025-11-16T10:00:00+08:00');
  });
});
```

## Out of Scope

The following features are **explicitly excluded** from this PRP:

### 1. Custom Recurrence Patterns
- "Every 2 days", "Every 3 weeks", "First Monday of month"
- Only supporting fixed intervals: daily, weekly, monthly, yearly
- **Rationale:** Complexity vs. user demand (80/20 rule)

### 2. End Date for Recurrence
- Option to stop recurring after specific date or number of occurrences
- **Rationale:** Can be achieved by removing recurrence pattern manually
- **Future consideration:** Could add in v2

### 3. Recurrence History Tracking
- Viewing all past instances of a recurring todo
- Completion rate analytics per recurring series
- **Rationale:** Requires additional database schema (series_id field)

### 4. "Delete All Future Instances"
- Since future instances don't exist until completion, this feature is N/A
- **Note:** This is a design decision, not a limitation

### 5. Smart Scheduling
- "Skip weekends" for daily recurrence
- "Last Friday of month" for monthly recurrence
- **Rationale:** Significant complexity for niche use cases

### 6. Recurring Subtask Modification
- Editing subtasks on next instance doesn't affect future instances
- No concept of "template subtasks" for recurring series
- **Rationale:** Each instance is independent after creation

### 7. Batch Completion
- "Mark all overdue recurring todos as complete"
- Would create many next instances at once
- **Rationale:** User should review each completion

### 8. Recurrence Transfer
- Moving recurrence pattern from one todo to another
- **Rationale:** User can create new recurring todo with same properties

## Success Metrics

### Quantitative Metrics

1. **Adoption Rate**
   - Target: 40% of users create at least one recurring todo within first week
   - Measurement: `COUNT(DISTINCT user_id) WHERE recurrence_pattern IS NOT NULL / total_users`

2. **Recurring Todo Completion Rate**
   - Target: 70% of recurring todo instances completed within 24h of due date
   - Measurement: Track `completed_at - due_date` for todos with `recurrence_pattern`

3. **Average Recurrence Chain Length**
   - Target: 5+ instances per recurring todo on average
   - Measurement: Count next instances created per original recurring todo

4. **Pattern Distribution**
   - Track which patterns are most popular: daily, weekly, monthly, yearly
   - Expected: Weekly (40%), Daily (35%), Monthly (20%), Yearly (5%)

5. **Error Rate**
   - Target: <0.1% failures in next instance creation
   - Measurement: API errors logged when completing recurring todos

### Qualitative Metrics

1. **User Satisfaction**
   - Survey question: "Recurring todos save me time" (1-5 scale)
   - Target: 4.2+ average rating

2. **Feature Discovery**
   - % of users who discover recurrence dropdown without help docs
   - Target: 60%+ (indicates good UI placement)

3. **User Feedback Themes**
   - Monitor support tickets for:
     - Confusion about recurrence logic
     - Requests for custom patterns (indicates need for expansion)
     - Praise for automatic scheduling

### Success Criteria for Launch

- [ ] All "Must Have" acceptance criteria met
- [ ] All E2E tests passing in Playwright
- [ ] Zero critical bugs in 1 week beta period
- [ ] 30% of beta users create recurring todo
- [ ] Documentation complete in `USER_GUIDE.md`

### Post-Launch Monitoring (30 Days)

- Daily active recurring todos (target: 500+)
- Average time saved per user (estimate 5min/day for heavy users)
- Support ticket volume related to recurrence (<5 tickets/week)
- Feature satisfaction survey (target: 80%+ positive)

---

## Additional Notes

### Implementation Priority
This is a **high priority** feature (PRP-03) that depends on:
- ✅ PRP-01: Todo CRUD Operations (must be complete)
- ✅ PRP-02: Priority System (should inherit priorities)
- Recommended before: PRP-05 (Subtasks), PRP-06 (Tags) for full metadata inheritance

### Development Time Estimate
- Backend (API routes + DB logic): 4-6 hours
- Frontend (UI components): 3-4 hours
- Testing (E2E + unit): 3-4 hours
- Documentation: 1-2 hours
- **Total: 11-16 hours** for experienced Next.js developer

### Dependencies
- `lib/timezone.ts` must exist with `getSingaporeNow()` function
- `lib/db.ts` must export `RecurrencePattern` type and database methods
- API route pattern established in PRP-01

### Migration Path
If adding recurrence to existing todo app:
```sql
-- Migration: Add recurrence_pattern column
ALTER TABLE todos ADD COLUMN recurrence_pattern TEXT;
```

No data migration needed (existing todos default to NULL = non-recurring).

---

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Author:** Product Management Team  
**Status:** Ready for Implementation
