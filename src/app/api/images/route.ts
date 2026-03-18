import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

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
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const tagIds = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const faceIds = searchParams.get('faces')?.split(',').filter(Boolean) || [];
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as keyof Prisma.ImageOrderByWithRelationInput;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as Prisma.SortOrder;
    
    // Metadata filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const cameraMake = searchParams.get('cameraMake');
    const cameraModel = searchParams.get('cameraModel');
    const hasGPS = searchParams.get('hasGPS');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ImageWhereInput = {
      userId: session.user.id,
    };

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: {
            in: tagIds,
          },
        },
      };
    }

    // Face filter
    if (faceIds.length > 0) {
      where.faces = {
        some: {
          faceId: {
            in: faceIds,
          },
        },
      };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.dateTaken = {};
      if (dateFrom) {
        where.dateTaken.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add 1 day to include the entire day
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.dateTaken.lte = endDate;
      }
    }

    // Camera filter
    if (cameraMake) {
      where.cameraMake = cameraMake;
    }
    if (cameraModel) {
      where.cameraModel = cameraModel;
    }

    // GPS filter
    if (hasGPS !== null) {
      if (hasGPS === 'true') {
        where.AND = [
          { gpsLatitude: { not: null } },
          { gpsLongitude: { not: null } },
        ];
      } else if (hasGPS === 'false') {
        where.OR = [
          { gpsLatitude: null },
          { gpsLongitude: null },
        ];
      }
    }

    // Get total count
    const total = await prisma.image.count({ where });

    // Get images
    const images = await prisma.image.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      images: images.map((image) => ({
        id: image.id,
        filename: image.filename,
        originalName: image.originalName,
        filepath: image.filepath,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        createdAt: image.createdAt,
        tags: image.tags.map((t) => t.tag),
        // EXIF metadata
        dateTaken: image.dateTaken,
        gpsLatitude: image.gpsLatitude,
        gpsLongitude: image.gpsLongitude,
        cameraMake: image.cameraMake,
        cameraModel: image.cameraModel,
        fNumber: image.fNumber,
        exposureTime: image.exposureTime,
        iso: image.iso,
        focalLength: image.focalLength,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get images error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching images' },
      { status: 500 }
    );
  }
}
