import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const resultsDir = path.join(process.cwd(), 'results');

function isAuthenticated() {
  const cookieStore = cookies();
  return cookieStore.get('auth')?.value === 'true';
}

function getSafeFilePath(filename: string): string | null {
  const resultsDirResolved = path.resolve(resultsDir);
  const filePathResolved = path.resolve(resultsDir, filename);

  if (!filePathResolved.startsWith(resultsDirResolved) || !filename.endsWith('.json')) {
    return null;
  }
  return filePathResolved;
}

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  if (!isAuthenticated()) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { filename } = params;
  const filePath = getSafeFilePath(filename);

  if (!filePath) {
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
        return new NextResponse(JSON.stringify({ message: 'File not found' }), { status: 404 });
    }
    console.error(`Failed to read file ${filename}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { filename: string } }
) {
  if (!isAuthenticated()) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { filename } = params;
  const filePath = getSafeFilePath(filename);

  if (!filePath) {
    return new NextResponse(JSON.stringify({ message: 'Invalid filename' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    await fs.unlink(filePath);
    revalidatePath('/admin');
    return new NextResponse(JSON.stringify({ message: 'File deleted successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse(JSON.stringify({ message: 'File not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    console.error(`Failed to delete file ${filename}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
