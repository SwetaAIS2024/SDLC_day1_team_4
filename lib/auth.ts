/**
 * Authentication and Session Management
 * Full WebAuthn implementation will be in PRP-11
 * This is a stub for Todo CRUD operations (PRP-01)
 */

export interface Session {
  userId: number;
  username: string;
}

/**
 * Get current session from JWT cookie
 * TODO: Implement full JWT verification in PRP-11
 * For now, returns a mock session for development
 */
export async function getSession(): Promise<Session | null> {
  // In production, this will:
  // 1. Read 'session' cookie
  // 2. Verify JWT signature
  // 3. Check expiration
  // 4. Return decoded session data
  
  // For PRP-01 development, return mock session
  // This allows testing CRUD operations before auth is implemented
  return {
    userId: 1,
    username: 'dev-user',
  };
}

/**
 * Create session and set JWT cookie
 * TODO: Implement in PRP-11
 */
export async function createSession(userId: number, username: string): Promise<void> {
  // Will implement JWT creation and cookie setting in PRP-11
  throw new Error('createSession not yet implemented - see PRP-11');
}

/**
 * Clear session cookie
 * TODO: Implement in PRP-11
 */
export async function clearSession(): Promise<void> {
  // Will implement cookie clearing in PRP-11
  throw new Error('clearSession not yet implemented - see PRP-11');
}
