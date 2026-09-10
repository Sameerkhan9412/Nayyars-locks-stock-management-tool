import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch (error) {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('nayyar_session')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname === '/dashboard' ||
    pathname === '/categories' ||
    pathname === '/subcategories' ||
    pathname === '/products' ||
    pathname.startsWith('/products/') ||
    pathname === '/stock-history';

  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (isProtectedRoute) {
    if (!token || isTokenExpired(token)) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('nayyar_session');
      return response;
    }
  }

  if (isAuthRoute) {
    if (token && !isTokenExpired(token)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/categories/:path*',
    '/subcategories/:path*',
    '/products/:path*',
    '/stock-history/:path*',
    '/login',
    '/signup',
  ],
};
