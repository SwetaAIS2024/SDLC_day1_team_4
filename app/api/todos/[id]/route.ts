/**
 * API Routes for Individual Todo Operations
 * GET /api/todos/[id] - Get single todo
 * PUT /api/todos/[id] - Update todo
 * DELETE /api/todos/[id] - Delete todo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, UpdateTodoInput } from '@/lib/db';
import { isValidDateFormat } from '@/lib/timezone';

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

    // Build update input
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
