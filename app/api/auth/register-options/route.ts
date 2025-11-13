import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB } from '@/lib/db';
import { webauthnConfig } from '@/lib/webauthn-config';

const { rpId: RP_ID, rpName: RP_NAME } = webauthnConfig;

// Store challenges temporarily (in-memory, production should use Redis)
const challenges = new Map<string, { challenge: string; timestamp: number }>();

// Clean up old challenges (older than 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [username, data] of challenges.entries()) {
    if (now - data.timestamp > 60000) {
      challenges.delete(username);
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
    
    // Validate username format
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      return NextResponse.json(
        { error: 'Username must be 3-50 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, underscore, and dash' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = userDB.getByUsername(trimmedUsername);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists. Try logging in instead.' },
        { status: 409 }
      );
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: trimmedUsername,
      userDisplayName: trimmedUsername,
      // Attestation preference (none for privacy)
      attestationType: 'none',
      // Authenticator selection
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators
        requireResidentKey: false,
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      // Supported algorithms
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    });

    // Store challenge for verification
    challenges.set(trimmedUsername, {
      challenge: options.challenge,
      timestamp: Date.now(),
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Register options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}

// Export challenges for use in verify endpoint
export { challenges };
