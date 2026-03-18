import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = join(process.cwd(), 'public', image.filepath);
    const fileBuffer = await readFile(filePath);

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Disposition': `attachment; filename="${image.originalName}"`,
        'Content-Length': image.size.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'An error occurred while downloading the image' },
      { status: 500 }
    );
  }
}
