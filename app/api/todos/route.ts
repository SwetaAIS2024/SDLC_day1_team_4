/**
 * API Routes for Todo CRUD Operations
 * POST /api/todos - Create new todo
 * GET /api/todos - List all todos for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, CreateTodoInput } from '@/lib/db';
import { isValidDateFormat } from '@/lib/timezone';

/**
 * POST /api/todos
 * Create a new todo
 */
export async function POST(request: NextRequest) {
  // Pattern from copilot-instructions.md: Always check auth first
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, due_date } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 500) {
      return NextResponse.json(
        { error: 'Title must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    if (due_date && !isValidDateFormat(due_date)) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Create todo input
    const input: CreateTodoInput = {
      title: title.trim(),
      due_date: due_date || null,
    };

    // Database operation (synchronous - no await needed)
    const todo = todoDB.create(session.userId, input);

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error('Failed to create todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

/**
 * GET /api/todos
 * List all todos for current user
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Synchronous database call
    const todos = todoDB.getAll(session.userId);
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}
