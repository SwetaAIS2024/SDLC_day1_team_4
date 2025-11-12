# PRP-02: Priority System

## Feature Overview

The Priority System provides users with a three-level prioritization mechanism (High, Medium, Low) for organizing and managing todos by urgency and importance. This feature enhances task management through:

- **Visual Priority Indicators**: Color-coded badges that make priority levels immediately recognizable
- **Intelligent Sorting**: Automatic ordering of todos by priority level within completion status groups
- **Flexible Filtering**: Ability to focus on tasks of specific priority levels
- **Priority Inheritance**: Recurring todos and templates preserve priority settings

The priority system integrates seamlessly with all todo operations, ensuring priority is maintained across CRUD operations, recurrence cycles, and template usage.

## User Stories

### Primary User Personas

**1. Busy Professional (Sarah)**
> "As a busy professional managing multiple projects, I need to visually identify my most urgent tasks so I can focus my limited time on high-priority items without getting distracted by less important tasks."

**2. Student (Alex)**
> "As a student juggling coursework and deadlines, I need to categorize my assignments by importance so I can tackle critical assignments first while keeping track of lower-priority study tasks."

**3. Team Lead (Marcus)**
> "As a team lead coordinating tasks, I need to set priority levels on delegated todos so my team understands what requires immediate attention versus what can be scheduled for later."

### User Needs

- Quick visual identification of task urgency
- Ability to change priority as circumstances evolve
- Automatic organization by priority without manual sorting
- Filter view to focus on specific priority levels
- Default priority assignment for new tasks

## User Flow

### Primary Flow: Creating Todo with Priority

1. User clicks "Add Todo" button
2. User enters todo title in input field
3. User clicks **Priority dropdown** (defaults to "Medium")
4. User selects desired priority: High / Medium / Low
5. User completes other fields (due date, tags, etc.)
6. User clicks "Add Todo" button
7. **System creates todo with selected priority**
8. **System displays todo with color-coded priority badge**
9. **System automatically sorts todo list** (High → Medium → Low within incomplete/complete groups)

### Secondary Flow: Changing Priority of Existing Todo

1. User locates todo in list
2. User clicks **Priority dropdown** on todo card
3. User selects new priority level
4. **System updates todo priority immediately**
5. **System re-sorts todo list** to reflect new priority
6. **System shows visual feedback** (badge color changes)

### Tertiary Flow: Filtering by Priority

1. User clicks **"Filter by Priority"** dropdown in toolbar
2. System displays options: All / High / Medium / Low
3. User selects desired priority level
4. **System filters todo list** to show only matching priorities
5. System displays count of filtered todos
6. User can clear filter by selecting "All"

### Edge Flow: Priority in Recurring Todos

1. User completes a High priority recurring todo
2. **System creates next instance with same High priority**
3. New instance appears at top of list (High priority sorting)
4. User can modify priority of new instance independently

## Technical Requirements

### Database Schema

The `todos` table already includes the `priority` column (added in Todo CRUD feature):

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  is_completed INTEGER DEFAULT 0,
  due_date TEXT,
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_user_priority ON todos(user_id, priority, is_completed);
```

### TypeScript Types

Add to `lib/db.ts`:

```typescript
export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: Priority; // Enhanced from nullable to required with default
  is_completed: number;
  due_date: string | null;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

