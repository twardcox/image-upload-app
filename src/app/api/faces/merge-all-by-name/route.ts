import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { updateFaceImageCounts } from '@/lib/faceDetection';

/**
 * POST /api/faces/merge-all-by-name
 * Merge all faces that have the same name (bulk operation for all duplicates)
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

    // Get all named faces for this user
    const namedFaces = await prisma.face.findMany({
      where: {
        name: {
          not: null,
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
        name: true,
        imageCount: true,
      },
    });

    // Group faces by name
    const groupsByName = new Map<string, Array<{ id: string; imageCount: number }>>();
    for (const face of namedFaces) {
      const name = face.name!;
      const group = groupsByName.get(name) ?? [];
      group.push({ id: face.id, imageCount: face.imageCount });
      groupsByName.set(name, group);
    }

    const results: Array<{
      name: string;
      mergedCount: number;
      targetFaceId: string;
      totalImages: number;
    }> = [];

    let totalMerged = 0;

    // Merge each group
    for (const [name, faces] of groupsByName.entries()) {
      if (faces.length < 2) {
        continue;
      }

      // Sort by image count descending
      faces.sort((a, b) => b.imageCount - a.imageCount);

      const [targetFace, ...sourceFaces] = faces;

      console.log(
        `Merging ${sourceFaces.length} cluster(s) with name "${name}" into ${targetFace.id}`
      );

      let mergedInGroup = 0;

      for (const sourceFace of sourceFaces) {
        const imageFaces = await prisma.imageFace.findMany({
          where: { faceId: sourceFace.id },
        });

        for (const imageFace of imageFaces) {
          const existing = await prisma.imageFace.findUnique({
            where: {
              imageId_faceId: {
                imageId: imageFace.imageId,
                faceId: targetFace.id,
              },
            },
          });

          if (!existing) {
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

        await prisma.face.delete({
          where: { id: sourceFace.id },
        });

        mergedInGroup++;
      }

      const totalImages = faces.reduce((sum, f) => sum + f.imageCount, 0);
      results.push({
        name,
        mergedCount: mergedInGroup,
        targetFaceId: targetFace.id,
        totalImages,
      });

      totalMerged += mergedInGroup;
    }

    // Update image counts
    await updateFaceImageCounts();

    return NextResponse.json({
      message: `Merged ${totalMerged} face cluster(s) across ${results.length} name group(s)`,
      totalMerged,
      totalGroups: results.length,
      results,
    });
  } catch (error) {
    console.error('Merge all by name error:', error);
    return NextResponse.json(
      { error: 'An error occurred during bulk merge' },
      { status: 500 }
    );
  }
}
