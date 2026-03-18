import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/faces/[id]
 * Get single face details with all associated images
 */
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

    const face = await prisma.face.findUnique({
      where: {
        id: params.id,
      },
      include: {
        images: {
          include: {
            image: {
              select: {
                id: true,
                filename: true,
                filepath: true,
                width: true,
                height: true,
                createdAt: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!face) {
      return NextResponse.json(
        { error: 'Face not found' },
        { status: 404 }
      );
    }

    // Verify user has access to at least one image with this face
    const hasAccess = face.images.some(
      (imageFace) => imageFace.image.userId === session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Filter images to only show user's images
    const userImages = face.images
      .filter((imageFace) => imageFace.image.userId === session.user.id)
      .map((imageFace) => ({
        ...imageFace.image,
        boundingBox: imageFace.boundingBox,
        confidence: imageFace.confidence,
      }));

    return NextResponse.json({
      face: {
        id: face.id,
        name: face.name,
        thumbnailPath: face.thumbnailPath,
        imageCount: userImages.length,
        createdAt: face.createdAt,
        updatedAt: face.updatedAt,
        images: userImages,
      },
    });
  } catch (error) {
    console.error('Get face error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the face' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/faces/[id]
 * Update face name
 */
export async function PUT(
  request: NextRequest,
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

    const body = await request.json();
    const { name } = body;

    if (typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name must be a string' },
        { status: 400 }
      );
    }

    // Verify face exists and user has access
    const face = await prisma.face.findUnique({
      where: { id: params.id },
      include: {
        images: {
          include: {
            image: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!face) {
      return NextResponse.json(
        { error: 'Face not found' },
        { status: 404 }
      );
    }

    // Verify user has access to at least one image with this face
    const hasAccess = face.images.some(
      (imageFace) => imageFace.image.userId === session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update face name
    const updatedFace = await prisma.face.update({
      where: { id: params.id },
      data: { name: name || null },
      select: {
        id: true,
        name: true,
        thumbnailPath: true,
        imageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      face: updatedFace,
    });
  } catch (error) {
    console.error('Update face error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the face' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faces/[id]
 * Delete a face cluster (removes all ImageFace relations)
 */
export async function DELETE(
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

    // Verify face exists and user has access
    const face = await prisma.face.findUnique({
      where: { id: params.id },
      include: {
        images: {
          include: {
            image: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!face) {
      return NextResponse.json(
        { error: 'Face not found' },
        { status: 404 }
      );
    }

    // Verify user has access to at least one image with this face
    const hasAccess = face.images.some(
      (imageFace) => imageFace.image.userId === session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the face (cascade will remove ImageFace relations)
    await prisma.face.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Face deleted successfully',
    });
  } catch (error) {
    console.error('Delete face error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the face' },
      { status: 500 }
    );
  }
}
