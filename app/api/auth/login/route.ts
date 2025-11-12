import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0) {
      return NextResponse.json({ error: 'Username cannot be empty' }, { status: 400 });
    }

    // Get or create user
    let user = userDB.getByUsername(trimmedUsername);
    
    if (!user) {
      // Create new user
      const userId = userDB.create(trimmedUsername);
      user = { id: userId, username: trimmedUsername };
    }

    // Create session
    await createSession(user.id, user.username);

    return NextResponse.json({ 
      success: true, 
      username: user.username 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
