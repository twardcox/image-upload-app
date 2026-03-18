import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      image: {
        id: image.id,
        filename: image.filename,
        originalName: image.originalName,
        filepath: image.filepath,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        tags: image.tags.map((t) => t.tag),
      },
    });
  } catch (error) {
    console.error('Get image error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), 'public', image.filepath);
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue even if file deletion fails
    }

    // Delete from database (cascade will delete tags)
    await prisma.image.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json(
      { message: 'Image deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the image' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tagIds } = await request.json();

    const image = await prisma.image.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Update tags
    if (Array.isArray(tagIds)) {
      // Delete existing tags
      await prisma.imageTag.deleteMany({
        where: {
          imageId: params.id,
        },
      });

      // Create new tag associations
      if (tagIds.length > 0) {
        await prisma.imageTag.createMany({
          data: tagIds.map((tagId: string) => ({
            imageId: params.id,
            tagId,
          })),
        });
      }
    }

    // Fetch updated image
    const updatedImage = await prisma.image.findUnique({
      where: {
        id: params.id,
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
      image: {
        id: updatedImage!.id,
        filename: updatedImage!.filename,
        originalName: updatedImage!.originalName,
        filepath: updatedImage!.filepath,
        mimeType: updatedImage!.mimeType,
        size: updatedImage!.size,
        width: updatedImage!.width,
        height: updatedImage!.height,
        createdAt: updatedImage!.createdAt,
        updatedAt: updatedImage!.updatedAt,
        tags: updatedImage!.tags.map((t) => t.tag),
      },
    });
  } catch (error) {
    console.error('Update image error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the image' },
      { status: 500 }
    );
  }
}
