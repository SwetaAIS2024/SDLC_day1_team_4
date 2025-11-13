import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

// GET /api/tags - Get all tags for the authenticated user
export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const tags = tagDB.getAll(session.userId);
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json({ error: 'Tag name cannot be empty' }, { status: 400 });
    }

    if (trimmedName.length > 50) {
      return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 });
    }

    // Check for duplicate name (case-insensitive)
    if (tagDB.existsByName(session.userId, trimmedName)) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 });
    }

    // Validate color format if provided
    const finalColor = color || '#3B82F6';
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(finalColor)) {
      return NextResponse.json({ error: 'Invalid color format. Use hex format like #3B82F6' }, { status: 400 });
    }

    // Create tag
    const tag = tagDB.create(session.userId, trimmedName, finalColor);

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating tag:', error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
