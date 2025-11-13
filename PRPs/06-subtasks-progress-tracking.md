# Product Requirement Prompt (PRP): Subtasks & Progress Tracking

## Feature Overview

The Subtasks & Progress Tracking feature enables users to break down complex todos into manageable, sequential steps with visual progress indicators. This feature provides a checklist-style interface where users can add, complete, and reorder subtasks while tracking overall completion percentage through intuitive progress bars.

**Key Capabilities**:
- Create unlimited subtasks per todo
- Visual progress bars showing completion percentage (e.g., "2/5 completed - 40%")
- Position-based ordering for logical task sequencing
- Toggle individual subtask completion status
- Automatic cascade deletion when parent todo is removed
- Real-time progress calculation
- Inline editing of subtask titles

**Business Value**:
- Reduces cognitive load by breaking large tasks into smaller steps
- Increases task completion rates through visible progress
- Provides clear roadmap for complex multi-step tasks
- Improves user satisfaction through sense of accomplishment

---

## User Stories

### Primary User Stories

**Story 1: Breaking Down Complex Tasks**
- **As** Sarah (Marketing Manager)
- **I want to** break down my "Launch Campaign" todo into specific steps
- **So that** I can track progress through each phase without feeling overwhelmed
- **Acceptance**: Can add multiple subtasks like "Design assets", "Write copy", "Schedule posts"

**Story 2: Visual Progress Tracking**
- **As** Alex (University Student)
- **I want to** see a progress bar showing how much of my assignment is complete
- **So that** I can estimate remaining time and stay motivated
- **Acceptance**: Progress bar updates in real-time as subtasks are checked off

**Story 3: Task Sequencing**
- **As** Jamie (Freelance Developer)
- **I want to** order subtasks in the sequence they should be completed
- **So that** I follow the correct workflow for client projects
- **Acceptance**: Subtasks display in specified position order from 0 to N

**Story 4: Quick Completion Tracking**
- **As** Sarah (Marketing Manager)
- **I want to** quickly check off completed steps without opening dialogs
- **So that** I can maintain workflow momentum during busy days
- **Acceptance**: Single click/tap toggles subtask completion with visual feedback

### Secondary User Stories

**Story 5: Subtask Editing**
- **As** Alex (University Student)
- **I want to** edit subtask titles if requirements change
- **So that** my checklist remains accurate and relevant
- **Acceptance**: Can edit subtask text inline or via edit mode

**Story 6: Clean Deletion**
- **As** Jamie (Freelance Developer)
- **I want to** delete completed todos knowing subtasks are also removed
- **So that** I don't accumulate orphaned data in my database
- **Acceptance**: Deleting todo automatically removes all associated subtasks

---

## User Flow

### Flow 1: Adding Subtasks to Todo

```
1. User creates or opens existing todo
2. User clicks "Add Subtask" button (+ icon)
3. Input field appears below existing subtasks
4. User types subtask title (e.g., "Research competitors")
5. User presses Enter or clicks Save
6. System creates subtask with next available position
7. Subtask appears in list with empty checkbox
8. Progress bar updates to show "0/1 completed (0%)"
9. User can add more subtasks, repeating steps 2-8
```

**Alternative Flow**: User abandons subtask creation
- User clicks Cancel or presses Escape
- Input field disappears without creating subtask

### Flow 2: Completing Subtasks

```
1. User views todo with subtasks (e.g., 3 uncompleted subtasks)
2. Progress bar shows "0/3 completed (0%)"
3. User clicks checkbox next to first subtask
4. Checkbox fills with checkmark animation
5. Subtask text shows strikethrough styling
6. Progress bar animates to "1/3 completed (33%)"
7. User completes second subtask
8. Progress bar updates to "2/3 completed (67%)"
9. User completes final subtask
10. Progress bar shows "3/3 completed (100%)" with success color
11. Optional: System prompts to mark parent todo as complete
```

**Alternative Flow**: User unchecks completed subtask
- User clicks checkbox on completed subtask
- Checkmark disappears
- Strikethrough removed
- Progress bar decreases percentage

### Flow 3: Reordering Subtasks

```
1. User views todo with multiple subtasks in default order
2. User enters edit mode (if required)
3. User drags subtask by handle icon
4. Visual placeholder shows new position
5. User drops subtask in desired position
6. System recalculates position values (0, 1, 2...)
7. Subtasks display in new order
8. System persists updated positions to database
```

**Alternative Flow**: Simplified position editing
- User clicks up/down arrows next to subtask
- Subtask swaps position with adjacent item
- Order updates immediately

### Flow 4: Deleting Subtasks

```
1. User views todo with subtasks
2. User hovers over subtask row
3. Delete icon (trash) appears
4. User clicks delete icon
5. System shows confirmation dialog (optional)
6. User confirms deletion
7. Subtask removed from UI with fade animation
8. Progress bar recalculates (e.g., "2/4" becomes "2/3")
9. Position values of remaining subtasks reindex if needed
```

### Flow 5: Todo Deletion with Cascade

