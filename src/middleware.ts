import { type NextRequest, NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  // Return a 204 No Content response. This is a success status,
  // so it shouldn't be logged as a warning, but it sends no body.
  return new NextResponse(null, { status: 204 });
}

export const config = {
  matcher: [
    '/.git/:path*',
    '/.ssh/:path*',
    '/js/:path*',
    '/chunks/:path*',
    '/wp-admin/:path*',
    '/wp-login.php',
    '/wp-includes/:path*',
    '/wordpress/:path*',
    '/backup.sql',
    '/config/:path*',
    '/config.json',
    '/docker-compose.yml',
    '/etc/:path*',
  ],
};
