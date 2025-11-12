/**
 * API Routes for Individual Todo Operations
 * GET /api/todos/[id] - Get single todo
 * PUT /api/todos/[id] - Update todo
 * DELETE /api/todos/[id] - Delete todo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, UpdateTodoInput, Todo } from '@/lib/db';
import { isValidDateFormat, calculateNextDueDate, getSingaporeNow } from '@/lib/timezone';

/**
 * GET /api/todos/[id]
 * Get single todo by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // CRITICAL: params is async in Next.js 16 (copilot-instructions.md pattern #4)
  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const todo = todoDB.getById(session.userId, todoId);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error('Failed to fetch todo:', error);
    return NextResponse.json({ error: 'Failed to fetch todo' }, { status: 500 });
  }
}

/**
 * PUT /api/todos/[id]
 * Update todo
 * PRP-03: Handles recurring todo completion with automatic next instance creation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // CRITICAL: params is async in Next.js 16 (copilot-instructions.md pattern #4)
  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const body = await request.json();

    // Get existing todo to check for recurrence
    const existingTodo = todoDB.getById(session.userId, todoId);
    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Validation
    if (body.title !== undefined) {
      if (!body.title || body.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      if (body.title.length > 500) {
        return NextResponse.json(
          { error: 'Title must be between 1 and 500 characters' },
          { status: 400 }
        );
      }
    }

    if (body.due_date !== undefined && body.due_date !== null && !isValidDateFormat(body.due_date)) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // PRP-03: Check if this is a completion of a recurring todo
    const isCompletingRecurring = 
      body.completed_at !== undefined && 
      body.completed_at !== null && 
      !existingTodo.completed_at && 
      existingTodo.recurrence_pattern;

    if (isCompletingRecurring) {
      // Handle recurring todo completion - create next instance
      return handleRecurringTodoCompletion(session.userId, existingTodo, body.completed_at);
    }

    // Regular update (non-recurring logic)
    const updateInput: UpdateTodoInput = {};
    if (body.title !== undefined) updateInput.title = body.title.trim();
    if (body.completed_at !== undefined) updateInput.completed_at = body.completed_at;
    if (body.due_date !== undefined) updateInput.due_date = body.due_date;
    if (body.priority !== undefined) updateInput.priority = body.priority;
    if (body.recurrence_pattern !== undefined) updateInput.recurrence_pattern = body.recurrence_pattern;
    if (body.reminder_minutes !== undefined) updateInput.reminder_minutes = body.reminder_minutes;

    // Update (synchronous)
    const updated = todoDB.update(session.userId, todoId, updateInput);

    if (!updated) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

/**
 * PRP-03: Handle completion of a recurring todo
 * Creates the next instance with all metadata inherited
 */
function handleRecurringTodoCompletion(
  userId: number,
  todo: Todo,
  completedAt: string
): NextResponse {
  try {
    // 1. Mark current instance as completed
    const completedTodo = todoDB.update(userId, todo.id, {
      completed_at: completedAt,
    });

    if (!completedTodo) {
      throw new Error('Failed to mark todo as completed');
    }

    // 2. Calculate next due date
    const nextDueDate = calculateNextDueDate(
      todo.due_date,
      todo.recurrence_pattern!
    );

    // 3. Create next instance with same properties
    const nextTodo = todoDB.create(userId, {
      title: todo.title,
      due_date: nextDueDate,
      priority: todo.priority || undefined,
      recurrence_pattern: todo.recurrence_pattern || undefined,
      reminder_minutes: todo.reminder_minutes || undefined,
    });

    // 4. Return both completed and next instance
    return NextResponse.json({
      completed_todo: completedTodo,
      next_instance: nextTodo,
      message: `Recurring todo completed! Next instance scheduled for ${nextDueDate}`,
    });
  } catch (error) {
    console.error('Failed to handle recurring todo completion:', error);
    throw error;
  }
}

/**
 * DELETE /api/todos/[id]
 * Delete todo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // CRITICAL: params is async in Next.js 16
  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const deleted = todoDB.delete(session.userId, todoId);

    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