```
1. User decides to delete entire todo
2. User clicks delete button on todo card
3. System shows confirmation: "Delete todo and all X subtasks?"
4. User confirms deletion
5. System executes CASCADE DELETE (database foreign key)
6. Todo and all associated subtasks removed
7. UI removes todo card with animation
8. Success message: "Todo and 5 subtasks deleted"
```

---

## Technical Requirements

### Database Schema

**Existing `subtasks` Table** (from main PRP):

```sql
CREATE TABLE subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE INDEX idx_subtasks_todo_id ON subtasks(todo_id);
CREATE INDEX idx_subtasks_position ON subtasks(todo_id, position);
```

**Column Specifications**:
- `id`: Primary key, auto-increment
- `todo_id`: Foreign key to parent todo, **CASCADE DELETE** enabled
- `title`: Subtask description, max 500 characters, required
- `completed`: Boolean (0=uncompleted, 1=completed), default 0
- `position`: Integer ordering, 0-indexed, used for display order
- `created_at`: ISO 8601 timestamp in Singapore timezone

**Constraints**:
- `title` must be non-empty after trimming whitespace
- `position` should be unique per `todo_id` (enforced in application logic)
- `todo_id` must reference existing todo

### TypeScript Interfaces

```typescript
// lib/db.ts
export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean; // Converted from 0/1 in DB
  position: number;
  created_at: string; // ISO 8601 format
}

export interface SubtaskCreateInput {
  todo_id: number;
  title: string;
  position?: number; // Auto-calculated if omitted
}

export interface SubtaskUpdateInput {
  title?: string;
  completed?: boolean;
  position?: number;
}

export interface SubtaskProgress {
  total: number;
  completed: number;
  percentage: number;
}

// Extended Todo interface with subtasks
export interface TodoWithSubtasks extends Todo {
  subtasks: Subtask[];
  progress: SubtaskProgress;
}
```

### API Endpoints

#### 1. Get Subtasks for Todo

```typescript
GET /api/todos/[id]/subtasks

Headers:
  Cookie: session=<jwt_token>

Response: 200 OK
{
  "subtasks": [
    {
      "id": 1,
      "todo_id": 5,
      "title": "Research competitors",
      "completed": true,
      "position": 0,
      "created_at": "2025-11-12T09:00:00+08:00"
    },
    {
      "id": 2,
      "todo_id": 5,
      "title": "Draft content",
      "completed": false,
      "position": 1,
      "created_at": "2025-11-12T09:05:00+08:00"
    }
  ]
}

Error Responses:
  401 Unauthorized - Not authenticated
  403 Forbidden - Todo belongs to different user
  404 Not Found - Todo ID doesn't exist
```

**Implementation Notes**:
- Retrieve subtasks ordered by `position ASC`
- Verify `todo_id` belongs to authenticated user
- Convert DB integers (0/1) to booleans for `completed`

#### 2. Create Subtask

```typescript
POST /api/todos/[id]/subtasks

Headers:
  Cookie: session=<jwt_token>
  Content-Type: application/json

Request Body:
{
  "title": "Review with team",
  "position": 2  // Optional, auto-calculated if omitted
}

Response: 201 Created
{
  "subtask": {
    "id": 3,
    "todo_id": 5,
    "title": "Review with team",
    "completed": false,
    "position": 2,
    "created_at": "2025-11-12T10:30:00+08:00"
  }
}

Error Responses:
  400 Bad Request - Invalid input (empty title, negative position)
  401 Unauthorized - Not authenticated
  403 Forbidden - Todo belongs to different user
  404 Not Found - Todo ID doesn't exist
```

**Position Calculation Logic**:
```typescript
// If position not provided, append to end
const maxPosition = db.prepare(`
  SELECT MAX(position) as max FROM subtasks WHERE todo_id = ?
`).get(todoId).max;

const newPosition = position ?? ((maxPosition ?? -1) + 1);
```

**Validation Rules**:
- `title`: Required, 1-500 characters after trim
- `position`: Optional, non-negative integer
- Check for duplicate positions (auto-reindex if conflict)

#### 3. Update Subtask

```typescript
PUT /api/todos/[id]/subtasks/[subtaskId]

Headers:
  Cookie: session=<jwt_token>
  Content-Type: application/json

Request Body (all fields optional):
{
  "title": "Review with team and stakeholders",
  "completed": true,
  "position": 1
}

Response: 200 OK
{
  "subtask": {
    "id": 3,
    "todo_id": 5,
    "title": "Review with team and stakeholders",
    "completed": true,
    "position": 1,
    "created_at": "2025-11-12T10:30:00+08:00"
  }
}

Error Responses:
  400 Bad Request - Invalid input
  401 Unauthorized - Not authenticated
  403 Forbidden - Subtask's parent todo belongs to different user
  404 Not Found - Subtask ID doesn't exist
```

**Authorization Check**:
```typescript
// Verify subtask belongs to user's todo
const subtask = db.prepare(`
  SELECT s.*, t.user_id 
  FROM subtasks s
  JOIN todos t ON s.todo_id = t.id
  WHERE s.id = ?
