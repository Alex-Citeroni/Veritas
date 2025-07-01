import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const resultsBaseDir = path.join(process.cwd(), 'results');

function getSafeFilePath(filename: string, username: string): string | null {
  const userResultsDir = path.resolve(resultsBaseDir, username);
  const filePathResolved = path.resolve(userResultsDir, filename);

  if (!filePathResolved.startsWith(userResultsDir) || !filename.endsWith('.json')) {
    return null;
  }
  return filePathResolved;
}

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;
  if (!username) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { filename } = params;
  const filePath = getSafeFilePath(filename, username);

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
    console.error(`Failed to read file ${filename} for user ${username}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;
  if (!username) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { filename } = params;
  const filePath = getSafeFilePath(filename, username);

  if (!filePath) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
  }

  try {
    await fs.unlink(filePath);
    revalidatePath('/admin');
    revalidatePath(`/${username}`);
    return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
    console.error(`Failed to delete file ${filename} for user ${username}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
