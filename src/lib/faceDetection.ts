// Face Detection Service using face-api.js
import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData } from 'canvas';
import sharp from 'sharp';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { prisma } from '@/lib/prisma';

let modelsLoaded = false;
let environmentPatched = false;
const MODEL_PATH = join(process.cwd(), 'public', 'models');
const FACE_THUMBNAIL_DIR = join(process.cwd(), 'public', 'faces');
const FACE_SIMILARITY_THRESHOLD = 0.6; // Euclidean distance threshold for clustering

/**
 * Initialize face-api.js environment for Node.js
 */
function initializeEnvironment() {
  if (environmentPatched) return;
  // Patch face-api.js to use node-canvas
  // @ts-expect-error - face-api.js types don't include monkeyPatch
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  environmentPatched = true;
}

/**
 * Load face-api.js models (only loads once)
 */
export async function loadModels() {
  if (modelsLoaded) return;

  initializeEnvironment();

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
    ]);
    modelsLoaded = true;
    console.log('✓ Face detection models loaded successfully');
  } catch (error) {
    console.error('Failed to load face detection models:', error);
    throw new Error('Face detection models not available');
  }
}

/**
 * Detect faces in an image buffer
 */
export async function detectFaces(imageBuffer: Buffer) {
  await loadModels();

  try {
    // Convert buffer to Image using node-canvas
    const img = new Image();
    img.src = imageBuffer;

    // Detect faces with landmarks and descriptors
    const detections = await faceapi
      .detectAllFaces(img as unknown as HTMLImageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections.map((detection) => ({
      box: detection.detection.box,
      landmarks: detection.landmarks,
      descriptor: Array.from(detection.descriptor), // Convert Float32Array to regular array
      confidence: detection.detection.score,
    }));
  } catch (error) {
    console.error('Face detection error:', error);
    return [];
  }
}

/**
 * Calculate euclidean distance between two face descriptors
 */
function euclideanDistance(desc1: number[], desc2: number[]): number {
  return Math.sqrt(
    desc1.reduce((sum, val, idx) => sum + Math.pow(val - desc2[idx], 2), 0)
  );
}

/**
 * Find matching face cluster or create new one
 */
export async function clusterFace(descriptor: number[]) {
  // Get all existing faces
  const existingFaces = await prisma.face.findMany({
    select: {
      id: true,
      faceDescriptor: true,
    },
  });

  // Find closest matching face
  let closestFace: { id: string; distance: number } | null = null;

  for (const face of existingFaces) {
    const existingDescriptor = face.faceDescriptor as number[];
    const distance = euclideanDistance(descriptor, existingDescriptor);

    if (
      distance < FACE_SIMILARITY_THRESHOLD &&
      (!closestFace || distance < closestFace.distance)
    ) {
      closestFace = { id: face.id, distance };
    }
  }

  // If we found a match, return existing face ID
  if (closestFace) {
    return closestFace.id;
  }

  // Otherwise, create a new face cluster
  const newFace = await prisma.face.create({
    data: {
      faceDescriptor: descriptor,
      thumbnailPath: '', // Will be updated when thumbnail is extracted
      imageCount: 0, // Will be updated by database triggers or manually
    },
  });

  return newFace.id;
}

/**
 * Extract and save face thumbnail
 */
export async function extractFaceThumbnail(
  imageBuffer: Buffer,
  box: { x: number; y: number; width: number; height: number },
  faceId: string
): Promise<string> {
  try {
    // Ensure faces directory exists
    await mkdir(FACE_THUMBNAIL_DIR, { recursive: true });

    // Add padding around face (20%)
    const padding = 0.2;
    const paddedX = Math.max(0, box.x - box.width * padding);
    const paddedY = Math.max(0, box.y - box.height * padding);
    const paddedWidth = box.width * (1 + 2 * padding);
    const paddedHeight = box.height * (1 + 2 * padding);

    // Crop and resize face to thumbnail
    const thumbnail = await sharp(imageBuffer)
      .extract({
        left: Math.round(paddedX),
        top: Math.round(paddedY),
        width: Math.round(paddedWidth),
        height: Math.round(paddedHeight),
      })
      .resize(150, 150, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const thumbnailFilename = `${faceId}.jpg`;
    const thumbnailPath = `/faces/${thumbnailFilename}`;
    const fullPath = join(FACE_THUMBNAIL_DIR, thumbnailFilename);

    await writeFile(fullPath, thumbnail);

    // Update Face record with thumbnail path
    await prisma.face.update({
      where: { id: faceId },
      data: { thumbnailPath },
    });

    return thumbnailPath;
  } catch (error) {
    console.error('Face thumbnail extraction error:', error);
    return '';
  }
}

/**
 * Process image for face detection and clustering
 * This runs asynchronously after image upload
 */
export async function processImageForFaces(imageId: string, imageBuffer: Buffer) {
  try {
    console.log(`Starting face detection for image ${imageId}...`);

    // Detect faces
    const faces = await detectFaces(imageBuffer);

    if (faces.length === 0) {
      console.log(`No faces detected in image ${imageId}`);
      return;
    }

    console.log(`Detected ${faces.length} face(s) in image ${imageId}`);

    // Process each detected face
    for (const face of faces) {
      // Cluster face to find or create Face record
      const faceId = await clusterFace(face.descriptor);

      // Extract and save thumbnail
      await extractFaceThumbnail(imageBuffer, face.box, faceId);

      // Create ImageFace relationship
      await prisma.imageFace.create({
        data: {
          imageId,
          faceId,
          boundingBox: {
            x: face.box.x,
            y: face.box.y,
            width: face.box.width,
            height: face.box.height,
          },
          confidence: face.confidence,
        },
      });
    }

    // Update face image counts
    await updateFaceImageCounts();

    console.log(`✓ Face processing complete for image ${imageId}`);
  } catch (error) {
    console.error(`Face processing failed for image ${imageId}:`, error);
    // Don't throw - we don't want face detection failures to fail the upload
  }
}

/**
 * Update imageCount for all faces
 */
export async function updateFaceImageCounts() {
  try {
    const faces = await prisma.face.findMany({
      include: {
        _count: {
          select: { images: true },
        },
      },
    });

    for (const face of faces) {
      await prisma.face.update({
        where: { id: face.id },
        data: { imageCount: face._count.images },
      });
    }
  } catch (error) {
    console.error('Failed to update face image counts:', error);
  }
}