`).get(subtaskId);

if (!subtask || subtask.user_id !== session.userId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

#### 4. Delete Subtask

```typescript
DELETE /api/todos/[id]/subtasks/[subtaskId]

Headers:
  Cookie: session=<jwt_token>

Response: 200 OK
{
  "success": true,
  "deleted_id": 3
}

Error Responses:
  401 Unauthorized - Not authenticated
  403 Forbidden - Subtask's parent todo belongs to different user
  404 Not Found - Subtask ID doesn't exist
```

**Post-Delete Actions**:
- No need to reindex positions (gaps are acceptable)
- Frontend should refresh subtask list and recalculate progress

#### 5. Reorder Subtasks

```typescript
PUT /api/todos/[id]/subtasks/reorder

Headers:
  Cookie: session=<jwt_token>
  Content-Type: application/json

Request Body:
{
  "subtask_ids": [2, 3, 1]  // Array of subtask IDs in new order
}

Response: 200 OK
{
  "success": true,
  "updated_count": 3
}

Error Responses:
  400 Bad Request - Invalid array or subtask IDs don't belong to todo
  401 Unauthorized - Not authenticated
  403 Forbidden - Todo belongs to different user
```

**Implementation**:
```typescript
// Update positions in transaction
db.transaction(() => {
  subtask_ids.forEach((subtaskId, index) => {
    db.prepare(`
      UPDATE subtasks SET position = ? WHERE id = ? AND todo_id = ?
    `).run(index, subtaskId, todoId);
  });
})();
```

### Database Operations (lib/db.ts)

```typescript
// Subtask CRUD operations
export const subtaskDB = {
  // Get all subtasks for a todo
  getByTodoId(todoId: number): Subtask[] {
    const rows = db.prepare(`
      SELECT * FROM subtasks 
      WHERE todo_id = ? 
      ORDER BY position ASC
    `).all(todoId);
    
    return rows.map(row => ({
      ...row,
      completed: row.completed === 1
    }));
  },

  // Get single subtask by ID
  getById(id: number): Subtask | null {
    const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    if (!row) return null;
    return { ...row, completed: row.completed === 1 };
  },

  // Create new subtask
  create(input: SubtaskCreateInput): Subtask {
    const now = getSingaporeNow().toISOString();
    
    // Calculate position if not provided
    let position = input.position;
    if (position === undefined) {
      const maxPos = db.prepare(`
        SELECT MAX(position) as max FROM subtasks WHERE todo_id = ?
      `).get(input.todo_id);
      position = (maxPos?.max ?? -1) + 1;
    }

    const result = db.prepare(`
      INSERT INTO subtasks (todo_id, title, completed, position, created_at)
      VALUES (?, ?, 0, ?, ?)
    `).run(input.todo_id, input.title.trim(), position, now);

    return this.getById(result.lastInsertRowid as number)!;
  },

  // Update subtask
  update(id: number, input: SubtaskUpdateInput): Subtask {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title.trim());
    }
    if (input.completed !== undefined) {
      updates.push('completed = ?');
      values.push(input.completed ? 1 : 0);
    }
    if (input.position !== undefined) {
      updates.push('position = ?');
      values.push(input.position);
    }

    if (updates.length === 0) {
      return this.getById(id)!;
    }

    values.push(id);
    db.prepare(`
      UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    return this.getById(id)!;
  },

  // Delete subtask
  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Delete all subtasks for a todo (used internally, cascade handles this)
  deleteByTodoId(todoId: number): number {
    const result = db.prepare('DELETE FROM subtasks WHERE todo_id = ?').run(todoId);
    return result.changes;
  },

  // Calculate progress for a todo
  calculateProgress(todoId: number): SubtaskProgress {
    const subtasks = this.getByTodoId(todoId);
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }
};
```

---

## UI Components

### Component 1: SubtaskList

**Purpose**: Display list of subtasks with checkboxes and progress bar

```tsx
// app/page.tsx (inline component)

interface SubtaskListProps {
  todoId: number;
  subtasks: Subtask[];
  onToggle: (subtaskId: number, completed: boolean) => Promise<void>;
  onDelete: (subtaskId: number) => Promise<void>;
  onAdd: (title: string) => Promise<void>;
}

function SubtaskList({ todoId, subtasks, onToggle, onDelete, onAdd }: SubtaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const progress = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [subtasks]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await onAdd(newTitle.trim());
    setNewTitle('');
    setIsAdding(false);
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Progress Bar */}
      {subtasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress.completed}/{progress.total} completed ({progress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                progress.percentage === 100 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask List */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Add Subtask Input */}
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            placeholder="Enter subtask title..."
            className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Subtask
        </button>
      )}
    </div>
  );
}
```

### Component 2: SubtaskItem

**Purpose**: Individual subtask row with checkbox, title, and actions

```tsx
interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (subtaskId: number, completed: boolean) => Promise<void>;
  onDelete: (subtaskId: number) => Promise<void>;
}

function SubtaskItem({ subtask, onToggle, onDelete }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [isHovered, setIsHovered] = useState(false);

  const handleSaveEdit = async () => {
    if (editTitle.trim() && editTitle !== subtask.title) {
      // Call update API
      await fetch(`/api/todos/${subtask.todo_id}/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      });
    }
    setIsEditing(false);
  };

  return (
    <div 
      className="flex items-center gap-2 group py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={(e) => onToggle(subtask.id, e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
      />

      {/* Title */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          onBlur={handleSaveEdit}
          className="flex-1 px-2 py-0.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-sm cursor-text ${
            subtask.completed 
              ? 'line-through text-gray-500 dark:text-gray-400' 
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {subtask.title}
        </span>
      )}

      {/* Delete Button */}
      {isHovered && !isEditing && (
        <button
          onClick={() => onDelete(subtask.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
          title="Delete subtask"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### Component 3: Progress Bar Variants

**Purpose**: Different visual styles for progress indication

```tsx
// Compact Progress Bar (for todo card preview)
function CompactProgressBar({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {completed}/{total}
      </span>
    </div>
  );
}

// Detailed Progress Bar (for expanded view)
function DetailedProgressBar({ subtasks }: { subtasks: Subtask[] }) {
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getColorClasses = () => {
    if (percentage === 0) return 'bg-gray-300';
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Subtasks Progress
        </span>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {completed} of {total} completed
        </span>
      </div>
      <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${getColorClasses()}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
```

### Component 4: Empty State

```tsx
function SubtaskEmptyState({ onAddFirst }: { onAddFirst: () => void }) {
  return (
    <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <svg 
        className="w-12 h-12 mx-auto text-gray-400 mb-3" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        No subtasks yet. Break this todo into smaller steps!
      </p>
      <button
        onClick={onAddFirst}
        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
      >
        Add First Subtask
      </button>
    </div>
  );
}
```

---

## Edge Cases

### 1. Empty Subtask List

**Scenario**: Todo has no subtasks

**Handling**:
- Display empty state component with "Add First Subtask" CTA
- Progress bar shows "0/0 completed (0%)" or hide entirely
- Ensure "Add Subtask" button is always accessible

**Implementation**:
```typescript
if (subtasks.length === 0) {
  return <SubtaskEmptyState onAddFirst={() => setIsAdding(true)} />;
}
```

### 2. All Subtasks Completed

**Scenario**: User completes all subtasks but parent todo remains incomplete

**Handling**:
- Progress bar turns green and shows 100%
- Optional: Show prompt "Mark todo as complete?"
- Optional: Auto-complete parent todo after 2 seconds (with undo option)

**Implementation**:
```typescript
useEffect(() => {
  if (subtasks.length > 0 && subtasks.every(s => s.completed) && !todo.completed) {
    // Show completion prompt
    setShowCompletePrompt(true);
  }
}, [subtasks, todo.completed]);
```

### 3. Position Conflicts

**Scenario**: Two subtasks have same position value (data corruption or race condition)

**Handling**:
- Application sorts by position, then by ID as tiebreaker
- Provide admin function to reindex positions (0, 1, 2, ...)
- Log warning for manual investigation

**SQL Sort**:
```sql
SELECT * FROM subtasks 
WHERE todo_id = ? 
ORDER BY position ASC, id ASC
```

### 4. Cascade Delete Verification

**Scenario**: User deletes todo with many subtasks

**Handling**:
- Show confirmation dialog: "Delete todo and 12 subtasks?"
- Database CASCADE DELETE handles cleanup automatically
- Log deletion count for analytics

**Confirmation Dialog**:
```tsx
const subtaskCount = subtasks.length;
const message = subtaskCount > 0 
  ? `Delete this todo and ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}?`
  : 'Delete this todo?';
```

### 5. Very Long Subtask List

**Scenario**: User creates 50+ subtasks (edge case)

**Handling**:
- Implement virtualization for lists > 20 items
- Add pagination or "Load more" button
- Set soft limit warning at 25 subtasks
- Consider suggesting todo should be split into multiple todos

**Soft Limit**:
```typescript
const MAX_SUBTASKS_WARNING = 25;

if (subtasks.length >= MAX_SUBTASKS_WARNING) {
  showWarning('Consider splitting this into multiple todos for better organization');
}
```

### 6. Long Subtask Titles

**Scenario**: User enters 500-character subtask title

**Handling**:
- Truncate display with ellipsis after 100 characters
- Show full title on hover (tooltip)
- Allow viewing/editing full title in edit mode
- Database allows up to 500 characters

**CSS Truncation**:
```css
.subtask-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
}
```

### 7. Rapid Toggle Clicks

**Scenario**: User rapidly clicks checkbox multiple times

**Handling**:
- Debounce API calls (300ms)
- Optimistic UI updates for immediate feedback
- Queue requests to prevent race conditions
- Last click wins if conflicts occur

**Debounced Toggle**:
```typescript
const debouncedToggle = useMemo(
  () => debounce(async (id: number, completed: boolean) => {
    await fetch(`/api/todos/${todoId}/subtasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
  }, 300),
  [todoId]
);
```

### 8. Offline Behavior

**Scenario**: User tries to add/edit subtasks without internet connection

**Handling**:
- Queue operations in local storage (future: service worker)
- Show "Offline" indicator
- Sync when connection restored
- **Current MVP**: Show error message, prevent changes

### 9. Subtask Without Parent Todo

**Scenario**: Database corruption or migration error leaves orphaned subtask

**Handling**:
- Foreign key constraint prevents this in normal operation
- Database migration should clean orphaned records
- Application never displays subtasks without parent
- Admin cleanup script:

```typescript
// Cleanup orphaned subtasks
db.prepare(`
  DELETE FROM subtasks 
  WHERE todo_id NOT IN (SELECT id FROM todos)
`).run();
```

### 10. Unicode and Special Characters

**Scenario**: User enters emoji, non-Latin characters, or special symbols

**Handling**:
- SQLite supports UTF-8 by default
- No character restrictions beyond length
- Render properly in UI with correct font fallbacks
- Test with: 🚀, 中文, العربية, ñ

---

## Acceptance Criteria

### Core Functionality

**AC1: Create Subtask**
- ✅ User can add subtask to any todo
- ✅ Subtask appears in list immediately
- ✅ Auto-assigned position if not specified
- ✅ Progress bar updates to reflect new subtask
- ✅ Created timestamp uses Singapore timezone

**AC2: Toggle Completion**
- ✅ Clicking checkbox toggles subtask completion
- ✅ Completed subtasks show strikethrough text
- ✅ Progress bar updates in real-time
- ✅ Change persists after page refresh
- ✅ API call succeeds within 200ms

**AC3: Edit Subtask Title**
- ✅ Clicking subtask text enters edit mode
- ✅ Enter key saves changes
- ✅ Escape key cancels editing
- ✅ Click outside saves changes
- ✅ Empty title is rejected

**AC4: Delete Subtask**
- ✅ Delete button appears on hover
- ✅ Clicking delete removes subtask
- ✅ Progress bar recalculates
- ✅ Deletion is permanent (no undo)
- ✅ Remaining subtasks unaffected

**AC5: Progress Calculation**
- ✅ Formula: (completed / total) * 100
- ✅ Rounds to nearest integer
- ✅ Shows "X/Y completed (Z%)" format
- ✅ Progress bar width matches percentage
- ✅ 100% completion shows green color

**AC6: Cascade Delete**
- ✅ Deleting todo removes all subtasks
- ✅ Database foreign key handles cascade
- ✅ No orphaned subtasks remain
- ✅ Confirmation shows subtask count
- ✅ Operation completes within 500ms

### Display & Ordering

**AC7: Position-Based Ordering**
- ✅ Subtasks display in position order (0, 1, 2...)
- ✅ Position values auto-assigned on creation
- ✅ Order persists across sessions
- ✅ New subtasks append to end

**AC8: Visual Feedback**
- ✅ Checkbox has hover and focus states
- ✅ Strikethrough animation on completion
- ✅ Progress bar animates width changes
- ✅ Delete button fades in on hover
- ✅ Loading states during API calls

**AC9: Responsive Design**
- ✅ Works on mobile (touch-friendly checkboxes)
- ✅ Progress bar scales to container width
- ✅ Subtask text wraps on narrow screens
- ✅ Delete button accessible on mobile

### Data Integrity

**AC10: Validation**
- ✅ Empty title rejected (client & server)
- ✅ Max length 500 characters enforced
- ✅ Invalid todo_id returns 404 error
- ✅ Unauthorized access returns 403 error

**AC11: Authorization**
- ✅ User can only modify own subtasks
- ✅ Session token required for all operations
- ✅ Subtask's parent todo must belong to user

---

## Testing Requirements

### E2E Tests (Playwright)

**Test File**: `tests/04-subtasks.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { TestHelper } from './helpers';

