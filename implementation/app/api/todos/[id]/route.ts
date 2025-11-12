/**
 * API Route: PUT /api/todos/[id]/route.ts
 * 
 * Handles updating todos, including completion of recurring todos
 * with automatic next instance creation.
 * 
 * This is the COMPLETE implementation including recurring todo logic.
 * Replace or merge with your existing app/api/todos/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSingaporeNow } from '@/lib/timezone';
import { calculateNextDueDate } from '@/lib/recurrence-utils';
import type { RecurringTodoCompletionResponse, TodoWithRelations } from '@/lib/types';

// Assuming you have these DB functions in lib/db.ts
// Import your actual DB functions
import { db } from '@/lib/db';

/**
 * PUT /api/todos/[id]
 * Update a todo, handle recurring todo completion
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { id } = await params; // Next.js 16 - params is a Promise
  const todoId = parseInt(id);
  const body = await request.json();

  try {
    // Get existing todo with all relations
    const existingTodo = getTodoWithRelations(todoId, session.userId);
    
    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // Check if this is a completion of a recurring todo
    const isCompletingRecurring = 
      body.completed && 
      !existingTodo.completed && 
      existingTodo.recurrence_pattern;

    if (isCompletingRecurring) {
      // Special handling for recurring todo completion
      return handleRecurringTodoCompletion(existingTodo, session.userId);
    }

    // Regular update (non-recurring or other fields)
    const updatedTodo = updateTodo(todoId, body, session.userId);
    
    return NextResponse.json(updatedTodo);

  } catch (error: any) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle completion of a recurring todo
 * Creates the next instance with all metadata
 */
function handleRecurringTodoCompletion(
  todo: TodoWithRelations,
  userId: number
): NextResponse<RecurringTodoCompletionResponse> {
  // 1. Mark current instance as completed
  const completedAt = getSingaporeNow().toISOString();
  
  db.prepare(`
    UPDATE todos 
    SET completed = 1, 
        completed_at = ?,
        updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(completedAt, completedAt, todo.id, userId);

  // 2. Calculate next due date
  const nextDueDate = calculateNextDueDate(
    todo.due_date,
    todo.recurrence_pattern!
  );

  // 3. Create next instance with same properties
  const nextTodoResult = db.prepare(`
    INSERT INTO todos (
      user_id,
      title,
      due_date,
      priority,
      recurrence_pattern,
      reminder_minutes,
      completed,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    userId,
    todo.title,
    nextDueDate,
    todo.priority,
    todo.recurrence_pattern,
    todo.reminder_minutes ?? null,
    completedAt,
    completedAt
  );

  const nextTodoId = nextTodoResult.lastInsertRowid as number;

  // 4. Clone tags (many-to-many relationship)
  for (const tag of todo.tags) {
    db.prepare(`
      INSERT INTO todo_tags (todo_id, tag_id)
      VALUES (?, ?)
    `).run(nextTodoId, tag.id);
  }

  // 5. Clone subtasks with same positions, marked as uncompleted
  for (const subtask of todo.subtasks) {
    db.prepare(`
      INSERT INTO subtasks (todo_id, title, position, completed)
      VALUES (?, ?, ?, 0)
    `).run(nextTodoId, subtask.title, subtask.position);
  }

  // 6. Fetch complete data for both todos
  const completedTodo = getTodoWithRelations(todo.id, userId);
  const nextInstance = getTodoWithRelations(nextTodoId, userId);

  return NextResponse.json({
    completed_todo: completedTodo!,
    next_instance: nextInstance!,
  });
}

/**
 * Regular todo update (non-recurring logic)
 */
function updateTodo(
  todoId: number,
  updates: Partial<TodoWithRelations>,
  userId: number
): TodoWithRelations {
  const fields: string[] = [];
  const values: any[] = [];

  // Build dynamic UPDATE query
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.completed !== undefined) {
    fields.push('completed = ?');
    values.push(updates.completed ? 1 : 0);
    
    if (updates.completed) {
      fields.push('completed_at = ?');
      values.push(getSingaporeNow().toISOString());
    } else {
      fields.push('completed_at = ?');
      values.push(null);
    }
  }
  if (updates.priority !== undefined) {
    fields.push('priority = ?');
    values.push(updates.priority);
  }
  if (updates.due_date !== undefined) {
    fields.push('due_date = ?');
    values.push(updates.due_date);
  }
  if (updates.recurrence_pattern !== undefined) {
    fields.push('recurrence_pattern = ?');
    values.push(updates.recurrence_pattern);
  }
  if (updates.reminder_minutes !== undefined) {
    fields.push('reminder_minutes = ?');
    values.push(updates.reminder_minutes);
  }

  // Always update updated_at
  fields.push('updated_at = ?');
  values.push(getSingaporeNow().toISOString());

  // Add WHERE clause values
  values.push(todoId, userId);

  db.prepare(`
    UPDATE todos 
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `).run(...values);

  return getTodoWithRelations(todoId, userId)!;
}

/**
 * Get todo with all relations (tags and subtasks)
 */
function getTodoWithRelations(
  todoId: number,
  userId: number
): TodoWithRelations | null {
  // Get base todo
  const todo = db.prepare(`
    SELECT * FROM todos 
    WHERE id = ? AND user_id = ?
  `).get(todoId, userId) as any;

  if (!todo) return null;

  // Get tags
  const tags = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN todo_tags tt ON t.id = tt.tag_id
    WHERE tt.todo_id = ?
  `).all(todoId) as any[];

  // Get subtasks
  const subtasks = db.prepare(`
    SELECT * FROM subtasks 
    WHERE todo_id = ?
    ORDER BY position ASC
  `).all(todoId) as any[];

  return {
    ...todo,
    completed: Boolean(todo.completed),
    tags,
    subtasks: subtasks.map(st => ({
      ...st,
      completed: Boolean(st.completed)
    }))
  };
}

/**
 * DELETE /api/todos/[id]
 * Delete a todo (CASCADE handles subtasks and tag relationships)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const todoId = parseInt(id);

  try {
    // Check if todo exists and belongs to user
    const todo = db.prepare(`
      SELECT id, recurrence_pattern FROM todos 
      WHERE id = ? AND user_id = ?
    `).get(todoId, session.userId) as any;

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // Delete todo (CASCADE will delete subtasks and todo_tags entries)
    db.prepare(`
      DELETE FROM todos 
      WHERE id = ? AND user_id = ?
    `).run(todoId, session.userId);

    return NextResponse.json({ 
      success: true,
      message: todo.recurrence_pattern 
        ? 'Recurring todo instance deleted. Future instances are not affected.'
        : 'Todo deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/todos/[id]
 * Get a specific todo with relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const todo = getTodoWithRelations(todoId, session.userId);
    
    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(todo);

  } catch (error: any) {
    console.error('Error fetching todo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo', details: error.message },
      { status: 500 }
    );
  }
}
