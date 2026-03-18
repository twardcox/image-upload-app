import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import sharp from 'sharp';

interface RotateRequestBody {
  direction?: 'left' | 'right';
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (image.mimeType === 'image/gif') {
      return NextResponse.json(
        { error: 'Rotating GIF images is not supported yet' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RotateRequestBody;
    const direction = body.direction;

    if (direction !== 'left' && direction !== 'right') {
      return NextResponse.json(
        { error: 'Invalid direction. Use "left" or "right".' },
        { status: 400 }
      );
    }

    const angle = direction === 'left' ? -90 : 90;
    const relativePath = image.filepath.replace(/^\/+/, '');
    const fullPath = join(process.cwd(), 'public', relativePath);

    const fileBuffer = await readFile(fullPath);

    const { data: rotatedBuffer, info } = await sharp(fileBuffer)
      .rotate(angle)
      .toBuffer({ resolveWithObject: true });

    await writeFile(fullPath, rotatedBuffer);

    const updatedImage = await prisma.image.update({
      where: { id: image.id },
      data: {
        size: rotatedBuffer.length,
        width: info.width ?? image.width,
        height: info.height ?? image.height,
      },
    });

    return NextResponse.json({
      image: {
        id: updatedImage.id,
        filename: updatedImage.filename,
        originalName: updatedImage.originalName,
        filepath: updatedImage.filepath,
        mimeType: updatedImage.mimeType,
        size: updatedImage.size,
        width: updatedImage.width,
        height: updatedImage.height,
        createdAt: updatedImage.createdAt,
        updatedAt: updatedImage.updatedAt,
      },
    });
  } catch (error) {
    console.error('Rotate image error:', error);
    return NextResponse.json(
      { error: 'An error occurred while rotating the image' },
      { status: 500 }
    );
  }
}
