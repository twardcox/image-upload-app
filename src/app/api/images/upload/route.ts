import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import exifr from 'exifr';
import { processImageForFaces } from '@/lib/faceDetection';

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

    // Extract EXIF metadata from original image
    let exifData: {
      dateTaken?: Date;
      gpsLatitude?: number;
      gpsLongitude?: number;
      cameraMake?: string;
      cameraModel?: string;
      fNumber?: number;
      exposureTime?: string;
      iso?: number;
      focalLength?: number;
    } = {};

    try {
      const exif = await exifr.parse(buffer, {
        pick: [
          'DateTimeOriginal',
          'CreateDate',
          'GPSLatitude',
          'GPSLongitude',
          'Make',
          'Model',
          'FNumber',
          'ExposureTime',
          'ISO',
          'FocalLength',
        ],
      });

      if (exif) {
        exifData = {
          dateTaken: exif.DateTimeOriginal || exif.CreateDate || undefined,
          gpsLatitude: exif.GPSLatitude || undefined,
          gpsLongitude: exif.GPSLongitude || undefined,
          cameraMake: exif.Make || undefined,
          cameraModel: exif.Model || undefined,
          fNumber: exif.FNumber || undefined,
          exposureTime: exif.ExposureTime ? String(exif.ExposureTime) : undefined,
          iso: exif.ISO || undefined,
          focalLength: exif.FocalLength || undefined,
        };
      }
    } catch (exifError) {
      console.warn('EXIF extraction failed (non-critical):', exifError);
      // Continue even if EXIF extraction fails
    }

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
    } catch {
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
        // EXIF metadata
        dateTaken: exifData.dateTaken || null,
        gpsLatitude: exifData.gpsLatitude || null,
        gpsLongitude: exifData.gpsLongitude || null,
        cameraMake: exifData.cameraMake || null,
        cameraModel: exifData.cameraModel || null,
        fNumber: exifData.fNumber || null,
        exposureTime: exifData.exposureTime || null,
        iso: exifData.iso || null,
        focalLength: exifData.focalLength || null,
      },
    });

    // Trigger async face detection (non-blocking)
    // Use optimized buffer for face detection since it's smaller and faster
    processImageForFaces(image.id, optimizedBuffer).catch((error) => {
      console.error('Async face detection error:', error);
      // Don't fail the upload if face detection fails
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
        // Include EXIF metadata in response
        dateTaken: image.dateTaken,
        gpsLatitude: image.gpsLatitude,
        gpsLongitude: image.gpsLongitude,
        cameraMake: image.cameraMake,
        cameraModel: image.cameraModel,
      },
    }, { status: 201 });

  } catch (_error) {
    console.error('Upload error:', _error);
    return NextResponse.json(
      { error: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}
