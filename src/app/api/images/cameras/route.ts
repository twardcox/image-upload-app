import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get unique camera combinations with counts
    const cameras = await prisma.image.groupBy({
      by: ['cameraMake', 'cameraModel'],
      where: {
        AND: [
          { cameraMake: { not: null } },
          { cameraModel: { not: null } },
        ],
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    const formattedCameras = cameras.map((camera) => ({
      make: camera.cameraMake!,
      model: camera.cameraModel!,
      count: camera._count.id,
    }));

    return NextResponse.json({ cameras: formattedCameras });
  } catch (error) {
    console.error('Failed to fetch cameras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}
