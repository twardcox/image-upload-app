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

    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            images: true,
          },
        },
      },
    });

    return NextResponse.json({
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        imageCount: tag._count.images,
      })),
    });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching tags' },
      { status: 500 }
    );
  }
}

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

    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Normalize tag name
    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length === 0) {
      return NextResponse.json(
        { error: 'Tag name cannot be empty' },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: {
        name: normalizedName,
      },
    });

    if (existingTag) {
      return NextResponse.json({
        tag: {
          id: existingTag.id,
          name: existingTag.name,
        },
      });
    }

    // Create new tag
    const tag = await prisma.tag.create({
      data: {
        name: normalizedName,
      },
    });

    return NextResponse.json(
      {
        tag: {
          id: tag.id,
          name: tag.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the tag' },
      { status: 500 }
    );
  }
}