test.describe('Subtasks & Progress Tracking', () => {
  let helper: TestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelper(page);
    await helper.setupAuthenticatedUser();
    await helper.createTodo({ title: 'Test Todo', priority: 'medium' });
  });

  test('should add subtask to todo', async ({ page }) => {
    // Click "Add Subtask" button
    await page.click('button:has-text("Add Subtask")');
    
    // Enter subtask title
    await page.fill('input[placeholder*="subtask"]', 'First subtask');
    await page.press('input[placeholder*="subtask"]', 'Enter');
    
    // Verify subtask appears
    await expect(page.locator('text=First subtask')).toBeVisible();
    
    // Verify progress shows 0/1
    await expect(page.locator('text=0/1 completed (0%)')).toBeVisible();
  });

  test('should toggle subtask completion', async ({ page }) => {
    // Add subtask
    await helper.addSubtask('Complete this task');
    
    // Click checkbox
    await page.click('input[type="checkbox"]');
    
    // Verify strikethrough applied
    const subtaskText = page.locator('text=Complete this task');
    await expect(subtaskText).toHaveClass(/line-through/);
    
    // Verify progress updates to 1/1 (100%)
    await expect(page.locator('text=1/1 completed (100%)')).toBeVisible();
    
    // Verify progress bar is green
    const progressBar = page.locator('.bg-green-500');
    await expect(progressBar).toBeVisible();
  });

  test('should calculate progress correctly with multiple subtasks', async ({ page }) => {
    // Add 5 subtasks
    for (let i = 1; i <= 5; i++) {
      await helper.addSubtask(`Subtask ${i}`);
    }
    
    // Verify initial progress: 0/5 (0%)
    await expect(page.locator('text=0/5 completed (0%)')).toBeVisible();
    
    // Complete 2 subtasks
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();
    
    // Verify progress: 2/5 (40%)
    await expect(page.locator('text=2/5 completed (40%)')).toBeVisible();
    
    // Verify progress bar width
    const progressBar = page.locator('.bg-blue-500');
    const width = await progressBar.evaluate(el => el.style.width);
    expect(width).toBe('40%');
  });

  test('should edit subtask title', async ({ page }) => {
    // Add subtask
    await helper.addSubtask('Original title');
    
    // Click on subtask text to edit
    await page.click('text=Original title');
    
    // Edit title
    await page.fill('input[type="text"]', 'Updated title');
    await page.press('input[type="text"]', 'Enter');
    
    // Verify updated title
    await expect(page.locator('text=Updated title')).toBeVisible();
    await expect(page.locator('text=Original title')).not.toBeVisible();
  });

  test('should delete subtask', async ({ page }) => {
    // Add 2 subtasks
    await helper.addSubtask('Subtask 1');
    await helper.addSubtask('Subtask 2');
    
    // Hover over first subtask to reveal delete button
    await page.hover('text=Subtask 1');
    
    // Click delete button
    await page.click('button[title="Delete subtask"]');
    
    // Verify subtask removed
    await expect(page.locator('text=Subtask 1')).not.toBeVisible();
    await expect(page.locator('text=Subtask 2')).toBeVisible();
    
    // Verify progress updated: 0/1
    await expect(page.locator('text=0/1 completed (0%)')).toBeVisible();
  });

  test('should delete todo with subtasks (cascade)', async ({ page }) => {
    // Add 3 subtasks
    await helper.addSubtask('Sub 1');
    await helper.addSubtask('Sub 2');
    await helper.addSubtask('Sub 3');
    
    // Delete todo
    await page.click('button[title="Delete todo"]');
    
    // Confirm deletion (dialog shows subtask count)
    await expect(page.locator('text=/Delete.*3 subtasks/')).toBeVisible();
    await page.click('button:has-text("Confirm")');
    
    // Verify todo and subtasks removed
    await expect(page.locator('text=Test Todo')).not.toBeVisible();
    await expect(page.locator('text=Sub 1')).not.toBeVisible();
  });

  test('should persist subtasks after page refresh', async ({ page }) => {
    // Add and complete subtask
    await helper.addSubtask('Persistent subtask');
    await page.click('input[type="checkbox"]');
    
    // Refresh page
    await page.reload();
    
    // Verify subtask still exists and is completed
    await expect(page.locator('text=Persistent subtask')).toBeVisible();
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    
    // Verify progress still shows 1/1 (100%)
    await expect(page.locator('text=1/1 completed (100%)')).toBeVisible();
  });

  test('should handle empty subtask title validation', async ({ page }) => {
    // Try to add empty subtask
    await page.click('button:has-text("Add Subtask")');
    await page.press('input[placeholder*="subtask"]', 'Enter');
    
    // Verify subtask not created
    await expect(page.locator('.subtask-item')).toHaveCount(0);
  });

  test('should show empty state when no subtasks', async ({ page }) => {
    // Verify empty state displayed
    await expect(page.locator('text=No subtasks yet')).toBeVisible();
    await expect(page.locator('button:has-text("Add First Subtask")')).toBeVisible();
    
    // Click CTA to add first subtask
    await page.click('button:has-text("Add First Subtask")');
    await expect(page.locator('input[placeholder*="subtask"]')).toBeVisible();
  });
});
```

### Unit Tests (Optional)

**Test File**: `lib/__tests__/subtask-progress.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Subtask Progress Calculation', () => {
  function calculateProgress(completed: number, total: number) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  it('should return 0% for no completed subtasks', () => {
    expect(calculateProgress(0, 5)).toBe(0);
  });

  it('should return 100% for all completed subtasks', () => {
    expect(calculateProgress(5, 5)).toBe(100);
  });

  it('should round to nearest integer', () => {
    expect(calculateProgress(1, 3)).toBe(33); // 33.33...
    expect(calculateProgress(2, 3)).toBe(67); // 66.66...
  });

  it('should handle single subtask', () => {
    expect(calculateProgress(0, 1)).toBe(0);
    expect(calculateProgress(1, 1)).toBe(100);
  });

  it('should return 0% for zero subtasks', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('should calculate common percentages correctly', () => {
    expect(calculateProgress(1, 4)).toBe(25);
    expect(calculateProgress(1, 2)).toBe(50);
    expect(calculateProgress(3, 4)).toBe(75);
  });
});
```

### API Tests

**Test File**: `tests/api/subtasks.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from './helpers';

