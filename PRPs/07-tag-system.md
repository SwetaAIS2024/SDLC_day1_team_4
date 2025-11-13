# PRP-07: Tag System

**Feature**: Color-Coded Tag System for Todo Organization  
**Priority**: P1 (High Priority)  
**Status**: Specification  
**Last Updated**: November 13, 2025

---

## 📋 Feature Overview

The Tag System feature provides users with a flexible, visual way to organize and categorize their todos using color-coded labels. Users can create custom tags (e.g., "work", "personal", "urgent", "client-a"), assign multiple tags to each todo, and filter their todo list by one or more tags. Tags use a many-to-many relationship, allowing rich organizational flexibility without limiting todos to a single category.

This feature is essential for power users managing multiple projects, contexts, or areas of responsibility, enabling them to quickly focus on relevant subsets of their tasks.

### Key Capabilities
- **Create Custom Tags**: Define tags with unique names and custom colors
- **Many-to-Many Relationships**: Assign multiple tags to a single todo
- **Color-Coded Visual Design**: Instantly recognize tag categories by color
- **Tag Management**: Edit tag names/colors, delete unused tags
- **Filter by Tags**: View todos associated with specific tags
- **Tag Usage Statistics**: See how many todos use each tag
- **Default Color Palette**: 12 pre-defined colors for quick tag creation
- **Case-Insensitive Uniqueness**: Prevent duplicate tags like "Work" and "work"

---

## 👥 User Stories

### Primary User Persona: Freelance Developer Managing Multiple Clients

**As a** freelance developer with multiple clients  
**I want to** tag my todos by client name (e.g., "Client A", "Client B")  
**So that** I can quickly see all tasks related to a specific client

**As a** busy professional balancing work and personal life  
**I want to** tag todos as "work" or "personal"  
**So that** I can maintain clear boundaries and focus on the right context

**As a** visual thinker  
**I want to** assign different colors to different project types  
**So that** I can instantly recognize the category of a task at a glance

**As a** project manager tracking multiple workstreams  
**I want to** assign multiple tags to a single todo (e.g., "marketing", "urgent", "Q4")  
**So that** I can organize tasks by multiple dimensions simultaneously

**As a** user who likes to keep things tidy  
**I want to** edit or delete tags I no longer use  
**So that** my tag list stays relevant and manageable

**As a** student organizing coursework  
**I want to** tag todos by subject (e.g., "math", "history", "programming")  
**So that** I can filter assignments by class when studying

---

## 🔄 User Flow

### Flow 1: Creating a New Tag

1. User clicks "Manage Tags" button in main navigation
2. Tag management modal opens, showing existing tags (if any)
3. User clicks "Create New Tag" button
4. Form appears with two fields:
   - **Tag Name** input (required, max 20 characters)
   - **Color Picker** with 12 default options + custom color input
