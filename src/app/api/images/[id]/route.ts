import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface UpdateImageRequestBody {
	tagIds?: string[];
}

export async function GET(
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

		const image = await prisma.image.findFirst({
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
				filepath: `/api/images/${image.id}/content`,
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

export async function PUT(
	request: Request,
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

		const image = await prisma.image.findFirst({
			where: {
				id: params.id,
				userId: session.user.id,
			},
			select: { id: true },
		});

		if (!image) {
			return NextResponse.json(
				{ error: 'Image not found' },
				{ status: 404 }
			);
		}

		const body = (await request.json()) as UpdateImageRequestBody;
		const tagIds = body.tagIds;

		if (!Array.isArray(tagIds)) {
			return NextResponse.json(
				{ error: 'tagIds must be an array' },
				{ status: 400 }
			);
		}

		await prisma.imageTag.deleteMany({
			where: { imageId: image.id },
		});

		if (tagIds.length > 0) {
			const existingTags = await prisma.tag.findMany({
				where: { id: { in: tagIds } },
				select: { id: true },
			});

			const existingTagIds = new Set(existingTags.map((tag) => tag.id));
			const validTagIds = tagIds.filter((tagId) => existingTagIds.has(tagId));

			if (validTagIds.length > 0) {
				await prisma.imageTag.createMany({
					data: validTagIds.map((tagId) => ({
						imageId: image.id,
						tagId,
					})),
					skipDuplicates: true,
				});
			}
		}

		const updatedImage = await prisma.image.findUnique({
			where: { id: image.id },
			include: {
				tags: {
					include: {
						tag: true,
					},
				},
			},
		});

		if (!updatedImage) {
			return NextResponse.json(
				{ error: 'Image not found after update' },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			image: {
				id: updatedImage.id,
				filename: updatedImage.filename,
				originalName: updatedImage.originalName,
				filepath: `/api/images/${updatedImage.id}/content`,
				mimeType: updatedImage.mimeType,
				size: updatedImage.size,
				width: updatedImage.width,
				height: updatedImage.height,
				createdAt: updatedImage.createdAt,
				updatedAt: updatedImage.updatedAt,
				tags: updatedImage.tags.map((t) => t.tag),
			},
		});
	} catch (error) {
		console.error('Update image error:', error);
		return NextResponse.json(
			{ error: 'An error occurred while updating image tags' },
			{ status: 500 }
		);
	}
}

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

		const image = await prisma.image.findFirst({
			where: {
				id: params.id,
				userId: session.user.id,
			},
			select: {
				id: true,
			},
		});

		if (!image) {
			return NextResponse.json(
				{ error: 'Image not found' },
				{ status: 404 }
			);
		}

		await prisma.image.delete({
			where: { id: image.id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Delete image error:', error);
		return NextResponse.json(
			{ error: 'An error occurred while deleting the image' },
			{ status: 500 }
		);
	}
}
