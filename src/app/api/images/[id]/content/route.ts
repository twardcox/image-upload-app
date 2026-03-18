import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type ImageBlobLookup = {
  imageBlob: {
    findUnique: (args: {
      where: { imageId: string };
      select: { data: true };
    }) => Promise<{ data: Uint8Array } | null>;
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const image = await prisma.image.findFirst({
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

    const imageBlobClient = (prisma as unknown as ImageBlobLookup).imageBlob;

    const blob = await imageBlobClient.findUnique({
      where: { imageId: image.id },
      select: { data: true },
    });

    if (!blob) {
      return NextResponse.json(
        { error: 'Image content not found' },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(blob.data);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': image.size.toString(),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image content error:', error);
    return NextResponse.json(
      { error: 'An error occurred while loading image content' },
      { status: 500 }
    );
  }
}
