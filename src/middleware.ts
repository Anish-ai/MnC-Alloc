import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the token from the session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Check if the user is authenticated
  const isAuthenticated = !!token;
  const isAdmin = token?.role === 'admin';
  
  // Public paths that don't require authentication
  const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/error'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith('/api/'));
  
  // Admin-only paths
  const adminPaths = ['/admin', '/admin/users', '/admin/bookings', '/admin/rooms'];
  const isAdminPath = adminPaths.some(path => pathname === path || pathname.startsWith(path));
  
  // Redirect logic
  if (isPublicPath) {
    // Allow access to public paths
    return NextResponse.next();
  }
  
  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  if (isAdminPath && !isAdmin) {
    // Redirect to dashboard if trying to access admin paths without admin role
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // For all other cases, allow the request
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    // Match all paths except static files, api routes that need to be public, and _next
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 