import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { processImageForFaces } from '@/lib/faceDetection';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/faces/detect
 * Manually trigger face detection on one or more images
 * 
 * Body:
 * - imageId: string (single image)
 * - imageIds: string[] (batch processing)
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
    const { imageId, imageIds } = body;

    // Validate input
    if (!imageId && (!imageIds || !Array.isArray(imageIds))) {
      return NextResponse.json(
        { error: 'Either imageId or imageIds array is required' },
        { status: 400 }
      );
    }

    const idsToProcess = imageId ? [imageId] : imageIds;

    // Verify all images exist and belong to user
    const images = await prisma.image.findMany({
      where: {
        id: { in: idsToProcess },
        userId: session.user.id,
      },
      select: {
        id: true,
        filepath: true,
      },
    });

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found' },
        { status: 404 }
      );
    }

    if (images.length !== idsToProcess.length) {
      return NextResponse.json(
        { error: 'Some images not found or access denied' },
        { status: 403 }
      );
    }

    // Process face detection for each image
    const results = await Promise.allSettled(
      images.map(async (image) => {
        try {
          // Read image file (normalize leading slash for cross-platform safety)
          const normalizedFilepath = image.filepath.replace(/^\/+/, '');
          const imagePath = join(process.cwd(), 'public', normalizedFilepath);
          const imageBuffer = await readFile(imagePath);

          // Clear existing face records to avoid duplicates on re-run
          await prisma.imageFace.deleteMany({ where: { imageId: image.id } });

          // Process faces
          await processImageForFaces(image.id, imageBuffer, session.user.id);

          // Get face count for this image
          const faceCount = await prisma.imageFace.count({
            where: { imageId: image.id },
          });

          return {
            imageId: image.id,
            success: true,
            facesDetected: faceCount,
          };
        } catch (error) {
          console.error(`Face detection failed for image ${image.id}:`, error);
          return {
            imageId: image.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Compile results
    const processed = results.map((result) =>
      result.status === 'fulfilled' ? result.value : result.reason
    );

    const successful = processed.filter((r) => r.success).length;
    const failed = processed.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Face detection completed`,
      summary: {
        total: processed.length,
        successful,
        failed,
      },
      results: processed,
    });
  } catch (error) {
    console.error('Face detection API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during face detection' },
      { status: 500 }
    );
  }
}
