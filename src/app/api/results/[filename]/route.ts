import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

const resultsBaseDir = path.join(process.cwd(), 'results');

function getSafeFilePath(filename: string, username: string): string | null {
  const userResultsDir = path.resolve(resultsBaseDir, username);
  const filePathResolved = path.resolve(userResultsDir, filename);

  if (!filePathResolved.startsWith(userResultsDir) || !filename.endsWith('.md')) {
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
    
    let downloadFilename = filename;
    // Filename format on disk: {pollId(36)}-{title}-{timestamp(19)}.md
    // We want the downloaded filename to be: {title}-{timestamp}.md
    const pollIdLength = 36;
    const timestampLength = 19;
    const extensionLength = 3; // .md
    // 2 for the hyphens around the title
    const minLength = pollIdLength + 1 + 1 + timestampLength + 1 + extensionLength;

    if (filename.length >= minLength) {
        // Extract title which is between the pollId and the timestamp
        const title = filename.substring(pollIdLength + 1, filename.length - timestampLength - 1 - extensionLength);
        // Extract timestamp
        const timestamp = filename.substring(filename.length - timestampLength - extensionLength, filename.length - extensionLength);
        downloadFilename = `${title}-${timestamp}.md`;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/markdown; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
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
    return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
    console.error(`Failed to delete file ${filename} for user ${username}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
