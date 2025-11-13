import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, UpdateTodoInput, todoToResponse, todoTagDB } from '@/lib/db';
import { calculateNextDueDate } from '@/lib/timezone';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    const input: UpdateTodoInput = {};
    
    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ error: 'Title must be a string' }, { status: 400 });
      }
      const title = body.title.trim();
      if (title.length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (title.length > 500) {
        return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 });
      }
      input.title = title;
    }

    if (body.completed !== undefined) {
      // Convert boolean to timestamp (completed) or null (not completed)
      const { getSingaporeNow } = await import('@/lib/timezone');
      input.completed_at = Boolean(body.completed) ? getSingaporeNow().toISO() : null;
    }

    if (body.priority !== undefined) {
      input.priority = body.priority;
    }

    if (body.recurrence_pattern !== undefined) {
      input.recurrence_pattern = body.recurrence_pattern;
    }

    if (body.due_date !== undefined) {
      input.due_date = body.due_date;
    }

    if (body.reminder_minutes !== undefined) {
      input.reminder_minutes = body.reminder_minutes;
    }

    // Get the current todo before updating to check recurrence
    const currentTodo = todoDB.getById(session.userId, todoId);
    if (!currentTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Update the current todo
    const todo = todoDB.update(session.userId, todoId, input);
    
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Handle tag updates
    if (body.tag_ids !== undefined && Array.isArray(body.tag_ids)) {
      todoTagDB.setTags(todoId, body.tag_ids);
    }

    // If todo was just completed and has recurrence, create next instance
    if (
      input.completed_at !== undefined &&
      input.completed_at !== null && 
      currentTodo.completed_at === null && 
      currentTodo.recurrence_pattern && 
      currentTodo.due_date
    ) {
      try {
        const nextDueDate = calculateNextDueDate(
          currentTodo.due_date, 
          currentTodo.recurrence_pattern
        );
        
        // Get current tags to copy to next instance
        const currentTagIds = todoTagDB.getTagIds(todoId);
        
        // Create next instance with same properties
        const nextTodo = todoDB.create(session.userId, {
          title: currentTodo.title,
          priority: currentTodo.priority,
          recurrence_pattern: currentTodo.recurrence_pattern,
          due_date: nextDueDate,
          reminder_minutes: currentTodo.reminder_minutes, // Inherit reminder
        });
        
        // Copy tags to next instance
        if (currentTagIds.length > 0) {
          todoTagDB.setTags(nextTodo.id, currentTagIds);
        }
      } catch (error) {
        console.error('Error creating next recurring instance:', error);
        // Don't fail the completion if next instance creation fails
      }
    }

    const todoWithSubtasks = todoDB.getByIdWithSubtasks(session.userId, todo.id);
    return NextResponse.json(todoWithSubtasks);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const deleted = todoDB.delete(session.userId, todoId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
