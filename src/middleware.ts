import { type NextRequest, NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  return new NextResponse(null, { status: 404, statusText: 'Not Found' });
}

export const config = {
  matcher: [
    '/.git/:path*',
    '/js/:path*',
    '/chunks/:path*',
    '/wp-admin/:path*',
    '/wp-login.php',
    '/wp-includes/:path*',
    '/wordpress/:path*',
  ],
};
