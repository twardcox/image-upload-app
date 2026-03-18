import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { reclusterAllFaces } from '@/lib/faceDetection';

/**
 * POST /api/faces/merge
 * Merge multiple face clusters into one
 * 
 * Body:
 * - sourceFaceIds: string[] (face IDs to merge from)
 * - targetFaceId: string (face ID to merge into)
 * - newName?: string (optional name for merged face)
 * - autoRecluster?: boolean (optional, trigger re-clustering after merge)
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sourceFaceIds, targetFaceId, newName, autoRecluster } = body;

    // Validate input
    if (!Array.isArray(sourceFaceIds) || sourceFaceIds.length === 0) {
      return NextResponse.json(
        { error: 'sourceFaceIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!targetFaceId || typeof targetFaceId !== 'string') {
      return NextResponse.json(
        { error: 'targetFaceId is required' },
        { status: 400 }
      );
    }

    // Verify all faces exist
    const allFaceIds = [...sourceFaceIds, targetFaceId];
    const faces = await prisma.face.findMany({
      where: {
        id: { in: allFaceIds },
      },
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

    if (faces.length !== allFaceIds.length) {
      return NextResponse.json(
        { error: 'One or more faces not found' },
        { status: 404 }
      );
    }

    // Verify user has access to all faces
    const hasAccess = faces.every((face) =>
      face.images.some((imageFace) => imageFace.image.userId === session.user.id)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to one or more faces' },
        { status: 403 }
      );
    }

    // Perform merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update all ImageFace records from source faces to target face
      for (const sourceFaceId of sourceFaceIds) {
        // Get all ImageFace relations for this source face
        const imageFaces = await tx.imageFace.findMany({
          where: { faceId: sourceFaceId },
        });

        // Move each relation to target face (or skip if already exists)
        for (const imageFace of imageFaces) {
          // Check if target face already has a relation with this image
          const existing = await tx.imageFace.findUnique({
            where: {
              imageId_faceId: {
                imageId: imageFace.imageId,
                faceId: targetFaceId,
              },
            },
          });

          if (!existing) {
            // Move the relation to target face
            await tx.imageFace.update({
              where: {
                imageId_faceId: {
                  imageId: imageFace.imageId,
                  faceId: imageFace.faceId,
                },
              },
              data: {
                faceId: targetFaceId,
              },
            });
          } else {
            // If already exists, just delete the duplicate
            await tx.imageFace.delete({
              where: {
                imageId_faceId: {
                  imageId: imageFace.imageId,
                  faceId: imageFace.faceId,
                },
              },
            });
          }
        }

        // Delete the source face
        await tx.face.delete({
          where: { id: sourceFaceId },
        });
      }

      // Update target face image count
      const imageCount = await tx.imageFace.count({
        where: { faceId: targetFaceId },
      });

      // Update target face with new count and optional name
      const updatedFace = await tx.face.update({
        where: { id: targetFaceId },
        data: {
          imageCount,
          ...(newName !== undefined && { name: newName || null }),
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

      return updatedFace;
    });

    // Optionally trigger re-clustering after merge
    let reclusterResult = null;
    if (autoRecluster === true) {
      console.log('Auto-reclustering triggered after merge...');
      try {
        reclusterResult = await reclusterAllFaces();
      } catch (error) {
        console.error('Auto-recluster failed:', error);
        // Don't fail the merge if re-clustering fails
      }
    }

    return NextResponse.json({
      message: 'Faces merged successfully',
      face: {
        ...result,
        thumbnailPath: `/api/faces/${result.id}/thumbnail`,
      },
      ...(reclusterResult && {
        recluster: {
          merged: reclusterResult.merged,
          remainingClusters: reclusterResult.clusters,
        },
      }),
    });
  } catch (error) {
    console.error('Merge faces error:', error);
    return NextResponse.json(
      { error: 'An error occurred while merging faces' },
      { status: 500 }
    );
  }
}
