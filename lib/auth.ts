import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_COOKIE_NAME = 'session';

export interface Session {
  userId: number;
  username: string;
}

/**
 * Get the current session from cookies
 * Returns null if no valid session exists
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie) {
      return null;
    }

    const decoded = jwt.verify(sessionCookie.value, JWT_SECRET) as Session;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new session for a user
 * Sets a secure HTTP-only cookie
 */
export async function createSession(userId: number, username: string): Promise<void> {
  const token = jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear the current session
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Development helper: Get or create a default user session
 * This is a stub for development - replace with WebAuthn in production
 */
export async function getOrCreateDevSession(): Promise<Session> {
  const session = await getSession();
  if (session) {
    return session;
  }

  // For development, auto-create a user if none exists
  const { userDB } = await import('./db');
  let user = userDB.getByUsername('dev-user');
  
  if (!user) {
    const userId = userDB.create('dev-user');
    user = { id: userId, username: 'dev-user' };
  }

  await createSession(user.id, user.username);
  return { userId: user.id, username: user.username };
}
