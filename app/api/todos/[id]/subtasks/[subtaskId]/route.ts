import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

// PUT /api/todos/[id]/subtasks/[subtaskId] - Update a subtask
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, subtaskId } = await context.params;
    const todoId = parseInt(id);
    const subtaskIdNum = parseInt(subtaskId);

    if (isNaN(todoId) || isNaN(subtaskIdNum)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Verify todo belongs to user
    const todo = todoDB.getById(session.userId, todoId);
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Verify subtask exists and belongs to this todo
    const subtask = subtaskDB.getById(subtaskIdNum);
    if (!subtask || subtask.todo_id !== todoId) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, completed, position } = body;

    // Validation
    const updates: { title?: string; completed?: boolean; position?: number } = {};

    if (title !== undefined) {
      if (typeof title !== 'string') {
        return NextResponse.json({ error: 'Title must be a string' }, { status: 400 });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (trimmedTitle.length > 200) {
        return NextResponse.json({ error: 'Title cannot exceed 200 characters' }, { status: 400 });
      }
      updates.title = trimmedTitle;
    }

    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return NextResponse.json({ error: 'Completed must be a boolean' }, { status: 400 });
      }
      updates.completed = completed;
    }

    if (position !== undefined) {
      if (typeof position !== 'number' || position < 0) {
        return NextResponse.json({ error: 'Position must be a non-negative number' }, { status: 400 });
      }
      updates.position = position;
    }

    // Update subtask
    const updatedSubtask = subtaskDB.update(subtaskIdNum, updates);
    if (!updatedSubtask) {
      return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
    }

    return NextResponse.json(updatedSubtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/todos/[id]/subtasks/[subtaskId] - Delete a subtask
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, subtaskId } = await context.params;
    const todoId = parseInt(id);
    const subtaskIdNum = parseInt(subtaskId);

    if (isNaN(todoId) || isNaN(subtaskIdNum)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Verify todo belongs to user
    const todo = todoDB.getById(session.userId, todoId);
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Verify subtask exists and belongs to this todo
    const subtask = subtaskDB.getById(subtaskIdNum);
    if (!subtask || subtask.todo_id !== todoId) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Delete subtask
    const success = subtaskDB.delete(subtaskIdNum);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