// Priority configuration
export const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    color: 'bg-red-100 text-red-800 border-red-300',
    sortOrder: 1
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    sortOrder: 2
  },
  low: {
    label: 'Low',
    color: 'bg-green-100 text-green-800 border-green-300',
    sortOrder: 3
  }
} as const;
```

### API Endpoints

#### 1. Create Todo with Priority

**Endpoint**: `POST /api/todos`

**Request Body**:
```json
{
  "title": "Complete project proposal",
  "description": "Draft initial proposal for Q4 project",
  "priority": "high",
  "due_date": "2025-11-15T17:00:00+08:00"
}
```

**Response** (201 Created):
```json
{
  "id": 42,
  "user_id": 1,
  "title": "Complete project proposal",
  "description": "Draft initial proposal for Q4 project",
  "priority": "high",
  "is_completed": 0,
  "due_date": "2025-11-15T17:00:00+08:00",
  "recurrence_pattern": null,
  "reminder_minutes": null,
  "last_notification_sent": null,
  "created_at": "2025-11-12T14:30:00+08:00",
  "updated_at": "2025-11-12T14:30:00+08:00"
}
```

#### 2. Update Todo Priority

**Endpoint**: `PUT /api/todos/[id]`

**Request Body** (partial update):
```json
{
  "priority": "low"
}
```

**Response** (200 OK):
```json
{
  "id": 42,
  "priority": "low",
  "updated_at": "2025-11-12T15:45:00+08:00"
}
```

#### 3. Get Todos with Priority Sorting

**Endpoint**: `GET /api/todos`

**Query Parameters**:
- `priority` (optional): Filter by specific priority level

**Example**: `GET /api/todos?priority=high`

**Response** (200 OK):
```json
{
  "todos": [
    {
      "id": 42,
      "title": "Critical deadline",
      "priority": "high",
      "is_completed": 0,
      ...
    },
    {
      "id": 38,
      "title": "Review code",
      "priority": "high",
      "is_completed": 0,
      ...
    }
  ],
  "count": 2
}
```

**Default Sorting Logic** (implemented in client):
```typescript
// Sort by: completion status → priority → due date → created date
todos.sort((a, b) => {
  // Incomplete todos first
  if (a.is_completed !== b.is_completed) {
    return a.is_completed - b.is_completed;
  }
  
  // Then by priority (high=1, medium=2, low=3)
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityDiff !== 0) return priorityDiff;
  
  // Then by due date (nearest first, nulls last)
  if (a.due_date && b.due_date) {
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  }
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  
  // Finally by created date (newest first)
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
});
```

### Database Operations

Add to `lib/db.ts` todoDB object:

```typescript
export const todoDB = {
  // ... existing methods ...
  
  getByPriority(userId: number, priority: Priority): Todo[] {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? AND priority = ?
      ORDER BY is_completed ASC, 
               CASE priority 
                 WHEN 'high' THEN 1 
                 WHEN 'medium' THEN 2 
                 WHEN 'low' THEN 3 
               END ASC,
               due_date ASC NULLS LAST,
               created_at DESC
    `);
    return stmt.all(userId, priority) as Todo[];
  },
  
  updatePriority(id: number, userId: number, priority: Priority): boolean {
    const stmt = db.prepare(`
      UPDATE todos 
      SET priority = ?, updated_at = datetime('now') 
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(priority, id, userId);
    return result.changes > 0;
  },
  
  getPriorityStats(userId: number): { priority: Priority; count: number }[] {
    const stmt = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM todos 
      WHERE user_id = ? AND is_completed = 0
      GROUP BY priority
    `);
    return stmt.all(userId) as { priority: Priority; count: number }[];
  }
};
```

## UI Components

### Priority Badge Component

```tsx
import { Priority, PRIORITY_CONFIG } from '@/lib/db';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  return (
    <span 
      className={`
        inline-flex items-center rounded-full border font-medium
        ${config.color}
        ${sizeClasses[size]}
      `}
      aria-label={`Priority: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
```

### Priority Selector Component

```tsx
import { Priority } from '@/lib/db';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  disabled?: boolean;
}

export function PrioritySelector({ value, onChange, disabled }: PrioritySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      disabled={disabled}
      className="
        rounded-md border border-gray-300 px-3 py-2
        text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
      "
      aria-label="Select priority"
    >
      <option value="high">🔴 High Priority</option>
      <option value="medium">🟡 Medium Priority</option>
      <option value="low">🟢 Low Priority</option>
    </select>
  );
}
```

### Priority Filter Component

```tsx
import { Priority } from '@/lib/db';
import { useState } from 'react';

interface PriorityFilterProps {
  onFilterChange: (priority: Priority | null) => void;
  stats?: { priority: Priority; count: number }[];
}

