# Subtasks & Progress Tracking - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js Client)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ TodosPage Component (app/todos/page.tsx)                         │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  State Management:                                                │   │
│  │  • todos: TodoWithSubtasks[]                                      │   │
│  │  • expandedTodos: Set<number>                                     │   │
│  │  • newSubtaskTitles: Record<number, string>                       │   │
│  │                                                                   │   │
│  │  Functions:                                                       │   │
│  │  • toggleSubtasks(todoId)      → Expand/Collapse UI              │   │
│  │  • addSubtask(todoId)          → POST /api/todos/[id]/subtasks   │   │
│  │  • toggleSubtask(id, checked)  → PUT /api/.../[subtaskId]        │   │
│  │  • deleteSubtask(id)           → DELETE /api/.../[subtaskId]     │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ UI Components                                                     │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  • Progress Bar (0-100%)                                          │   │
│  │    ├─ "X/Y subtasks" text                                         │   │
│  │    ├─ "Z%" percentage                                             │   │
│  │    └─ Visual bar with blue fill                                   │   │
│  │                                                                   │   │
│  │  • Subtasks Button                                                │   │
│  │    └─ "▶ Subtasks" / "▼ Subtasks"                                │   │
│  │                                                                   │   │
│  │  • Subtask List (when expanded)                                   │   │
│  │    ├─ Checkbox for each subtask                                   │   │
│  │    ├─ Strike-through for completed                                │   │
│  │    └─ Delete button (on hover)                                    │   │
│  │                                                                   │   │
│  │  • Add Subtask Form                                               │   │
│  │    ├─ Text input (200 char limit)                                 │   │
│  │    ├─ "Add" button (disabled when empty)                          │   │
│  │    └─ Enter key support                                           │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    │ HTTP/JSON
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API ROUTES (Next.js Server)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET /api/todos                                                    │   │
│  │ ✓ Returns TodoWithSubtasks[] with subtasks and progress          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST /api/todos/[id]/subtasks                                     │   │
│  │ ✓ Validates: title required, max 200 chars                        │   │
│  │ ✓ Verifies: todo ownership                                        │   │
│  │ ✓ Creates: new subtask with auto-position                         │   │
│  │ ✓ Returns: 201 + created subtask                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ PUT /api/todos/[id]/subtasks/[subtaskId]                          │   │
│  │ ✓ Validates: data types, ownership                                │   │
│  │ ✓ Updates: title, completed, position                             │   │
│  │ ✓ Returns: 200 + updated subtask                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ DELETE /api/todos/[id]/subtasks/[subtaskId]                       │   │
│  │ ✓ Verifies: ownership                                             │   │
│  │ ✓ Deletes: subtask                                                │   │
│  │ ✓ Returns: 200 + success                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    │ SQL Queries
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER (lib/db.ts)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ subtaskDB Object                                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • create(todoId, title, position?)                                │   │
│  │   └─ INSERT INTO subtasks                                         │   │
│  │   └─ Auto-assigns position (MAX + 1)                              │   │
│  │                                                                   │   │
│  │ • getByTodoId(todoId)                                             │   │
│  │   └─ SELECT * FROM subtasks WHERE todo_id = ?                     │   │
│  │   └─ ORDER BY position ASC                                        │   │
│  │                                                                   │   │
│  │ • getById(subtaskId)                                              │   │
│  │   └─ SELECT * FROM subtasks WHERE id = ?                          │   │
│  │                                                                   │   │
│  │ • update(subtaskId, {title, completed, position})                 │   │
│  │   └─ UPDATE subtasks SET ... WHERE id = ?                         │   │
│  │                                                                   │   │
│  │ • delete(subtaskId)                                               │   │
│  │   └─ DELETE FROM subtasks WHERE id = ?                            │   │
│  │                                                                   │   │
│  │ • deleteByTodoId(todoId)                                          │   │
│  │   └─ DELETE FROM subtasks WHERE todo_id = ?                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ todoDB Object (Enhanced)                                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • getAllWithSubtasks(userId)                                      │   │
│  │   └─ Gets all todos                                               │   │
│  │   └─ For each: fetches subtasks + calculates progress            │   │
│  │   └─ Returns TodoWithSubtasks[]                                   │   │
│  │                                                                   │   │
│  │ • getByIdWithSubtasks(userId, todoId)                             │   │
│  │   └─ Gets single todo                                             │   │
│  │   └─ Fetches subtasks + calculates progress                       │   │
│  │   └─ Returns TodoWithSubtasks                                     │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Helper Functions                                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • calculateProgress(subtasks[])                                   │   │
│  │   └─ completedCount / totalCount * 100                            │   │
│  │   └─ Math.round() for whole numbers                               │   │
│  │   └─ Returns 0 if no subtasks                                     │   │
│  │                                                                   │   │
│  │ • rowToSubtask(row)                                               │   │
│  │   └─ Converts DB row to Subtask object                            │   │
│  │   └─ completed: 1 → true, 0 → false                               │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    │ SQLite
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE (SQLite - todos.db)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ todos TABLE                                                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (PK)                                                         │   │
│  │ • user_id (FK → users)                                            │   │
│  │ • title                                                           │   │
│  │ • completed                                                       │   │
│  │ • priority                                                        │   │
│  │ • due_date                                                        │   │
│  │ • recurrence_pattern                                              │   │
│  │ • reminder_minutes                                                │   │
│  │ • created_at                                                      │   │
│  │ • updated_at                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    │ One-to-Many                         │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ subtasks TABLE (NEW)                                              │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (PK)                                                         │   │
│  │ • todo_id (FK → todos) [ON DELETE CASCADE]                        │   │
│  │ • title (max 200 chars)                                           │   │
│  │ • completed (0 or 1)                                              │   │
│  │ • position (integer)                                              │   │
│  │ • created_at                                                      │   │
│  │ • updated_at                                                      │   │
│  │                                                                   │   │
│  │ INDEXES:                                                          │   │
│  │ • idx_subtasks_todo_id ON (todo_id)                               │   │
│  │ • idx_subtasks_position ON (todo_id, position)                    │   │
│  │                                                                   │   │
│  │ CONSTRAINTS:                                                      │   │
│  │ • FOREIGN KEY (todo_id) → todos(id) ON DELETE CASCADE             │   │
│  │ • CHECK (length(title) <= 200)                                    │   │
│  │ • CHECK (completed IN (0, 1))                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                              DATA FLOW EXAMPLES
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│ 1. CREATE SUBTASK FLOW                                                   │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Add" button
    ↓
