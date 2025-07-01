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
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
  }

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new NextResponse(fileContent, { status: 200, headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
    console.error(`Failed to read file ${filename}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { filename: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { filename } = params;
  const filePath = getSafeFilePath(filename);

  if (!filePath) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
  }

  try {
    await fs.unlink(filePath);
    revalidatePath('/admin');
    return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
    console.error(`Failed to delete file ${filename}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
