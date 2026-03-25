import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { updateFaceImageCounts } from '@/lib/faceDetection';

/**
 * POST /api/faces/merge-by-name
 * Merge all faces with the same name into a single cluster
 * 
 * Body:
 * - name: string (face name to merge)
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
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    // Find all faces with this name that belong to the current user
    const facesWithName = await prisma.face.findMany({
      where: {
        name: name.trim(),
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
        imageCount: true,
      },
      orderBy: {
        imageCount: 'desc', // Largest cluster first
      },
    });

    if (facesWithName.length < 2) {
      return NextResponse.json({
        message: `Only ${facesWithName.length} face(s) found with name "${name}" - no merge needed`,
        mergedCount: 0,
        targetFaceId: facesWithName[0]?.id,
      });
    }

    // Use the largest cluster as the merge target
    const [targetFace, ...sourcefaces] = facesWithName;
    let mergedCount = 0;

    console.log(
      `Merging ${sourcefaces.length} face cluster(s) into ${targetFace.id} (name: "${name}")`
    );

    // Move all ImageFace relations from source to target
    for (const sourceFace of sourcefaces) {
      const imageFaces = await prisma.imageFace.findMany({
        where: { faceId: sourceFace.id },
      });

      for (const imageFace of imageFaces) {
        // Check if target already has this image
        const existing = await prisma.imageFace.findUnique({
          where: {
            imageId_faceId: {
              imageId: imageFace.imageId,
              faceId: targetFace.id,
            },
          },
        });

        if (!existing) {
          // Move the relation to target
          await prisma.imageFace.update({
            where: {
              imageId_faceId: {
                imageId: imageFace.imageId,
                faceId: sourceFace.id,
              },
            },
            data: { faceId: targetFace.id },
          });
        } else {
          // Delete duplicate if target already has this image
          await prisma.imageFace.delete({
            where: {
              imageId_faceId: {
                imageId: imageFace.imageId,
                faceId: sourceFace.id,
              },
            },
          });
        }
      }

      // Delete source face
      await prisma.face.delete({
        where: { id: sourceFace.id },
      });

      mergedCount++;
    }

    // Update image counts
    await updateFaceImageCounts();

    return NextResponse.json({
      message: `Successfully merged ${mergedCount} face cluster(s) with name "${name}"`,
      mergedCount,
      targetFaceId: targetFace.id,
      finalImageCount: facesWithName.reduce((sum, f) => sum + f.imageCount, 0),
    });
  } catch (error) {
    console.error('Merge by name error:', error);
    return NextResponse.json(
      { error: 'An error occurred during merge' },
      { status: 500 }
    );
  }
}