describe('Subtask API Endpoints', () => {
  let context: TestContext;
  let todoId: number;

  beforeEach(async () => {
    context = await createTestContext();
    todoId = await context.createTodo({ title: 'Test Todo' });
  });

  it('POST /api/todos/[id]/subtasks - should create subtask', async () => {
    const response = await context.fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title: 'New subtask' })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.subtask).toMatchObject({
      title: 'New subtask',
      completed: false,
      position: 0
    });
  });

  it('PUT /api/todos/[id]/subtasks/[subtaskId] - should toggle completion', async () => {
    const subtask = await context.createSubtask(todoId, 'Test');
    
    const response = await context.fetch(
      `/api/todos/${todoId}/subtasks/${subtask.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ completed: true })
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.subtask.completed).toBe(true);
  });

  it('should reject unauthorized access', async () => {
    const otherContext = await createTestContext();
    const otherTodoId = await otherContext.createTodo({ title: 'Other' });
    
    // Try to add subtask to other user's todo
    const response = await context.fetch(`/api/todos/${otherTodoId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Hack attempt' })
    });

    expect(response.status).toBe(403);
  });
});
```

### Test Helpers

**File**: `tests/helpers.ts` (extend existing)

```typescript
export class TestHelper {
  // ... existing methods

  async addSubtask(title: string, position?: number) {
    await this.page.click('button:has-text("Add Subtask")');
    await this.page.fill('input[placeholder*="subtask"]', title);
    await this.page.press('input[placeholder*="subtask"]', 'Enter');
    await this.page.waitForSelector(`text=${title}`);
  }

