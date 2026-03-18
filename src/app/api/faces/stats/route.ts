import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getClusteringStats, resetClusteringStats } from '@/lib/faceDetection';

/**
 * GET /api/faces/stats
 * Get face clustering statistics
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = getClusteringStats();

    return NextResponse.json({
      stats,
      message: 'Clustering statistics retrieved successfully',
    });
  } catch (error) {
    console.error('Get clustering stats error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching clustering statistics' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faces/stats
 * Reset face clustering statistics
 */
export async function DELETE() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    resetClusteringStats();

    return NextResponse.json({
      message: 'Clustering statistics reset successfully',
    });
  } catch (error) {
    console.error('Reset clustering stats error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting clustering statistics' },
      { status: 500 }
    );
  }
}
