import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // No authentication required - allow all requests
  // Redirect login page to todos (since we don't need login anymore)
  if (request.nextUrl.pathname === '/login') {
    const todosUrl = new URL('/todos', request.url);
    return NextResponse.redirect(todosUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login'],
};
