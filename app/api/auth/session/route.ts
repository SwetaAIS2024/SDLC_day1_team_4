import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Always return demo session (authentication bypassed)
    const session = await getSession();

    return NextResponse.json({
      authenticated: true,
      userId: session?.userId || 1,
      username: session?.username || 'Demo User',
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    // Even on error, return demo session
    return NextResponse.json({
      authenticated: true,
      userId: 1,
      username: 'Demo User',
    });
  }
}
