import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { userDB } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_COOKIE_NAME = 'session';
const DEMO_USER_ID = 1;
const DEMO_USERNAME = 'demo-user';

export interface Session {
  userId: number;
  username: string;
}

/**
 * Ensure demo user exists in database
 */
function ensureDemoUser(): void {
  try {
    let user = userDB.getById(DEMO_USER_ID);
    if (!user) {
      // Create demo user if doesn't exist
      const userId = userDB.create(DEMO_USERNAME);
      console.log('[Auth] Created demo user:', userId);
    }
  } catch (error) {
    console.error('[Auth] Error ensuring demo user:', error);
  }
}

/**
 * Get the current session from cookies
 * Always returns a demo session (auto-login)
 */
export async function getSession(): Promise<Session | null> {
  try {
    // Ensure demo user exists
    ensureDemoUser();

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie) {
      // Auto-create session for demo user
      await createSession(DEMO_USER_ID, DEMO_USERNAME);
      return { userId: DEMO_USER_ID, username: DEMO_USERNAME };
    }

    const decoded = jwt.verify(sessionCookie.value, JWT_SECRET) as Session;
    return decoded;
  } catch (error) {
    // If any error, return demo session
    return { userId: DEMO_USER_ID, username: DEMO_USERNAME };
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