  async toggleSubtask(title: string) {
    const row = this.page.locator(`text=${title}`).locator('..');
    await row.locator('input[type="checkbox"]').click();
  }

  async getProgressText() {
    return await this.page.locator('text=/\\d+\\/\\d+ completed/').textContent();
  }

  async deleteSubtask(title: string) {
    await this.page.hover(`text=${title}`);
    await this.page.click('button[title="Delete subtask"]');
  }
}
```

---

## Out of Scope

### Explicitly Excluded Features

**1. Subtask Dependencies**
- No "blocking" relationships between subtasks
- No Gantt chart view
- No critical path analysis
- Rationale: Adds complexity beyond MVP scope

**2. Subtask Assignment**
- No assigning subtasks to different users
- No multi-user collaboration
- Rationale: Single-user app design

**3. Subtask Due Dates**
- Subtasks don't have individual due dates
- Only parent todo has due date
- Rationale: Simplicity; use separate todos if needed

**4. Subtask Priorities**
- No priority levels on subtasks
- Inherited priority from parent todo
- Rationale: Reduces UI complexity

**5. Nested Subtasks**
- No sub-subtasks (no tree hierarchy)
- Max depth: 1 level (todo → subtask)
- Rationale: Prevents over-engineering

**6. Subtask Tags**
- Subtasks don't have individual tags
- Tags apply to parent todo only
- Rationale: Tags categorize todos, not granular steps

**7. Subtask Notes/Description**
- Only title field, no description
- Use parent todo notes for context
- Rationale: Subtasks are actionable items, not documentation

**8. Drag-and-Drop Reordering**
- No drag-and-drop interface (Phase 1)
- Use up/down arrows or manual position editing
- Rationale: Complex touch interactions, deferred to Phase 2

**9. Subtask Templates**
- Templates don't support subtask-level customization
- Subtasks copied as-is from template
- Rationale: Template system already supports subtasks

**10. Subtask History/Changelog**
- No edit history or audit log
- No "who completed this" tracking
- Rationale: Single-user app, no audit requirements

---

## Success Metrics

### Adoption Metrics

**M1: Feature Usage Rate**
- **Target**: 60% of active users create at least one subtask within 7 days
- **Measurement**: Track subtask creation events
- **Success**: Indicates feature discovery and utility

**M2: Average Subtasks per Todo**
- **Target**: 2.5 subtasks per todo (for todos with subtasks)
- **Measurement**: Calculate mean from database
- **Success**: Shows appropriate task breakdown

**M3: Completion Rate**
- **Target**: 70% of todos with subtasks have >50% subtask completion
- **Measurement**: Compare completed vs total subtasks
- **Success**: Indicates users follow through on subtasks

### Engagement Metrics

**M4: Progress Bar Interaction**
- **Target**: Users view progress bar 5+ times per session
- **Measurement**: Analytics event on progress bar impression
- **Success**: Visual progress is motivating

**M5: Edit Frequency**
- **Target**: 20% of subtasks are edited after creation
- **Measurement**: Track PUT requests with title changes
- **Success**: Users refine subtasks as tasks evolve

**M6: Subtask Completion Time**
- **Target**: Average 2 days between subtask creation and completion
- **Measurement**: Calculate time delta in database
- **Success**: Reasonable task breakdown granularity

### Quality Metrics

**M7: API Response Time**
- **Target**: P95 < 100ms for subtask CRUD operations
- **Measurement**: Server-side monitoring
- **Success**: Fast, responsive UI

**M8: Error Rate**
- **Target**: <0.5% error rate on subtask operations
- **Measurement**: Track 4xx/5xx responses
- **Success**: Reliable functionality

**M9: Cascade Delete Accuracy**
- **Target**: 0 orphaned subtasks after 1 month
- **Measurement**: Database audit query
- **Success**: Data integrity maintained

### User Satisfaction

**M10: Feature Rating**
- **Target**: 4.5/5 stars in user feedback
- **Measurement**: In-app feedback prompt after 10 subtask operations
- **Success**: High satisfaction with feature

**M11: Support Tickets**
- **Target**: <2 tickets per 100 active users
- **Measurement**: Support system categorization
- **Success**: Low confusion, intuitive UX

**M12: Retention Impact**
- **Target**: 15% higher 30-day retention for users who create subtasks
- **Measurement**: Cohort analysis
- **Success**: Feature drives engagement

---

## Appendix

### A. Database Migration Script

```sql
-- Already exists in main schema, included for reference

CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0 AND length(title) <= 500),
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0 CHECK(position >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_position ON subtasks(todo_id, position);
```

### B. Position Reindexing Function

```typescript
// Utility to fix position conflicts or gaps
export function reindexSubtaskPositions(todoId: number): void {
  const subtasks = db.prepare(`
    SELECT id FROM subtasks 
    WHERE todo_id = ? 
    ORDER BY position ASC, id ASC
  `).all(todoId);

  db.transaction(() => {
    subtasks.forEach((subtask, index) => {
      db.prepare(`
        UPDATE subtasks SET position = ? WHERE id = ?
      `).run(index, subtask.id);
    });
  })();
}
```

### C. Bulk Operations Example

```typescript
// Create multiple subtasks at once (for template usage)
export function createSubtasksBulk(
  todoId: number, 
  titles: string[]
): Subtask[] {
  const now = getSingaporeNow().toISOString();
  
  return db.transaction(() => {
    return titles.map((title, index) => {
      const result = db.prepare(`
        INSERT INTO subtasks (todo_id, title, completed, position, created_at)
        VALUES (?, ?, 0, ?, ?)
      `).run(todoId, title.trim(), index, now);

      return subtaskDB.getById(result.lastInsertRowid as number)!;
    });
  })();
}
```

### D. Analytics Events

```typescript
// Track subtask-related events
interface SubtaskEvent {
  event: 'subtask_created' | 'subtask_completed' | 'subtask_deleted' | 'progress_viewed';
  todo_id: number;
  subtask_id?: number;
  progress?: number; // percentage
  timestamp: string;
}

// Example usage
function trackSubtaskEvent(event: SubtaskEvent) {
  // Send to analytics service
  analytics.track(event.event, {
    ...event,
    user_id: session.userId
  });
}
```

### E. Accessibility Notes

**Keyboard Navigation**:
- Tab: Navigate between subtasks
- Space: Toggle checkbox
- Enter: Edit subtask title (when focused)
- Escape: Cancel editing
- Delete: Remove subtask (with confirmation)

**Screen Reader Support**:
```tsx
<input
  type="checkbox"
  aria-label={`Mark subtask "${subtask.title}" as ${subtask.completed ? 'incomplete' : 'complete'}`}
  aria-checked={subtask.completed}
/>

<div role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
  {percentage}% complete
</div>
```

**Color Contrast**:
- Progress bar colors meet WCAG AA standards
- Strikethrough text maintains readable contrast
- Focus indicators visible on all interactive elements

---

**Document Version**: 1.0  
**Feature ID**: F06-SUBTASKS-PROGRESS  
**Last Updated**: November 12, 2025  
**Status**: Ready for Implementation  
**Dependencies**: Core todo CRUD (F02), Database schema (todos table)  
**Related PRPs**: 02-todo-crud.md, 08-templates.md, 09-export-import.md

---

## Implementation Checklist

- [ ] Database table `subtasks` created with CASCADE DELETE
- [ ] API endpoints implemented (GET, POST, PUT, DELETE)
- [ ] `subtaskDB` operations in `lib/db.ts`
- [ ] SubtaskList component with progress bar
- [ ] SubtaskItem component with toggle and delete
- [ ] Position calculation logic
- [ ] Progress calculation function
- [ ] Empty state component
- [ ] Cascade delete confirmation dialog
- [ ] E2E tests written (04-subtasks.spec.ts)
- [ ] Edge cases handled (empty list, 100% completion)
- [ ] Accessibility attributes added
- [ ] Mobile responsive design tested
- [ ] Singapore timezone used for `created_at`
- [ ] Documentation updated in USER_GUIDE.md
