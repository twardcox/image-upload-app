import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type FaceThumbnailLookup = {
  faceThumbnail: {
    findUnique: (args: {
      where: { faceId: string };
      select: { data: true; mimeType: true };
    }) => Promise<{ data: Uint8Array; mimeType: string } | null>;
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

    const face = await prisma.face.findUnique({
      where: { id: params.id },
      include: {
        images: {
          include: {
            image: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!face) {
      return NextResponse.json(
        { error: 'Face thumbnail not found' },
        { status: 404 }
      );
    }

    const faceThumbnailClient = (prisma as unknown as FaceThumbnailLookup).faceThumbnail;

    const blob = await faceThumbnailClient.findUnique({
      where: { faceId: face.id },
      select: {
        data: true,
        mimeType: true,
      },
    });

    if (!blob) {
      return NextResponse.json(
        { error: 'Face thumbnail not found' },
        { status: 404 }
      );
    }

    const hasAccess = face.images.some(
      (imageFace) => imageFace.image.userId === session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const buffer = Buffer.from(blob.data);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': blob.mimeType || 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Face thumbnail error:', error);
    return NextResponse.json(
      { error: 'An error occurred while loading face thumbnail' },
      { status: 500 }
    );
  }
}
