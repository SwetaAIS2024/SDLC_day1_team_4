import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await getSession();
  
  // Protected routes
  const protectedPaths = ['/', '/todos', '/calendar'];
  const isProtected = protectedPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(path + '/')
  );

  if (isProtected && !session) {
    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (request.nextUrl.pathname === '/login' && session) {
    const todosUrl = new URL('/todos', request.url);
    return NextResponse.redirect(todosUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/todos/:path*', '/calendar/:path*', '/login'],
};
