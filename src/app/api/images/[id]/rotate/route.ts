import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
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
      include: {
        blob: true,
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
    if (!image.blob) {
      return NextResponse.json(
        { error: 'Image binary data not found' },
        { status: 404 }
      );
    }

    const fileBuffer = Buffer.from(image.blob.data);

    const { data: rotatedBuffer, info } = await sharp(fileBuffer)
      .rotate(angle)
      .toBuffer({ resolveWithObject: true });

    await prisma.imageBlob.upsert({
      where: { imageId: image.id },
      update: { data: new Uint8Array(rotatedBuffer) },
      create: {
        imageId: image.id,
        data: new Uint8Array(rotatedBuffer),
      },
    });

    const updatedImage = await prisma.image.update({
      where: { id: image.id },
      data: {
        filepath: `/api/images/${image.id}/content`,
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
        filepath: `/api/images/${updatedImage.id}/content`,
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
