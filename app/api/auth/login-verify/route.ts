import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:3000';

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

    // Get user
    const user = userDB.getByUsername(trimmedUsername);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get stored challenge
    const { loginChallenges } = await import('../login-options/route');
    const challengeData = loginChallenges.get(trimmedUsername);
    
    if (!challengeData) {
      return NextResponse.json(
        { error: 'Challenge not found or expired. Please try again.' },
        { status: 400 }
      );
    }

    // Get authenticator by credential ID
    const credentialID = credential.id || credential.rawId;
    const authenticator = authenticatorDB.getByCredentialId(credentialID);
    
    if (!authenticator) {
      return NextResponse.json(
        { error: 'Authenticator not found' },
        { status: 404 }
      );
    }

    // Verify authentication response
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: authenticator.credential_id,
          credentialPublicKey: isoBase64URL.toBuffer(authenticator.public_key),
          counter: authenticator.counter ?? 0,
        },
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      return NextResponse.json(
        { error: 'Invalid authentication response' },
        { status: 400 }
      );
    }

    const { verified, authenticationInfo } = verification;

    if (!verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Check counter to prevent replay attacks
    const { newCounter } = authenticationInfo;
    if (newCounter <= (authenticator.counter ?? 0)) {
      return NextResponse.json(
        { error: 'Authenticator counter mismatch. Possible replay attack detected.' },
        { status: 400 }
      );
    }

    // Update authenticator counter
    authenticatorDB.updateCounter(authenticator.credential_id, newCounter);

    // Clean up challenge
    loginChallenges.delete(trimmedUsername);

    // Create session
    await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      username: user.username,
      userId: user.id,
    });
  } catch (error) {
    console.error('Login verify error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
