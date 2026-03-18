import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
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
      images: images.map((image: any) => ({
        id: image.id,
        filename: image.filename,
        originalName: image.originalName,
        filepath: image.filepath,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        createdAt: image.createdAt,
        tags: image.tags.map((t: any) => t.tag),
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