addSubtask(todoId) called
    ↓
POST /api/todos/1/subtasks { title: "Buy milk" }
    ↓
Validate: title, ownership
    ↓
subtaskDB.create(1, "Buy milk")
    ↓
INSERT INTO subtasks (todo_id, title, position)
VALUES (1, "Buy milk", 0)
    ↓
Return: { id: 5, todo_id: 1, title: "Buy milk", completed: false, position: 0 }
    ↓
Update React state:
    todos[1].subtasks = [...subtasks, newSubtask]
    todos[1].progress = calculateProgress()
    ↓
UI updates: subtask appears, progress bar shows 0%

┌─────────────────────────────────────────────────────────────────────────┐
│ 2. TOGGLE SUBTASK COMPLETION FLOW                                        │
└─────────────────────────────────────────────────────────────────────────┘

User clicks checkbox
    ↓
toggleSubtask(todoId, subtaskId, true)
    ↓
PUT /api/todos/1/subtasks/5 { completed: true }
    ↓
Validate: ownership
    ↓
subtaskDB.update(5, { completed: true })
    ↓
UPDATE subtasks SET completed = 1 WHERE id = 5
    ↓
Return: { id: 5, completed: true, ... }
    ↓
Update React state:
    todos[1].subtasks[0].completed = true
    todos[1].progress = 50%  (1 of 2 completed)
    ↓
UI updates: strike-through text, progress bar fills to 50%

┌─────────────────────────────────────────────────────────────────────────┐
│ 3. DELETE TODO WITH SUBTASKS FLOW (CASCADE)                              │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Delete" on todo
    ↓
deleteTodo(todoId) called
    ↓
DELETE /api/todos/1
    ↓
todoDB.delete(userId, 1)
    ↓
DELETE FROM todos WHERE id = 1
    ↓
CASCADE DELETE triggers automatically:
    DELETE FROM subtasks WHERE todo_id = 1
    ↓
Return: success
    ↓
Update React state: remove todo from array
    ↓
UI updates: todo and all subtasks disappear

═══════════════════════════════════════════════════════════════════════════
                           PROGRESS CALCULATION
═══════════════════════════════════════════════════════════════════════════

Input: subtasks = [
  { id: 1, completed: true },
  { id: 2, completed: false },
  { id: 3, completed: true },
  { id: 4, completed: false },
  { id: 5, completed: true }
]

Calculation:
    completedCount = subtasks.filter(s => s.completed).length
                   = 3
    
    totalCount = subtasks.length
               = 5
    
    progress = Math.round((completedCount / totalCount) * 100)
             = Math.round((3 / 5) * 100)
             = Math.round(60)
             = 60

Output: 60%

Visual Display:
    "3/5 subtasks · 60%"
    [████████████████░░░░░░░░]  ← 60% blue, 40% gray

═══════════════════════════════════════════════════════════════════════════
                              STATE MANAGEMENT
═══════════════════════════════════════════════════════════════════════════

React State:
┌────────────────────────────────────────────────────────────────────────┐
│ todos: TodoWithSubtasks[] = [                                          │
│   {                                                                     │
│     id: 1,                                                              │
│     title: "Weekly Groceries",                                          │
│     completed: false,                                                   │
│     subtasks: [                                                         │
│       { id: 1, title: "Milk", completed: true, position: 0 },          │
│       { id: 2, title: "Eggs", completed: false, position: 1 },         │
│       { id: 3, title: "Bread", completed: true, position: 2 }          │
│     ],                                                                  │
│     progress: 67  // 2 of 3 completed                                  │
│   }                                                                     │
│ ]                                                                       │
│                                                                         │
│ expandedTodos: Set<number> = Set([1, 5, 8])                            │
│ // Todos with IDs 1, 5, 8 have subtasks visible                        │
│                                                                         │
│ newSubtaskTitles: Record<number, string> = {                           │
│   1: "Vegetables",  // User is typing subtask for todo 1               │
│   3: ""             // Empty input for todo 3                          │
│ }                                                                       │
└────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
```
