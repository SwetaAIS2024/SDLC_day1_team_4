import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, CreateTodoInput, todoToResponse, todoTagDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const todos = todoDB.getAllWithSubtasks(session.userId);
    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Validate input
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const title = body.title.trim();
    if (title.length === 0) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    if (title.length > 500) {
      return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 });
    }

    // Validate recurrence pattern requires due date
    if (body.recurrence_pattern && !body.due_date) {
      return NextResponse.json({ 
        error: 'Due date is required for recurring todos' 
      }, { status: 400 });
    }

    // Validate reminder requires due date
    if (body.reminder_minutes && !body.due_date) {
      return NextResponse.json({ 
        error: 'Due date is required for reminders' 
      }, { status: 400 });
    }

    const input: CreateTodoInput = {
      title,
      priority: body.priority || 'medium',
      recurrence_pattern: body.recurrence_pattern || null,
      due_date: body.due_date || null,
      reminder_minutes: body.reminder_minutes || null,
    };

    const todo = todoDB.create(session.userId, input);
    
    // Handle tag associations
    if (body.tag_ids && Array.isArray(body.tag_ids) && body.tag_ids.length > 0) {
      todoTagDB.setTags(todo.id, body.tag_ids);
    }
    
    // Return todo with subtasks and tags
    const todoWithDetails = todoDB.getByIdWithSubtasks(session.userId, todo.id);
    
    return NextResponse.json(todoWithDetails, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
