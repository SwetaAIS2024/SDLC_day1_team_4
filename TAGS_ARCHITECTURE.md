# Tag System - Architecture Diagram

```
═══════════════════════════════════════════════════════════════════════════
                          TAG SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js Client)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ TodosPage Component (app/todos/page.tsx)                         │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  State Management:                                                │   │
│  │  • tags: TagResponse[]                                            │   │
│  │  • showTagModal: boolean                                          │   │
│  │  • selectedTagIds: number[]                                       │   │
│  │  • editSelectedTagIds: number[]                                   │   │
│  │  • filterTagId: number | null                                     │   │
│  │  • newTagName, newTagColor                                        │   │
│  │  • editingTagId, editTagName, editTagColor                        │   │
│  │                                                                   │   │
│  │  Functions:                                                       │   │
│  │  • fetchTags()          → GET /api/tags                           │   │
│  │  • createTag()          → POST /api/tags                          │   │
│  │  • startTagEdit()       → Enable edit mode                        │   │
│  │  • saveTagEdit()        → PUT /api/tags/[id]                      │   │
│  │  • deleteTag()          → DELETE /api/tags/[id]                   │   │
│  │  • toggleTagSelection() → Update selectedTagIds                   │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ UI Components                                                     │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  1. Tag Management Modal                                          │   │
│  │     ├─ Header: "Manage Tags" + Close button                       │   │
│  │     ├─ Create Form: Name input + Color picker                     │   │
│  │     ├─ Tags List: All tags with Edit/Delete                       │   │
│  │     └─ Footer: Close button                                       │   │
│  │                                                                   │   │
│  │  2. Tag Selection (Create/Edit Forms)                             │   │
│  │     ├─ Label: "Tags:"                                             │   │
│  │     ├─ Pill Buttons: Toggle on/off                                │   │
│  │     ├─ Selected: Filled color + checkmark                         │   │
│  │     └─ Unselected: Outlined border                                │   │
│  │                                                                   │   │
│  │  3. Tag Pills (Todo Display)                                      │   │
│  │     ├─ Colored pills with white text                              │   │
│  │     ├─ Positioned after priority badges                           │   │
│  │     └─ Full rounded corners                                       │   │
│  │                                                                   │   │
│  │  4. Tag Filter Dropdown                                           │   │
│  │     ├─ "All Tags" default option                                  │   │
│  │     ├─ Individual tag names                                       │   │
│  │     └─ Next to priority filter                                    │   │
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
│  │ GET /api/tags                                                     │   │
│  │ ✓ Fetches all tags for authenticated user                        │   │
│  │ ✓ Returns: { tags: TagResponse[] }                               │   │
│  │ ✓ Sorted by creation date (ASC)                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST /api/tags                                                    │   │
│  │ ✓ Creates new tag                                                │   │
│  │ ✓ Validates: name (1-50 chars), color (hex format)               │   │
│  │ ✓ Checks: duplicate name (case-insensitive)                      │   │
│  │ ✓ Returns: 201 + created tag                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ PUT /api/tags/[id]                                                │   │
│  │ ✓ Updates tag name and/or color                                  │   │
│  │ ✓ Validates: ownership, name uniqueness, hex format              │   │
│  │ ✓ Returns: 200 + updated tag                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ DELETE /api/tags/[id]                                             │   │
│  │ ✓ Verifies ownership                                              │   │
│  │ ✓ Counts affected todos                                           │   │
│  │ ✓ Deletes tag (CASCADE removes associations)                     │   │
│  │ ✓ Returns: 200 + success message with count                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST /api/todos (MODIFIED)                                        │   │
│  │ ✓ Now accepts tag_ids: number[]                                   │   │
│  │ ✓ Creates todo then applies tags                                 │   │
│  │ ✓ Returns todo with tags included                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ PUT /api/todos/[id] (MODIFIED)                                    │   │
│  │ ✓ Now accepts tag_ids: number[]                                   │   │
│  │ ✓ Updates todo and replaces tags atomically                      │   │
│  │ ✓ Copies tags when creating recurring instances                  │   │
│  │ ✓ Returns todo with updated tags                                 │   │
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
│  │ tagDB Object                                                      │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • create(userId, name, color?)                                    │   │
│  │   └─ INSERT INTO tags                                             │   │
│  │   └─ Default color: #3B82F6                                       │   │
│  │                                                                   │   │
│  │ • getAll(userId)                                                  │   │
│  │   └─ SELECT * FROM tags WHERE user_id = ?                         │   │
│  │   └─ ORDER BY created_at ASC                                      │   │
│  │                                                                   │   │
│  │ • getById(userId, tagId)                                          │   │
│  │   └─ SELECT * FROM tags WHERE id = ? AND user_id = ?             │   │
│  │                                                                   │   │
│  │ • update(userId, tagId, {name?, color?})                          │   │
│  │   └─ UPDATE tags SET ... WHERE id = ? AND user_id = ?            │   │
│  │                                                                   │   │
│  │ • delete(userId, tagId)                                           │   │
│  │   └─ DELETE FROM tags WHERE id = ? AND user_id = ?               │   │
│  │   └─ CASCADE removes from todo_tags                              │   │
│  │                                                                   │   │
│  │ • existsByName(userId, name, excludeId?)                          │   │
│  │   └─ SELECT COUNT(*) WHERE LOWER(name) = LOWER(?)                │   │
│  │   └─ Case-insensitive duplicate check                            │   │
│  │                                                                   │   │
│  │ • getByTodoId(todoId)                                             │   │
│  │   └─ JOIN todo_tags to get all tags for a todo                   │   │
│  │                                                                   │   │
│  │ • getTodoCount(tagId)                                             │   │
│  │   └─ COUNT todos using this tag                                   │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ todoTagDB Object (Junction Operations)                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • add(todoId, tagId)                                              │   │
│  │   └─ INSERT INTO todo_tags (todo_id, tag_id)                     │   │
│  │                                                                   │   │
│  │ • remove(todoId, tagId)                                           │   │
│  │   └─ DELETE FROM todo_tags WHERE ...                             │   │
│  │                                                                   │   │
│  │ • removeAll(todoId)                                               │   │
│  │   └─ DELETE FROM todo_tags WHERE todo_id = ?                     │   │
│  │                                                                   │   │
│  │ • setTags(todoId, tagIds[])        [ATOMIC]                      │   │
│  │   └─ BEGIN TRANSACTION                                            │   │
│  │   └─ DELETE all existing tags                                     │   │
│  │   └─ INSERT new tags                                              │   │
│  │   └─ COMMIT (or ROLLBACK on error)                               │   │
│  │                                                                   │   │
│  │ • getTagIds(todoId)                                               │   │
│  │   └─ SELECT tag_id FROM todo_tags WHERE todo_id = ?              │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ todoDB Object (MODIFIED)                                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • getAllWithSubtasks(userId)                                      │   │
│  │   └─ Gets todos                                                   │   │
│  │   └─ For each: fetches subtasks + TAGS                           │   │
│  │   └─ Returns TodoWithSubtasks[] (with tags)                      │   │
│  │                                                                   │   │
│  │ • getByIdWithSubtasks(userId, todoId)                             │   │
│  │   └─ Gets single todo                                             │   │
│  │   └─ Fetches subtasks + TAGS                                      │   │
│  │   └─ Returns TodoWithSubtasks (with tags)                         │   │
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
│  │ users TABLE                                                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (PK)                                                         │   │
│  │ • username                                                        │   │
│  │ • created_at                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                                 │
│         │ One-to-Many                                                     │
│         ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ tags TABLE (NEW)                                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • id (PK)                                                         │   │
│  │ • user_id (FK → users) [ON DELETE CASCADE]                        │   │
│  │ • name (TEXT, 1-50 chars)                                         │   │
│  │ • color (TEXT, hex format: #RRGGBB)                               │   │
│  │ • created_at                                                      │   │
│  │ • updated_at                                                      │   │
│  │                                                                   │   │
│  │ CONSTRAINTS:                                                      │   │
│  │ • UNIQUE(user_id, name COLLATE NOCASE)                            │   │
│  │ • CHECK(length(name) <= 50 AND length(name) > 0)                 │   │
│  │ • CHECK(color GLOB '#[0-9A-Fa-f]{6}')                             │   │
│  │                                                                   │   │
│  │ INDEXES:                                                          │   │
│  │ • idx_tags_user_id ON (user_id)                                   │   │
│  │ • idx_tags_name ON (user_id, name COLLATE NOCASE)                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                                 │
│         │                                                                 │
│         │                        ┌──────────────────┐                    │
│         │                        │ todos TABLE      │                    │
│         │                        ├──────────────────┤                    │
│         │                        │ • id (PK)        │                    │
│         │                        │ • user_id (FK)   │                    │
│         │                        │ • title          │                    │
│         │                        │ • completed      │                    │
│         │                        │ • priority       │                    │
│         │                        │ • due_date       │                    │
│         │                        │ ...              │                    │
│         │                        └──────────────────┘                    │
│         │                                 │                              │
│         │                                 │                              │
│         │                     Many-to-Many (Junction)                    │
│         │                                 │                              │
│         └─────────────────┬───────────────┘                              │
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ todo_tags TABLE (NEW - Junction)                                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • todo_id (PK, FK → todos) [ON DELETE CASCADE]                   │   │
│  │ • tag_id (PK, FK → tags) [ON DELETE CASCADE]                     │   │
│  │ • created_at                                                      │   │
│  │                                                                   │   │
│  │ PRIMARY KEY: (todo_id, tag_id)                                    │   │
│  │                                                                   │   │
│  │ INDEXES:                                                          │   │
│  │ • idx_todo_tags_todo_id ON (todo_id)                              │   │
│  │ • idx_todo_tags_tag_id ON (tag_id)                                │   │
│  │                                                                   │   │
│  │ CASCADE BEHAVIOR:                                                 │   │
│  │ • Delete todo → Remove all tag associations                       │   │
│  │ • Delete tag → Remove from all todos                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                              DATA FLOW EXAMPLES
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│ 1. CREATE TAG FLOW                                                       │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "+ Manage Tags"
    ↓
Modal opens (showTagModal = true)
    ↓
User enters: name="Work", color="#10B981"
    ↓
User clicks "Create Tag"
    ↓
POST /api/tags { name: "Work", color: "#10B981" }
    ↓
Validate: name length, hex format, duplicate check
    ↓
tagDB.create(userId, "Work", "#10B981")
    ↓
INSERT INTO tags (user_id, name, color, created_at, updated_at)
VALUES (1, "Work", "#10B981", "2025-11-13T...", "2025-11-13T...")
    ↓
Return: { id: 5, name: "Work", color: "#10B981", ... }
    ↓
Update React state: setTags([...tags, newTag])
    ↓
UI updates: Tag appears in modal list

┌─────────────────────────────────────────────────────────────────────────┐
│ 2. APPLY TAGS TO TODO FLOW                                               │
└─────────────────────────────────────────────────────────────────────────┘

User fills todo form
    ↓
User clicks tag pills: "Work" + "Urgent"
    ↓
selectedTagIds = [1, 2]
    ↓
User clicks "Add"
    ↓
POST /api/todos {
  title: "Complete report",
  priority: "high",
  due_date: "2025-11-15T14:00",
  tag_ids: [1, 2]
}
    ↓
todoDB.create(userId, {...}) → creates todo with id=10
    ↓
todoTagDB.setTags(10, [1, 2])
    ↓
BEGIN TRANSACTION
  DELETE FROM todo_tags WHERE todo_id = 10
  INSERT INTO todo_tags (todo_id, tag_id) VALUES (10, 1)
  INSERT INTO todo_tags (todo_id, tag_id) VALUES (10, 2)
COMMIT
    ↓
todoDB.getByIdWithSubtasks(userId, 10)
    ↓
SELECT * FROM todos WHERE id = 10
JOIN with subtasks
JOIN with tags via todo_tags
    ↓
Return: {
  id: 10,
  title: "Complete report",
  tags: [
    { id: 1, name: "Work", color: "#10B981" },
    { id: 2, name: "Urgent", color: "#EF4444" }
  ],
  ...
}
    ↓
UI updates: Todo appears with colored tag pills

┌─────────────────────────────────────────────────────────────────────────┐
│ 3. EDIT TAG (Updates All Todos)                                          │
└─────────────────────────────────────────────────────────────────────────┘

User opens tag modal
    ↓
User clicks "Edit" on "Work" tag
    ↓
Edit form appears with current values
    ↓
User changes color to "#22C55E"
    ↓
User clicks "Update"
    ↓
PUT /api/tags/1 { color: "#22C55E" }
    ↓
tagDB.update(userId, 1, { color: "#22C55E" })
    ↓
UPDATE tags SET color = "#22C55E", updated_at = "..." WHERE id = 1
    ↓
Return: { id: 1, name: "Work", color: "#22C55E", ... }
    ↓
Update React state:
  setTags(prev => prev.map(t => t.id === 1 ? updatedTag : t))
  setTodos(prev => prev.map(todo => ({
    ...todo,
    tags: todo.tags?.map(t => t.id === 1 ? updatedTag : t)
  })))
    ↓
UI updates: All todos with "Work" tag now show new color

┌─────────────────────────────────────────────────────────────────────────┐
│ 4. DELETE TAG (CASCADE Removal)                                          │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Delete" on "TempTag"
    ↓
Confirmation dialog: "Delete tag 'TempTag'?"
    ↓
User confirms
    ↓
DELETE /api/tags/5
    ↓
tagDB.getTodoCount(5) → returns 3 (3 todos using this tag)
    ↓
tagDB.delete(userId, 5)
    ↓
DELETE FROM tags WHERE id = 5 AND user_id = 1
    ↓
CASCADE DELETE triggers automatically:
  DELETE FROM todo_tags WHERE tag_id = 5
    ↓
Return: { success: true, todoCount: 3, message: "..." }
    ↓
Update React state:
  setTags(prev => prev.filter(t => t.id !== 5))
  setTodos(prev => prev.map(todo => ({
    ...todo,
    tags: todo.tags?.filter(t => t.id !== 5)
  })))
    ↓
UI updates: Tag removed from modal and all todos

┌─────────────────────────────────────────────────────────────────────────┐
│ 5. FILTER BY TAG FLOW                                                    │
└─────────────────────────────────────────────────────────────────────────┘

User selects "Work" from tag filter dropdown
    ↓
setFilterTagId(1)
    ↓
Filter logic runs:
  sortedAndFilteredTodos = todos.filter(todo => {
    // Tag filter
    if (filterTagId !== null) {
      if (!todo.tags || !todo.tags.some(t => t.id === filterTagId)) {
        return false;
      }
    }
    return true;
  })
    ↓
Only todos with tag ID=1 ("Work") remain
    ↓
UI updates: Filtered list displays, counts update

═══════════════════════════════════════════════════════════════════════════
                           TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════

interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface TagResponse {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface TodoWithSubtasks extends Todo {
  subtasks: Subtask[];
  progress: number;
  tags?: TagResponse[];  // NEW
}

═══════════════════════════════════════════════════════════════════════════
```
