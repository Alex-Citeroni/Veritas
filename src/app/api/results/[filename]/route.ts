import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get('auth')?.value === 'true';

  if (!isAuthenticated) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { filename } = params;
  const resultsDir = path.join(process.cwd(), 'results');
  const filePath = path.join(resultsDir, filename);

  // Security check to prevent path traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(resultsDir)) || !filename.endsWith('.json')) {
    return new NextResponse('Invalid filename', { status: 400 });
  }

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new NextResponse(fileContent, { status: 200, headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new NextResponse('File not found', { status: 404 });
    }
    console.error(`Failed to read file ${filename}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
