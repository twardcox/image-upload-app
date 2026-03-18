import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * GET /api/faces
 * List all detected faces with thumbnails and image counts
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - search: string (filter by name)
 * - minImages: number (minimum image count filter)
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const minImages = parseInt(searchParams.get('minImages') || '0');

    const skip = (page - 1) * limit;

    // Build where clause - only get faces from user's images
    const where: Prisma.FaceWhereInput = {
      images: {
        some: {
          image: {
            userId: session.user.id,
          },
        },
      },
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (minImages > 0) {
      where.imageCount = {
        gte: minImages,
      };
    }

    // Get total count
    const total = await prisma.face.count({ where });

    // Get faces
    const faces = await prisma.face.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        imageCount: 'desc', // Most common faces first
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

    return NextResponse.json({
      faces: faces.map((face) => ({
        ...face,
        thumbnailPath: `/api/faces/${face.id}/thumbnail`,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get faces error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching faces' },
      { status: 500 }
    );
  }
}
