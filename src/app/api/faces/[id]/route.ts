import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const AUTO_MERGE_DISTANCE_THRESHOLD = 0.5;

function normalizeDescriptor(descriptor: number[]): number[] {
  const magnitude = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? descriptor.map((val) => val / magnitude) : descriptor;
}

function euclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.sqrt(
    desc1.reduce((sum, val, idx) => sum + Math.pow(val - desc2[idx], 2), 0)
  );
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number');
}

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
      select: {
        id: true,
        faceDescriptor: true,
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

    const normalizedName = name.trim();

    // If name is empty, just clear it (no merge behavior)
    if (!normalizedName) {
      const updatedFace = await prisma.face.update({
        where: { id: params.id },
        data: { name: null },
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
    }

    // Find same-name faces that belong to this user and should be merged.
    const mergeCandidates = await prisma.face.findMany({
      where: {
        id: { not: params.id },
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
        images: {
          some: {
            image: {
              userId: session.user.id,
            },
          },
        },
      },
      select: {
        id: true,
        faceDescriptor: true,
      },
    });

    const targetDescriptor = normalizeDescriptor(toNumberArray(face.faceDescriptor));

    const verifiedMergeCandidates = mergeCandidates.filter((candidate) => {
      const candidateDescriptor = normalizeDescriptor(toNumberArray(candidate.faceDescriptor));

      if (targetDescriptor.length === 0 || candidateDescriptor.length === 0) {
        return false;
      }

      const distance = euclideanDistance(targetDescriptor, candidateDescriptor);
      return distance <= AUTO_MERGE_DISTANCE_THRESHOLD;
    });

    const sourceFaceIds = verifiedMergeCandidates.map((f) => f.id);

    // Merge same-name clusters into the face being renamed.
    const updatedFace = await prisma.$transaction(async (tx) => {
      for (const sourceFaceId of sourceFaceIds) {
        const imageFaces = await tx.imageFace.findMany({
          where: { faceId: sourceFaceId },
        });

        for (const imageFace of imageFaces) {
          const existing = await tx.imageFace.findUnique({
            where: {
              imageId_faceId: {
                imageId: imageFace.imageId,
                faceId: params.id,
              },
            },
          });

          if (!existing) {
            await tx.imageFace.update({
              where: {
                imageId_faceId: {
                  imageId: imageFace.imageId,
                  faceId: sourceFaceId,
                },
              },
              data: {
                faceId: params.id,
              },
            });
          } else {
            await tx.imageFace.delete({
              where: {
                imageId_faceId: {
                  imageId: imageFace.imageId,
                  faceId: sourceFaceId,
                },
              },
            });
          }
        }

        await tx.face.delete({
          where: { id: sourceFaceId },
        });
      }

      const imageCount = await tx.imageFace.count({
        where: { faceId: params.id },
      });

      return tx.face.update({
        where: { id: params.id },
        data: {
          name: normalizedName,
          imageCount,
        },
        select: {
          id: true,
          name: true,
          thumbnailPath: true,
          imageCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json({
      face: updatedFace,
      mergedFaces: sourceFaceIds.length,
      skippedMergeCandidates: mergeCandidates.length - sourceFaceIds.length,
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
