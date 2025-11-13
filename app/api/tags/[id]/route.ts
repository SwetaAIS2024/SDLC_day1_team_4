import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

// PUT /api/tags/[id] - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseInt(id);

  if (isNaN(tagId)) {
    return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
  }

  try {
    // Check if tag exists and belongs to user
    const existingTag = tagDB.getById(session.userId, tagId);
    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    const updates: { name?: string; color?: string } = {};

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json({ error: 'Tag name must be a string' }, { status: 400 });
      }

      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return NextResponse.json({ error: 'Tag name cannot be empty' }, { status: 400 });
      }

      if (trimmedName.length > 50) {
        return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 });
      }

      // Check for duplicate name (excluding current tag)
      if (tagDB.existsByName(session.userId, trimmedName, tagId)) {
        return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 });
      }

      updates.name = trimmedName;
    }

    // Validate color if provided
    if (color !== undefined) {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColorRegex.test(color)) {
        return NextResponse.json({ error: 'Invalid color format. Use hex format like #3B82F6' }, { status: 400 });
      }

      updates.color = color;
    }

    // Update tag
    const updatedTag = tagDB.update(session.userId, tagId, updates);

    if (!updatedTag) {
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }

    return NextResponse.json({
      id: updatedTag.id,
      name: updatedTag.name,
      color: updatedTag.color,
      created_at: updatedTag.created_at,
      updated_at: updatedTag.updated_at,
    });

  } catch (error: any) {
    console.error('Error updating tag:', error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseInt(id);

  if (isNaN(tagId)) {
    return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
  }

  try {
    // Check if tag exists and belongs to user
    const existingTag = tagDB.getById(session.userId, tagId);
    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get todo count for confirmation message
    const todoCount = tagDB.getTodoCount(tagId);

    // Delete tag (CASCADE will remove from todo_tags)
    const deleted = tagDB.delete(session.userId, tagId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Tag deleted successfully${todoCount > 0 ? ` and removed from ${todoCount} todo(s)` : ''}`,
      todoCount 
    });

  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