5. User types "work" as tag name
6. User selects blue color (#3B82F6) from palette
7. User clicks "Create Tag" button
8. **Optimistic Update**: New tag appears in tag list immediately
9. API request sent to `/api/tags`
10. On success: Tag confirmed with database ID
11. On failure: Tag removed, error message displayed
12. Modal remains open for creating additional tags

### Flow 2: Assigning Tags to a Todo

1. User creates or edits a todo
2. Below title and due date fields, user sees "Tags" section
3. User clicks "Add Tag" dropdown
4. Dropdown shows all available tags with their colors
5. User selects "work" tag from dropdown
6. **Optimistic Update**: "work" badge appears on todo immediately
7. API request sent to `/api/todos/[id]/tags`
8. On success: Tag assignment confirmed
9. On failure: Badge removed, error message shown
10. User can repeat to add more tags (e.g., "urgent", "Q4")
11. Each tag appears as a colored badge below the todo title

### Flow 3: Filtering Todos by Tag

1. User is viewing main todo list with all tasks
2. User sees tag filter dropdown in toolbar (shows count of todos per tag)
3. User clicks dropdown and selects "work" tag
4. **Instant client-side filtering**: Todo list updates to show only todos tagged "work"
5. Filter indicator appears: "Filtered by: work" with X to clear
6. User clicks "urgent" tag in filter dropdown (multi-select)
7. List updates to show todos tagged "work" OR "urgent"
8. User clicks X on filter indicator to clear filters
9. Full todo list displays again

### Flow 4: Editing a Tag

1. User opens "Manage Tags" modal
2. User clicks "Edit" icon next to "work" tag
3. Tag switches to edit mode:
   - Name becomes editable input (pre-filled with "work")
   - Color picker appears with current color selected
4. User changes name to "Work Projects"
5. User changes color to red (#EF4444)
6. User clicks "Save" button
7. **Optimistic Update**: Tag name and color update immediately in:
   - Tag list in modal
   - All todo badges using this tag
8. API request sent to `/api/tags/[id]`
9. On success: Changes confirmed
10. On failure: Reverted to original name/color, error shown

### Flow 5: Deleting a Tag

1. User opens "Manage Tags" modal
2. User clicks "Delete" icon next to "old-project" tag
3. Confirmation dialog appears:
   - "Delete tag 'old-project'?"
   - "This tag is assigned to 3 todos. The todos will not be deleted, but the tag will be removed from them."
   - "Delete" and "Cancel" buttons
4. User confirms deletion
5. **Optimistic Update**:
   - Tag removed from tag list
   - Tag badges removed from all affected todos
6. API request sent to `/api/tags/[id]`
7. On success: Deletion confirmed
8. On failure: Tag restored, badges re-appear, error shown

### Flow 6: Removing a Tag from a Todo

1. User is viewing/editing a todo with multiple tags
2. User hovers over "work" tag badge
3. Small X icon appears on badge
4. User clicks X icon
5. **Optimistic Update**: Badge disappears immediately
6. API request sent to `/api/todos/[id]/tags/[tagId]`
7. On success: Removal confirmed
8. On failure: Badge re-appears, error shown

---

## 🛠️ Technical Requirements

### Database Schema

**Table**: `tags`

```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT NOT NULL,
  UNIQUE(user_id, LOWER(name)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
```

**Table**: `todo_tags` (Junction Table)

```sql
CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
```

**Key Schema Features**:
- `UNIQUE(user_id, LOWER(name))`: Prevents duplicate tag names per user (case-insensitive)
- Cascade deletes: When user is deleted, all their tags are deleted
- Cascade deletes: When todo is deleted, all its tag associations are deleted
- Cascade deletes: When tag is deleted, all its todo associations are deleted
- Indexes on both junction table columns for efficient bidirectional queries

### TypeScript Types

**File**: `lib/db.ts`

```typescript
export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string; // Hex color code (e.g., "#3B82F6")
  created_at: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface TodoWithTags extends Todo {
  tags: Tag[];
}

export interface TagWithCount extends Tag {
  todo_count: number; // Number of todos using this tag
}
```

**File**: `lib/constants.ts`

```typescript
export const DEFAULT_TAG_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Rose', value: '#F43F5E' },
] as const;

export const TAG_NAME_MAX_LENGTH = 20;
export const TAG_NAME_MIN_LENGTH = 1;
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
```

### Database Operations

**File**: `lib/db.ts`

```typescript
export const tagDB = {
  /**
   * Create a new tag
   */
  create(userId: number, input: CreateTagInput): Tag {
    const stmt = db.prepare(`
      INSERT INTO tags (user_id, name, color, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const now = getSingaporeNow().toISOString();
    
    try {
      const result = stmt.run(
        userId,
        input.name.trim(),
        input.color,
        now
      );
      
      return this.getById(userId, result.lastInsertRowid as number)!;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new Error('A tag with this name already exists');
      }
      throw error;
    }
  },

  /**
   * Get all tags for a user
   */
  getAll(userId: number): Tag[] {
    const stmt = db.prepare(`
      SELECT * FROM tags 
      WHERE user_id = ? 
      ORDER BY name COLLATE NOCASE ASC
    `);
    return stmt.all(userId) as Tag[];
  },

  /**
   * Get all tags with usage count
   */
  getAllWithCount(userId: number): TagWithCount[] {
    const stmt = db.prepare(`
      SELECT 
        t.id,
        t.user_id,
        t.name,
        t.color,
        t.created_at,
        COUNT(tt.todo_id) as todo_count
      FROM tags t
      LEFT JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.name COLLATE NOCASE ASC
    `);
    return stmt.all(userId) as TagWithCount[];
  },

  /**
   * Get a single tag by ID
   */
  getById(userId: number, id: number): Tag | undefined {
    const stmt = db.prepare(`
      SELECT * FROM tags 
      WHERE id = ? AND user_id = ?
    `);
    return stmt.get(id, userId) as Tag | undefined;
  },

  /**
   * Update a tag
   */
  update(userId: number, id: number, input: UpdateTagInput): Tag | undefined {
    const tag = this.getById(userId, id);
    if (!tag) return undefined;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name.trim());
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      values.push(input.color);
    }

    if (updates.length === 0) return tag;

    values.push(id, userId);

    try {
      const stmt = db.prepare(`
        UPDATE tags 
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `);
      stmt.run(...values);

      return this.getById(userId, id);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new Error('A tag with this name already exists');
      }
      throw error;
    }
  },

  /**
   * Delete a tag (also removes all todo associations)
   */
  delete(userId: number, id: number): boolean {
    const stmt = db.prepare(`
      DELETE FROM tags 
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  },

  /**
   * Get all tags for a specific todo
   */
  getTagsForTodo(userId: number, todoId: number): Tag[] {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ? AND t.user_id = ?
      ORDER BY t.name COLLATE NOCASE ASC
    `);
    return stmt.all(todoId, userId) as Tag[];
  },

  /**
   * Assign a tag to a todo
   */
  assignTagToTodo(userId: number, todoId: number, tagId: number): boolean {
    // Verify tag belongs to user
    const tag = this.getById(userId, tagId);
    if (!tag) return false;

    // Verify todo belongs to user
    const todo = todoDB.getById(userId, todoId);
    if (!todo) return false;

    try {
      const stmt = db.prepare(`
        INSERT INTO todo_tags (todo_id, tag_id) 
        VALUES (?, ?)
      `);
      stmt.run(todoId, tagId);
      return true;
    } catch (error: any) {
      // Tag already assigned to this todo
      if (error.message?.includes('UNIQUE constraint failed')) {
        return true; // Idempotent operation
      }
      throw error;
    }
  },

  /**
   * Remove a tag from a todo
   */
  removeTagFromTodo(userId: number, todoId: number, tagId: number): boolean {
    // Verify tag belongs to user
    const tag = this.getById(userId, tagId);
    if (!tag) return false;

    // Verify todo belongs to user
    const todo = todoDB.getById(userId, todoId);
    if (!todo) return false;

    const stmt = db.prepare(`
      DELETE FROM todo_tags 
      WHERE todo_id = ? AND tag_id = ?
    `);
    const result = stmt.run(todoId, tagId);
    return result.changes > 0;
  },

  /**
   * Get all todos with a specific tag
   */
  getTodosWithTag(userId: number, tagId: number): Todo[] {
    const stmt = db.prepare(`
      SELECT t.* FROM todos t
      INNER JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE tt.tag_id = ? AND t.user_id = ?
      ORDER BY t.created_at DESC
    `);
    return stmt.all(tagId, userId) as Todo[];
  },
};
```

### API Endpoints

#### GET `/api/tags` - Get All Tags

**Purpose**: Retrieve all tags for the authenticated user

**Authentication**: Required (JWT session)

**Query Parameters**:
- `with_count` (optional): If "true", include todo count for each tag

**Response** (200 OK):
```typescript
{
  tags: [
    {
      id: 1,
      user_id: 10,
      name: "work",
      color: "#3B82F6",
      created_at: "2025-11-13T10:00:00+08:00",
      todo_count: 15  // Only if with_count=true
    },
    {
      id: 2,
      user_id: 10,
      name: "personal",
      color: "#10B981",
      created_at: "2025-11-13T10:05:00+08:00",
      todo_count: 8  // Only if with_count=true
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: No valid session
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/tags/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const withCount = searchParams.get('with_count') === 'true';

    const tags = withCount 
      ? tagDB.getAllWithCount(session.userId)
      : tagDB.getAll(session.userId);

    return NextResponse.json({ tags }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
```

#### POST `/api/tags` - Create Tag

**Purpose**: Create a new tag for the authenticated user

**Authentication**: Required (JWT session)

**Request Body**:
```typescript
{
  name: string;      // Required, 1-20 characters, trimmed
  color: string;     // Required, hex color code (#RRGGBB)
}
```

**Response** (201 Created):
```typescript
{
  id: 3,
  user_id: 10,
  name: "urgent",
  color: "#EF4444",
  created_at: "2025-11-13T11:00:00+08:00"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (missing name, invalid color, name too long)
- `401 Unauthorized`: No valid session
- `409 Conflict`: Tag name already exists (case-insensitive)
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/tags/route.ts`):

```typescript
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < TAG_NAME_MIN_LENGTH) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    if (trimmedName.length > TAG_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Name must be ${TAG_NAME_MAX_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Validate color
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Color is required' }, { status: 400 });
    }

    if (!HEX_COLOR_REGEX.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex code (e.g., #3B82F6)' },
        { status: 400 }
      );
    }

    const tag = tagDB.create(session.userId, { name: trimmedName, color });
    return NextResponse.json(tag, { status: 201 });

  } catch (error: any) {
    if (error.message === 'A tag with this name already exists') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
```

#### GET `/api/tags/[id]` - Get Single Tag

**Purpose**: Retrieve a specific tag by ID

**Authentication**: Required (JWT session)

**Response** (200 OK):
```typescript
{
  id: 1,
  user_id: 10,
  name: "work",
  color: "#3B82F6",
  created_at: "2025-11-13T10:00:00+08:00"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid tag ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Tag not found or doesn't belong to user
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/tags/[id]/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const tag = tagDB.getById(session.userId, tagId);
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(tag, { status: 200 });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}
```

#### PUT `/api/tags/[id]` - Update Tag

**Purpose**: Update a tag's name and/or color

**Authentication**: Required (JWT session)

**Request Body**:
```typescript
{
  name?: string;     // Optional, 1-20 characters, trimmed
  color?: string;    // Optional, hex color code (#RRGGBB)
}
```

**Response** (200 OK):
```typescript
{
  id: 1,
  user_id: 10,
  name: "Work Projects",
  color: "#EF4444",
  created_at: "2025-11-13T10:00:00+08:00"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: No valid session
- `404 Not Found`: Tag not found
- `409 Conflict`: New name conflicts with existing tag
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/tags/[id]/route.ts`):

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, color } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json({ error: 'Name must be a string' }, { status: 400 });
      }

      const trimmedName = name.trim();
      if (trimmedName.length < TAG_NAME_MIN_LENGTH) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }

      if (trimmedName.length > TAG_NAME_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Name must be ${TAG_NAME_MAX_LENGTH} characters or less` },
          { status: 400 }
        );
      }
    }

    // Validate color if provided
    if (color !== undefined) {
      if (typeof color !== 'string') {
        return NextResponse.json({ error: 'Color must be a string' }, { status: 400 });
      }

      if (!HEX_COLOR_REGEX.test(color)) {
        return NextResponse.json(
          { error: 'Color must be a valid hex code (e.g., #3B82F6)' },
          { status: 400 }
        );
      }
    }

    const updatedTag = tagDB.update(session.userId, tagId, {
      name: name?.trim(),
      color,
    });

    if (!updatedTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTag, { status: 200 });

  } catch (error: any) {
    if (error.message === 'A tag with this name already exists') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}
```

#### DELETE `/api/tags/[id]` - Delete Tag

**Purpose**: Delete a tag and remove it from all associated todos

**Authentication**: Required (JWT session)

**Response** (200 OK):
```typescript
{
  message: "Tag deleted successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid tag ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Tag not found
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/tags/[id]/route.ts`):

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tagId = parseInt(id, 10);

    if (isNaN(tagId)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const success = tagDB.delete(session.userId, tagId);
    if (!success) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Tag deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
```

#### POST `/api/todos/[id]/tags` - Assign Tag to Todo

**Purpose**: Assign an existing tag to a todo

**Authentication**: Required (JWT session)

**Request Body**:
```typescript
{
  tag_id: number;  // ID of existing tag
}
```

**Response** (200 OK):
```typescript
{
  success: true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid todo ID or tag ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Todo or tag not found
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/todos/[id]/tags/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const todoId = parseInt(id, 10);

    if (isNaN(todoId)) {
      return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tag_id } = body;

    if (!tag_id || typeof tag_id !== 'number') {
      return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
    }

    const success = tagDB.assignTagToTodo(session.userId, todoId, tag_id);
    if (!success) {
      return NextResponse.json(
        { error: 'Todo or tag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error assigning tag to todo:', error);
    return NextResponse.json(
      { error: 'Failed to assign tag to todo' },
      { status: 500 }
    );
  }
}
```

#### DELETE `/api/todos/[id]/tags/[tagId]` - Remove Tag from Todo

**Purpose**: Remove a tag from a todo

**Authentication**: Required (JWT session)

**Response** (200 OK):
```typescript
{
  success: true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid todo ID or tag ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Todo or tag not found, or tag not assigned to todo
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/todos/[id]/tags/[tagId]/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id, tagId } = await params;
    const todoId = parseInt(id, 10);
    const tagIdNum = parseInt(tagId, 10);

    if (isNaN(todoId) || isNaN(tagIdNum)) {
      return NextResponse.json(
        { error: 'Invalid todo ID or tag ID' },
        { status: 400 }
      );
    }

    const success = tagDB.removeTagFromTodo(session.userId, todoId, tagIdNum);
    if (!success) {
      return NextResponse.json(
        { error: 'Todo or tag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing tag from todo:', error);
    return NextResponse.json(
      { error: 'Failed to remove tag from todo' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 UI Components

### Tag Badge Component

**File**: `components/TagBadge.tsx`

```typescript
'use client';

import { Tag } from '@/lib/db';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  removable?: boolean;
}

export function TagBadge({ 
  tag, 
  onRemove, 
  size = 'md',
  removable = false 
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} transition-all hover:brightness-95`}
      style={{
        backgroundColor: `${tag.color}20`, // 12.5% opacity
        color: tag.color,
        border: `1px solid ${tag.color}40`, // 25% opacity
      }}
      title={tag.name}
    >
      <span className="truncate max-w-[120px]">{tag.name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:brightness-75 transition-all"
          aria-label={`Remove ${tag.name} tag`}
        >
          ×
        </button>
      )}
    </span>
  );
}
```

### Tag Manager Modal Component

**File**: `components/TagManagerModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Tag, TagWithCount } from '@/lib/db';
import { DEFAULT_TAG_COLORS, TAG_NAME_MAX_LENGTH } from '@/lib/constants';
import { TagBadge } from './TagBadge';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated?: (tag: Tag) => void;
  onTagUpdated?: (tag: Tag) => void;
  onTagDeleted?: (tagId: number) => void;
}

export function TagManagerModal({
  isOpen,
  onClose,
  onTagCreated,
  onTagUpdated,
  onTagDeleted,
}: TagManagerModalProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[0].value);
  
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Fetch tags
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tags?with_count=true');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags);
    } catch (err) {
      setError('Failed to load tags');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create tag');
      }

      const createdTag = await response.json();
      setTags([...tags, { ...createdTag, todo_count: 0 }]);
      onTagCreated?.(createdTag);
      
      // Reset form
      setNewTagName('');
      setNewTagColor(DEFAULT_TAG_COLORS[0].value);
      setShowCreateForm(false);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (tag: TagWithCount) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = async (tag: TagWithCount) => {
    if (!editName.trim()) return;

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tag');
      }

      const updatedTag = await response.json();
      setTags(tags.map(t => 
        t.id === tag.id ? { ...updatedTag, todo_count: t.todo_count } : t
      ));
      onTagUpdated?.(updatedTag);
      setEditingId(null);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (tag: TagWithCount) => {
    const confirmMessage = tag.todo_count > 0
      ? `Delete tag "${tag.name}"? It is assigned to ${tag.todo_count} todo(s). The todos will not be deleted, but the tag will be removed from them.`
      : `Delete tag "${tag.name}"?`;

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      setTags(tags.filter(t => t.id !== tag.id));
      onTagDeleted?.(tag.id);
      setError('');
    } catch (err) {
      setError('Failed to delete tag');
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Manage Tags</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Create Form */}
          {showCreateForm ? (
            <form onSubmit={handleCreate} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold mb-3">Create New Tag</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tag Name</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., work, personal, urgent"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={TAG_NAME_MAX_LENGTH}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newTagName.length}/{TAG_NAME_MAX_LENGTH} characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {DEFAULT_TAG_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setNewTagColor(colorOption.value)}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          newTagColor === colorOption.value
                            ? 'ring-2 ring-offset-2 ring-blue-500'
                            : 'hover:brightness-90'
                        }`}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="mt-2 w-full h-10 rounded cursor-pointer"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    disabled={!newTagName.trim()}
                  >
                    Create Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTagName('');
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              + Create New Tag
            </button>
          )}

          {/* Tag List */}
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading tags...</p>
          ) : tags.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No tags yet. Create one above!
            </p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  {editingId === tag.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={TAG_NAME_MAX_LENGTH}
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-12 h-8 rounded cursor-pointer"
                      />
                      <button
                        onClick={() => handleSaveEdit(tag)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <TagBadge tag={tag} size="md" />
                      <span className="text-sm text-gray-500">
                        {tag.todo_count} {tag.todo_count === 1 ? 'todo' : 'todos'}
                      </span>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleEdit(tag)}
                          className="px-3 py-1 text-blue-500 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tag)}
                          className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Tag Selector Component

**File**: `components/TagSelector.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@/lib/db';

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onAssignTag: (tagId: number) => Promise<void>;
  onRemoveTag: (tagId: number) => Promise<void>;
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  onAssignTag,
  onRemoveTag,
}: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setAvailableTags(data.tags);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const unselectedTags = availableTags.filter(
    (tag) => !selectedTags.some((st) => st.id === tag.id)
  );

  const handleAssign = async (tagId: number) => {
    setLoading(true);
    try {
      await onAssignTag(tagId);
      const tag = availableTags.find((t) => t.id === tagId);
      if (tag) {
        onTagsChange([...selectedTags, tag]);
      }
      setShowDropdown(false);
    } catch (err) {
      console.error('Error assigning tag:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (tagId: number) => {
    setLoading(true);
    try {
      await onRemoveTag(tagId);
      onTagsChange(selectedTags.filter((t) => t.id !== tagId));
    } catch (err) {
      console.error('Error removing tag:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Tags</label>
      
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            removable
            onRemove={() => handleRemove(tag.id)}
          />
        ))}
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
            disabled={loading || unselectedTags.length === 0}
          >
            + Add Tag
          </button>

          {showDropdown && unselectedTags.length > 0 && (
            <div className="absolute top-full mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
              {unselectedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleAssign(tag.id)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
                >
                  <TagBadge tag={tag} size="sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {unselectedTags.length === 0 && selectedTags.length > 0 && (
        <p className="text-xs text-gray-500">All available tags assigned</p>
      )}

      {availableTags.length === 0 && (
        <p className="text-xs text-gray-500">
          No tags yet. Create one in the tag manager.
        </p>
      )}
    </div>
  );
}
```

---

## ⚠️ Edge Cases

### 1. Duplicate Tag Names (Case-Insensitive)
**Scenario**: User tries to create "Work" when "work" already exists  
**Handling**:
- Database unique constraint on `LOWER(name)` prevents duplicates
- API returns 409 Conflict error
- UI shows error message: "A tag with this name already exists"
- Suggestion: Use existing tag or choose different name

### 2. Empty or Whitespace-Only Tag Names
**Scenario**: User submits tag with only spaces  
**Handling**:
- Client: Disable submit button when trimmed name is empty
- Server: Reject with 400 error "Name cannot be empty"
- UI: Show validation error below input field

### 3. Tag Name Exceeds Maximum Length
**Scenario**: User types more than 20 characters  
**Handling**:
- Client: Set `maxLength={20}` on input field
- Client: Show character counter (e.g., "18/20")
- Server: Validate and reject with 400 error if > 20 chars
- Prevent input beyond limit (HTML attribute prevents typing)

### 4. Invalid Hex Color Code
**Scenario**: User enters "#ZZZ999" or "red" instead of valid hex  
**Handling**:
- Client: Use HTML color picker to prevent invalid input
- Server: Validate with regex `/^#[0-9A-Fa-f]{6}$/`
- API returns 400 error: "Color must be a valid hex code (e.g., #3B82F6)"
- UI shows error message with example

### 5. Deleting Tag Assigned to Many Todos
**Scenario**: User deletes "work" tag assigned to 50 todos  
**Handling**:
- Confirmation dialog shows: "Delete tag 'work'? It is assigned to 50 todos. The todos will not be deleted, but the tag will be removed from them."
- User confirms → Database cascade delete removes all `todo_tags` entries
- Todos remain intact, only tag association removed
- UI updates all affected todo badges immediately (optimistic)

### 6. Assigning Same Tag Twice to Todo
**Scenario**: User clicks "Add Tag" → "work" twice due to double-click  
**Handling**:
- Database unique constraint on `(todo_id, tag_id)` prevents duplicates
- First request succeeds, second returns success (idempotent)
- UI prevents duplicate by checking if tag already in `selectedTags`
- No error shown to user (silent deduplication)

### 7. Editing Tag While Others Are Using It
**Scenario**: User changes "work" to "Work Projects" and color to red  
**Handling**:
- Update affects all todos using this tag immediately
- Database update is atomic (single SQL UPDATE statement)
- UI optimistic update shows changes before server confirms
- All todo badges across the page update via state propagation
- No versioning or conflict resolution needed (last write wins)

### 8. Deleting Todo with Multiple Tags
**Scenario**: User deletes todo that has 5 tags assigned  
**Handling**:
- Database cascade delete (ON DELETE CASCADE in `todo_tags` table)
- All 5 `todo_tags` entries automatically removed
- Tags themselves remain in `tags` table (not deleted)
- No orphaned records
- No manual cleanup needed

### 9. Filtering by Non-Existent Tag
**Scenario**: User has URL with `?tag=999` but tag ID doesn't exist  
**Handling**:
- Client-side filtering checks if tag exists in user's tag list
- If not found, show all todos (ignore invalid filter)
- Display message: "Tag not found, showing all todos"
- Don't crash or show error page

### 10. Special Characters in Tag Names
**Scenario**: User enters "Client-A", "Work/Home", "Q1'25"  
**Handling**:
- Allow all characters except control characters
- No HTML escaping needed (rendered as text, not HTML)
- Emoji support: Allow "🏠 Home", "💼 Work", etc.
- SQLite TEXT type handles unicode properly
- Trim leading/trailing whitespace only

### 11. Tag Color Too Similar to Background
**Scenario**: User selects white (#FFFFFF) on light background  
**Handling**:
- Badge uses semi-transparent background: `${color}20` (12.5% opacity)
- Border uses `${color}40` (25% opacity) for visibility
- Text color is the full color value (100% opacity)
- Always readable due to background tint and border
- Alternative: Warn if color is too light (e.g., > #F0F0F0)

### 12. Rapid Tag Assignment/Removal
**Scenario**: User quickly adds and removes tags due to indecision  
**Handling**:
- Optimistic updates provide instant feedback
- Each API call is independent (no race condition handling needed)
- If user adds → removes → adds same tag quickly:
  - Three API calls fire sequentially
  - Final state matches last action
  - SQLite handles concurrent writes via locking
- UI may briefly flicker if responses arrive out of order
- Consider debouncing for 200ms to reduce API calls

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **Create Tag**
   - [ ] User can create tag with name and color
   - [ ] Tag name is required and trimmed of whitespace
   - [ ] Tag name is unique per user (case-insensitive)
   - [ ] Tag name is 1-20 characters
   - [ ] Color is required and validated as hex code
   - [ ] 12 default color options provided
   - [ ] Custom color picker available
   - [ ] New tag appears in tag list immediately

2. **Edit Tag**
   - [ ] User can edit tag name
   - [ ] User can edit tag color
   - [ ] Changes apply to all todos using the tag
   - [ ] Validation same as create (unique name, valid color)
   - [ ] Optimistic UI update before server confirmation

3. **Delete Tag**
   - [ ] User can delete tag from tag manager
   - [ ] Confirmation dialog shows number of affected todos
   - [ ] Tag removed from all associated todos
   - [ ] Todos themselves are not deleted
   - [ ] Tag disappears from UI immediately (optimistic)

4. **Assign Tag to Todo**
   - [ ] User can assign multiple tags to a todo
   - [ ] Dropdown shows only unassigned tags
   - [ ] Tag badge appears on todo after assignment
   - [ ] Cannot assign same tag twice to todo
   - [ ] Assignment persists across page refreshes

5. **Remove Tag from Todo**
   - [ ] User can remove tag by clicking X on badge
   - [ ] Tag badge disappears immediately (optimistic)
   - [ ] Tag remains in tag list (not deleted globally)
   - [ ] Other todos with same tag unaffected

6. **Filter by Tag**
   - [ ] User can filter todos by one or more tags
   - [ ] Filter is client-side (instant results)
   - [ ] Filtered todos display immediately
   - [ ] Filter indicator shows active filters
   - [ ] User can clear filters to see all todos
   - [ ] Multiple tag filters use OR logic (show todos with any selected tag)

7. **Tag Management Modal**
   - [ ] Modal accessible from main navigation
   - [ ] Shows all user's tags with usage counts
   - [ ] Allows creating, editing, deleting tags
   - [ ] Scrollable if many tags exist
   - [ ] Closes via X button or "Close" button
   - [ ] Changes reflect immediately in main todo list

### Non-Functional Requirements

1. **Performance**
   - [ ] Tag list loads in < 100ms
   - [ ] Tag assignment completes in < 200ms
   - [ ] Client-side filtering is instant (< 50ms)
   - [ ] No performance degradation with 100+ tags
   - [ ] No UI lag with todos having 10+ tags each

2. **Data Integrity**
   - [ ] No orphaned `todo_tags` entries after deletions
   - [ ] Unique constraints prevent duplicate associations
   - [ ] Cascade deletes work correctly
   - [ ] Database indexes improve query performance

3. **Usability**
   - [ ] Color-coded badges are visually distinct
   - [ ] Tag names truncate gracefully if too long
   - [ ] Hover states provide visual feedback
   - [ ] Error messages are clear and actionable
   - [ ] Loading states shown during async operations

4. **Accessibility**
   - [ ] Tag badges have meaningful `aria-label` attributes
   - [ ] Modal is keyboard navigable
   - [ ] Color picker accessible via keyboard
   - [ ] Focus management in modal (trap focus)
   - [ ] Screen reader announces tag changes

### Testing Requirements

1. **E2E Tests (Playwright)**
   ```typescript
   test('should create tag and assign to todo', async ({ page }) => {
     // Open tag manager
     // Create tag "work" with blue color
     // Close modal
     // Create new todo
     // Assign "work" tag to todo
     // Verify badge appears on todo
   });

   test('should prevent duplicate tag names', async ({ page }) => {
     // Create tag "work"
     // Try to create tag "Work" (different case)
     // Verify error message appears
     // Verify only one "work" tag exists
   });

   test('should delete tag and remove from todos', async ({ page }) => {
     // Create tag "test"
     // Assign to 3 todos
     // Delete tag from manager
     // Confirm deletion
     // Verify tag removed from all todos
     // Verify todos still exist
   });

   test('should filter todos by tag', async ({ page }) => {
     // Create tags "work" and "personal"
     // Create 5 todos: 3 with "work", 2 with "personal"
     // Filter by "work"
     // Verify only 3 todos shown
     // Clear filter
     // Verify all 5 todos shown
   });
   ```

2. **Unit Tests**
   ```typescript
   test('tagDB.create enforces unique constraint', () => {
     // Create tag "work"
     // Try to create tag "work" again
     // Verify error thrown
   });

   test('tagDB.create handles case-insensitive uniqueness', () => {
     // Create tag "work"
     // Try to create tag "WORK"
     // Verify error thrown
   });

   test('tagDB.delete removes todo associations', () => {
     // Create tag, assign to 2 todos
     // Delete tag
     // Query todo_tags table
     // Verify 0 associations remain
   });

   test('tagDB.assignTagToTodo is idempotent', () => {
     // Assign tag to todo
     // Assign same tag to same todo
     
