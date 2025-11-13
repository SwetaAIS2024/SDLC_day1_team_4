import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { webauthnConfig } from '@/lib/webauthn-config';

const { rpId: RP_ID } = webauthnConfig;

// Store challenges temporarily (in-memory, production should use Redis)
const loginChallenges = new Map<string, { challenge: string; timestamp: number }>();

// Clean up old challenges (older than 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [username, data] of loginChallenges.entries()) {
    if (now - data.timestamp > 60000) {
      loginChallenges.delete(username);
    }
  }
}, 30000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    // Validate username
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Check if user exists
    const user = userDB.getByUsername(trimmedUsername);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's authenticators
    const authenticators = authenticatorDB.getByUserId(user.id);
    if (authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No authenticators registered for this user' },
        { status: 404 }
      );
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      timeout: 60000,
      allowCredentials: authenticators.map((auth) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      userVerification: 'preferred',
    });

    // Store challenge for verification
    loginChallenges.set(trimmedUsername, {
      challenge: options.challenge,
      timestamp: Date.now(),
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Login options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate login options' },
      { status: 500 }
    );
  }
}

// Export challenges for use in verify endpoint
export { loginChallenges };
