import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { reclusterAllFaces } from '@/lib/faceDetection';

/**
 * POST /api/faces/recluster
 * Trigger re-clustering of all faces to merge similar clusters
 * 
 * Body:
 * - threshold?: number (optional custom similarity threshold, default 0.6)
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

    const body = await request.json().catch(() => ({}));
    const { threshold } = body;

    // Validate threshold if provided
    if (threshold !== undefined) {
      if (typeof threshold !== 'number' || threshold <= 0 || threshold > 1) {
        return NextResponse.json(
          { error: 'Threshold must be a number between 0 and 1' },
          { status: 400 }
        );
      }
    }

    // Run re-clustering
    const result = await reclusterAllFaces(threshold);

    return NextResponse.json({
      message: 'Face re-clustering completed',
      result: {
        mergedClusters: result.merged,
        remainingClusters: result.clusters,
        thresholdUsed: threshold || 0.6,
      },
    });
  } catch (error) {
    console.error('Re-clustering error:', error);
    return NextResponse.json(
      { error: 'An error occurred during re-clustering' },
      { status: 500 }
    );
  }
}