export function PriorityFilter({ onFilterChange, stats }: PriorityFilterProps) {
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  
  const handleChange = (value: string) => {
    const priority = value === 'all' ? null : (value as Priority);
    setSelectedPriority(priority);
    onFilterChange(priority);
  };
  
  const getCount = (priority: Priority) => {
    return stats?.find(s => s.priority === priority)?.count ?? 0;
  };
  
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="priority-filter" className="text-sm font-medium text-gray-700">
        Filter by Priority:
      </label>
      <select
        id="priority-filter"
        value={selectedPriority ?? 'all'}
        onChange={(e) => handleChange(e.target.value)}
        className="
          rounded-md border border-gray-300 px-3 py-2
          text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
        "
      >
        <option value="all">All Priorities</option>
        <option value="high">🔴 High ({getCount('high')})</option>
        <option value="medium">🟡 Medium ({getCount('medium')})</option>
        <option value="low">🟢 Low ({getCount('low')})</option>
      </select>
      {selectedPriority && (
        <button
          onClick={() => handleChange('all')}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
```

### Integration in Main Todo Component

```tsx
// In app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Todo, Priority } from '@/lib/db';
import { PriorityBadge } from '@/components/PriorityBadge';
import { PrioritySelector } from '@/components/PrioritySelector';
import { PriorityFilter } from '@/components/PriorityFilter';

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [priorityStats, setPriorityStats] = useState<{ priority: Priority; count: number }[]>([]);
  
  // Fetch priority stats
  useEffect(() => {
    fetch('/api/todos/stats/priority')
      .then(res => res.json())
      .then(data => setPriorityStats(data.stats));
  }, [todos]);
  
  // Client-side sorting with priority
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed - b.is_completed;
    }
    
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  // Filter by priority
  const filteredTodos = priorityFilter
    ? sortedTodos.filter(todo => todo.priority === priorityFilter)
    : sortedTodos;
  
  // Handle priority change
  const updateTodoPriority = async (todoId: number, newPriority: Priority) => {
    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === todoId ? { ...t, priority: newPriority } : t
    ));
    
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update priority');
      }
    } catch (error) {
      // Revert on error
      fetchTodos();
      console.error('Error updating priority:', error);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <PriorityFilter 
          onFilterChange={setPriorityFilter}
          stats={priorityStats}
        />
      </div>
      
      <div className="space-y-4">
        {filteredTodos.map(todo => (
          <div key={todo.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{todo.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <PriorityBadge priority={todo.priority} />
                </div>
              </div>
              
              <PrioritySelector
                value={todo.priority}
                onChange={(priority) => updateTodoPriority(todo.id, priority)}
                disabled={todo.is_completed === 1}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Edge Cases

### 1. Priority with Completed Todos

**Scenario**: User completes a High priority todo
**Expected Behavior**: 
- Todo moves to completed section
- Priority badge remains visible but grayed out
- Todo no longer appears in active priority sorting
- Priority is preserved in database for historical record

**Implementation**:
```typescript
// Completed todos show muted priority badge
<PriorityBadge 
  priority={todo.priority} 
  className={todo.is_completed ? 'opacity-50' : ''}
/>
```

### 2. Bulk Priority Changes

**Scenario**: User wants to change multiple todos to High priority simultaneously
**Expected Behavior**:
- Not supported in current scope (no multi-select)
- User must change priority one-by-one
- Each change triggers individual API call
- Optimistic UI updates provide immediate feedback

### 3. Priority in Recurring Todos

**Scenario**: User completes High priority recurring todo
**Expected Behavior**:
- Next instance inherits High priority
- User can modify next instance priority independently
- Priority inheritance is automatic, not configurable

**Implementation** (in `PUT /api/todos/[id]` when marking complete):
```typescript
if (todo.recurrence_pattern && updates.is_completed === 1) {
  const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);
  
  todoDB.create({
    user_id: todo.user_id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority, // Inherit priority
    due_date: nextDueDate,
    recurrence_pattern: todo.recurrence_pattern,
    reminder_minutes: todo.reminder_minutes
  });
}
```

### 4. Invalid Priority Values

**Scenario**: API receives invalid priority value (e.g., "urgent", "critical")
**Expected Behavior**:
- Database constraint rejects invalid value
- API returns 400 Bad Request with clear error message
- Client validation prevents invalid selection

**Validation**:
```typescript
// In API route
const validPriorities = ['high', 'medium', 'low'];
if (priority && !validPriorities.includes(priority)) {
  return NextResponse.json(
    { error: 'Invalid priority. Must be high, medium, or low.' },
    { status: 400 }
  );
}
```

### 5. Default Priority for New Todos

**Scenario**: User creates todo without selecting priority
**Expected Behavior**:
- Default to "medium" priority
- Database default constraint applies
- UI pre-selects "Medium" in dropdown

### 6. Priority Filter with Empty Results

**Scenario**: User filters by High priority but has no High priority todos
**Expected Behavior**:
- Show empty state message: "No high priority todos found"
- Display option to clear filter
- Show create button with pre-selected High priority

### 7. Priority Sorting with Same Priority Levels

**Scenario**: Multiple todos have same priority
**Expected Behavior**:
- Secondary sort by due date (nearest first)
- Tertiary sort by created date (newest first)
- Todos without due dates appear last within priority group

### 8. Migrating Existing Todos

**Scenario**: Existing database has todos with NULL priority (pre-feature)
**Expected Behavior**:
- Migration sets NULL priorities to "medium"
- All existing todos get default priority
- No data loss

**Migration**:
```sql
UPDATE todos SET priority = 'medium' WHERE priority IS NULL;
```

## Acceptance Criteria

### Functional Requirements

✅ **AC-1**: User can select priority (High/Medium/Low) when creating new todo
- Priority dropdown is visible in create todo form
- Default selection is "Medium"
- Selected priority is saved to database

✅ **AC-2**: User can change priority of existing todo
- Priority dropdown is available on todo card
- Change triggers immediate API update
- UI reflects change without page refresh

✅ **AC-3**: Todos display color-coded priority badges
- High priority: Red badge (bg-red-100, text-red-800)
- Medium priority: Yellow badge (bg-yellow-100, text-yellow-800)
- Low priority: Green badge (bg-green-100, text-green-800)
- Badges are visible and accessible

✅ **AC-4**: Todos are automatically sorted by priority
- Incomplete todos appear before completed todos
- Within each group, High → Medium → Low order
- Same priority todos sorted by due date, then created date

✅ **AC-5**: User can filter todos by priority
- Filter dropdown shows All/High/Medium/Low options
- Filter displays count of todos in each priority
- Filtering updates list without page reload

✅ **AC-6**: Priority is preserved in recurring todos
- Completed recurring todo creates next instance with same priority
- Next instance can be modified independently

✅ **AC-7**: Completed todos show muted priority indicators
- Priority badge remains visible on completed todos
- Badge has reduced opacity (50%)
- Priority cannot be changed on completed todos

### Non-Functional Requirements

✅ **AC-8**: Priority changes are optimistic
- UI updates immediately on selection
- API call happens in background
- Reverts on error with user notification

✅ **AC-9**: Priority filter is performant
- Filtering happens client-side
- No perceptible delay with 1000+ todos
- Stats calculation is efficient

✅ **AC-10**: Accessibility compliance
- Priority selectors are keyboard navigable
- Screen readers announce priority levels
- Color is not the only indicator (text labels included)

## Testing Requirements

### E2E Tests (Playwright)

**Test File**: `tests/02-priority-system.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers';

test.describe('Priority System', () => {
  let authHelper: AuthHelper;
  
  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.registerAndLogin();
  });
  
  test('should create todo with high priority', async ({ page }) => {
    await page.fill('input[name="title"]', 'Urgent task');
    await page.selectOption('select[name="priority"]', 'high');
    await page.click('button:has-text("Add Todo")');
    
    // Verify badge
    const badge = page.locator('text=Urgent task').locator('..').locator('.bg-red-100');
    await expect(badge).toContainText('High');
  });
  
  test('should sort todos by priority', async ({ page }) => {
    // Create todos with different priorities
    await authHelper.createTodo('Low priority task', { priority: 'low' });
    await authHelper.createTodo('High priority task', { priority: 'high' });
    await authHelper.createTodo('Medium priority task', { priority: 'medium' });
    
    // Verify order
    const todos = page.locator('[data-testid="todo-item"]');
    await expect(todos.nth(0)).toContainText('High priority task');
    await expect(todos.nth(1)).toContainText('Medium priority task');
    await expect(todos.nth(2)).toContainText('Low priority task');
  });
  
  test('should change todo priority', async ({ page }) => {
    await authHelper.createTodo('Task to reprioritize', { priority: 'low' });
    
    // Change priority
    await page.selectOption('[data-testid="todo-1"] select[name="priority"]', 'high');
    
    // Verify update
    await page.waitForTimeout(500); // Wait for API
    const badge = page.locator('[data-testid="todo-1"] .bg-red-100');
    await expect(badge).toContainText('High');
  });
  
  test('should filter todos by priority', async ({ page }) => {
    await authHelper.createTodo('High task 1', { priority: 'high' });
    await authHelper.createTodo('Low task 1', { priority: 'low' });
    await authHelper.createTodo('High task 2', { priority: 'high' });
    
    // Apply filter
    await page.selectOption('select[aria-label="Filter by priority"]', 'high');
    
    // Verify filtered list
    const todos = page.locator('[data-testid="todo-item"]');
    await expect(todos).toHaveCount(2);
    await expect(todos.nth(0)).toContainText('High task');
    await expect(todos.nth(1)).toContainText('High task');
  });
  
  test('should preserve priority in recurring todos', async ({ page }) => {
    await authHelper.createTodo('Weekly meeting', {
      priority: 'high',
      recurrence: 'weekly',
      dueDate: '2025-11-13'
    });
    
    // Complete todo
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    
    // Verify next instance has high priority
    await page.waitForTimeout(500);
    const newTodoBadge = page.locator('[data-testid="todo-2"] .bg-red-100');
    await expect(newTodoBadge).toContainText('High');
  });
  
  test('should show muted priority on completed todos', async ({ page }) => {
    await authHelper.createTodo('Task to complete', { priority: 'high' });
    
    // Complete todo
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    
    // Verify muted badge
    const badge = page.locator('[data-testid="todo-1"] .bg-red-100');
    await expect(badge).toHaveClass(/opacity-50/);
  });
  
  test('should display priority stats in filter', async ({ page }) => {
    await authHelper.createTodo('High 1', { priority: 'high' });
    await authHelper.createTodo('High 2', { priority: 'high' });
    await authHelper.createTodo('Low 1', { priority: 'low' });
    
    // Check filter counts
    const filterSelect = page.locator('select[aria-label="Filter by priority"]');
    const highOption = filterSelect.locator('option[value="high"]');
    await expect(highOption).toContainText('(2)');
    
    const lowOption = filterSelect.locator('option[value="low"]');
    await expect(lowOption).toContainText('(1)');
  });
});
```

### Unit Tests

**Test File**: `tests/unit/priority.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { PRIORITY_CONFIG } from '@/lib/db';

describe('Priority Configuration', () => {
  it('should have correct sort order', () => {
    expect(PRIORITY_CONFIG.high.sortOrder).toBe(1);
    expect(PRIORITY_CONFIG.medium.sortOrder).toBe(2);
    expect(PRIORITY_CONFIG.low.sortOrder).toBe(3);
  });
  
  it('should have distinct colors for each priority', () => {
    const colors = Object.values(PRIORITY_CONFIG).map(c => c.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(3);
  });
});

describe('Priority Sorting', () => {
  it('should sort by priority then due date', () => {
    const todos = [
      { priority: 'low', due_date: '2025-11-15', is_completed: 0 },
      { priority: 'high', due_date: '2025-11-20', is_completed: 0 },
      { priority: 'high', due_date: '2025-11-18', is_completed: 0 },
      { priority: 'medium', due_date: '2025-11-16', is_completed: 0 }
    ];
    
    const sorted = sortTodos(todos);
    
    expect(sorted[0].priority).toBe('high');
    expect(sorted[0].due_date).toBe('2025-11-18');
    expect(sorted[1].priority).toBe('high');
    expect(sorted[1].due_date).toBe('2025-11-20');
    expect(sorted[2].priority).toBe('medium');
    expect(sorted[3].priority).toBe('low');
  });
});
```

### API Tests

**Test File**: `tests/api/priority.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as createTodo } from '@/app/api/todos/route';
import { PUT as updateTodo } from '@/app/api/todos/[id]/route';

describe('Priority API Endpoints', () => {
  it('should create todo with specified priority', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'High priority task',
        priority: 'high'
      }
    });
    
    const response = await createTodo(req);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.priority).toBe('high');
  });
  
  it('should default to medium priority when not specified', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Task without priority'
      }
    });
    
    const response = await createTodo(req);
    const data = await response.json();
    
    expect(data.priority).toBe('medium');
  });
  
  it('should reject invalid priority values', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Task',
        priority: 'urgent'
      }
    });
    
    const response = await createTodo(req);
    
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('error');
  });
  
  it('should update todo priority', async () => {
    // Create todo first
    const createRes = await createTodo(/* ... */);
    const { id } = await createRes.json();
    
    // Update priority
    const { req: updateReq } = createMocks({
      method: 'PUT',
      body: { priority: 'high' }
    });
    
    const response = await updateTodo(updateReq, { params: { id } });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.priority).toBe('high');
  });
});
```

## Out of Scope

The following features are explicitly **not included** in this PRP:

### 1. Custom Priority Levels
- No ability to create user-defined priority levels
- Fixed three-level system only
- No priority level customization (naming, colors, sort order)

### 2. Priority-Based Automation
- No automatic priority adjustment based on due date proximity
- No auto-escalation of overdue tasks to high priority
- No smart priority suggestions based on keywords

### 3. Bulk Priority Operations
- No multi-select for changing multiple todo priorities at once
- No "Set all to High" bulk action
- Each priority change must be individual

### 4. Priority Statistics Dashboard
- No analytics view for priority distribution over time
- No charts/graphs of priority completion rates
- Basic count in filter dropdown only

### 5. Priority-Based Notifications
- No separate notification channels for high priority items
- No different notification sounds per priority level
- Reminders treat all priorities equally

### 6. Sub-Priority or Numeric Priorities
- No 1-10 numeric scale
- No sub-levels (e.g., "High-Critical", "High-Normal")
- Three discrete levels only

### 7. Team/Shared Priority
- No delegation of priority settings to other users
- No team consensus on priority levels
- Single-user priority assignment only

### 8. Priority History/Audit Log
- No tracking of priority changes over time
- No "changed from Medium to High on X date" history
- Current priority only

## Success Metrics

### User Engagement Metrics

1. **Priority Adoption Rate**
   - Target: >80% of todos have non-default priority within 2 weeks
   - Measure: `COUNT(priority != 'medium') / COUNT(*) * 100`

2. **High Priority Completion Rate**
   - Target: High priority todos completed 20% faster than low priority
   - Measure: `AVG(completed_at - created_at) WHERE priority='high'`

3. **Filter Usage**
   - Target: >40% of users use priority filter at least once per week
   - Measure: Client-side analytics on filter interaction events

### System Performance Metrics

4. **Priority Change Response Time**
   - Target: <200ms for priority update (optimistic UI)
   - Measure: API response time for `PUT /api/todos/[id]` with priority change

5. **Sort Performance**
   - Target: <50ms to sort 1000 todos client-side
   - Measure: `performance.now()` around sort function

### User Satisfaction Metrics

6. **Task Completion Efficiency**
   - Target: 30% reduction in time spent deciding what to work on next
   - Measure: User surveys pre/post feature launch

7. **Visual Clarity Score**
   - Target: >4.5/5 rating on "I can quickly identify important tasks"
   - Measure: In-app feedback survey

### Technical Quality Metrics

8. **Error Rate**
   - Target: <0.1% error rate on priority operations
   - Measure: API error responses / total priority API calls

9. **Accessibility Compliance**
   - Target: 100% WCAG 2.1 AA compliance for priority UI elements
   - Measure: Automated accessibility testing (axe-core)

10. **Test Coverage**
    - Target: >90% code coverage for priority-related functions
    - Measure: Jest/Vitest coverage report

---

## Implementation Checklist

- [ ] Add priority validation to API routes
- [ ] Implement priority sorting in client component
- [ ] Create PriorityBadge component with color coding
- [ ] Create PrioritySelector dropdown component
- [ ] Create PriorityFilter component with stats
- [ ] Add priority inheritance to recurring todo logic
- [ ] Implement optimistic UI updates for priority changes
- [ ] Add database indexes for priority queries
- [ ] Write E2E tests for all priority user flows
- [ ] Write unit tests for sorting logic
- [ ] Add API tests for priority validation
- [ ] Verify accessibility with screen reader
- [ ] Performance test with 1000+ todos
- [ ] Update USER_GUIDE.md with priority documentation

---

**Version**: 1.0  
**Last Updated**: November 12, 2025  
**Related PRPs**: 01-todo-crud-operations.md, 03-recurring-todos.md, 07-template-system.md
