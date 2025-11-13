import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const counts = todoDB.getCountByPriority(session.userId);
    return NextResponse.json(counts, { status: 200 });
  } catch (error) {
    console.error('Error fetching priority counts:', error);
    return NextResponse.json({ error: 'Failed to fetch priority counts' }, { status: 500 });
  }
}
