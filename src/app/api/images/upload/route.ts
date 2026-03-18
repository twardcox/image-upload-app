import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1440;

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with sharp
    let processedImage = sharp(buffer);
    const metadata = await processedImage.metadata();

    // Resize if necessary
    if (metadata.width && metadata.height) {
      if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
        processedImage = processedImage.resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }

    // Optimize image
    if (file.type === 'image/jpeg') {
      processedImage = processedImage.jpeg({ quality: 85 });
    } else if (file.type === 'image/png') {
      processedImage = processedImage.png({ quality: 85 });
    } else if (file.type === 'image/webp') {
      processedImage = processedImage.webp({ quality: 85 });
    }

    const optimizedBuffer = await processedImage.toBuffer();
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${fileExtension}`;
    const filepath = `/uploads/${filename}`;
    const fullPath = join(UPLOAD_DIR, filename);

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Save file to disk
    await writeFile(fullPath, optimizedBuffer);

    // Save metadata to database
    const image = await prisma.image.create({
      data: {
        filename,
        originalName: file.name,
        filepath,
        mimeType: file.type,
        size: optimizedBuffer.length,
        width: optimizedMetadata.width || null,
        height: optimizedMetadata.height || null,
        userId: session.user.id,
      },
    });

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
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}
