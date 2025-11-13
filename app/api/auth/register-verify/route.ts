import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:3000';

// Import challenges from register-options
let challenges: Map<string, { challenge: string; timestamp: number }>;
import('../register-options/route').then((mod) => {
  challenges = mod.challenges;
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, credential } = body;

    // Validate input
    if (!username || !credential) {
      return NextResponse.json(
        { error: 'Username and credential are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Check if username already registered
    const existingUser = userDB.getByUsername(trimmedUsername);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already registered' },
        { status: 409 }
      );
    }

    // Get stored challenge (need to re-import to get latest reference)
    const { challenges: currentChallenges } = await import('../register-options/route');
    const challengeData = currentChallenges.get(trimmedUsername);
    
    if (!challengeData) {
      return NextResponse.json(
        { error: 'Challenge not found or expired. Please try again.' },
        { status: 400 }
      );
    }

    // Verify registration response
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      return NextResponse.json(
        { error: 'Invalid registration response' },
        { status: 400 }
      );
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    // Create user
    const userId = userDB.create(trimmedUsername);

    // Store authenticator
    const {
      credentialID,
      credentialPublicKey,
      counter,
    } = registrationInfo;

    authenticatorDB.create({
      user_id: userId,
      credential_id: credentialID, // Already base64url string
      public_key: isoBase64URL.fromBuffer(credentialPublicKey),
      counter: counter ?? 0,
    });

    // Clean up challenge
    currentChallenges.delete(trimmedUsername);

    // Create session
    await createSession(userId, trimmedUsername);

    return NextResponse.json({
      success: true,
      username: trimmedUsername,
      userId,
    });
  } catch (error) {
    console.error('Register verify error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
