import { type NextRequest, NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  // Return a 204 No Content response. This is a success status,
  // so it shouldn't be logged as a warning, but it sends no body.
  return new NextResponse(null, { status: 204 });
}

export const config = {
  matcher: [
    // Sensitive directories and files often scanned by bots
    '/.git/:path*',
    '/.ssh/:path*',
    '/.env',
    '/:path+/.env', // Catches .env in subdirectories like /backend/.env
    '/etc/:path*',
    
    // Common framework/dependency directories
    '/vendor/:path*',
    '/node_modules/:path*',
    '/js/:path*',
    '/chunks/:path*',
    
    // Common CMS paths
    '/wp-admin/:path*',
    '/wp-login.php',
    '/wp-includes/:path*',
    '/wordpress/:path*',
    '/phpmyadmin/:path*',
    '/administrator/:path*',

    // Common backup and config files
    '/backup.sql',
    '/config.json',
    '/config/:path*',
    '/docker-compose.yml',
    '/docker-compose.yaml',
    '/.docker-compose.yml',
    '/.docker-compose.yaml',
    '/docker-compose.override.yml',
    '/docker-compose.override.yaml',
    '/docker/:path*',
    '/compose/:path*',
  ],
};
