import { type NextRequest, NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  // Return a 204 No Content response. This is a success status,
  // so it shouldn't be logged as a warning, but it sends no body.
  return new NextResponse(null, { status: 204 });
}

export const config = {
  matcher: [
    // --- Block common sensitive directories
    '/.git/:path*',
    '/.ssh/:path*',
    '/etc/:path*',
    '/vendor/:path*',
    '/node_modules/:path*',
    '/config/:path*',
    '/docker/:path*',
    '/compose/:path*',
    
    // --- Block common CMS / admin tool paths
    '/wp-admin/:path*',
    '/wp-login.php',
    '/wp-includes/:path*',
    '/wordpress/:path*',
    '/phpmyadmin/:path*',
    '/administrator/:path*',

    // --- Block common sensitive file names at any depth (root or subdirectories)
    '/:path*/.env',
    '/:path*/backup.sql',
    '/:path*/config.json',
    '/:path*/docker-compose.yml',
    '/:path*/docker-compose.yaml',
    '/:path*/.docker-compose.yml',
    '/:path*/.docker-compose.yaml',
    '/:path*/docker-compose.override.yml',
    '/:path*/docker-compose.override.yaml',
    
    // --- Block common framework folders that bots scan for
    '/js/:path*',
    '/chunks/:path*',
  ],
};
