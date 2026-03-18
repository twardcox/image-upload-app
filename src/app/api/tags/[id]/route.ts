import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tag = (await prisma.tag.findUnique({
      where: { id: params.id },
    })) as { id: string; createdByUserId: string | null } | null;

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    if (!tag.createdByUserId || tag.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the user who created this tag can delete it' },
        { status: 403 }
      );
    }

    await prisma.tag.delete({
      where: { id: tag.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the tag' },
      { status: 500 }
    );
  }
}
