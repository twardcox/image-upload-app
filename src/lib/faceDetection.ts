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
const MIN_DETECTION_CONFIDENCE = 0.5; // Minimum confidence for face detection
const DESCRIPTOR_UPDATE_WEIGHT = 0.2; // Weight for updating cluster descriptors with new faces

// Clustering statistics
let clusteringStats = {
  totalDetections: 0,
  newClusters: 0,
  matchedClusters: 0,
  lowConfidenceRejected: 0,
};

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
 * Normalize face descriptor to unit length
 * This helps with descriptor comparison consistency
 */
function normalizeDescriptor(descriptor: number[]): number[] {
  const magnitude = Math.sqrt(
    descriptor.reduce((sum, val) => sum + val * val, 0)
  );
  return magnitude > 0 ? descriptor.map((val) => val / magnitude) : descriptor;
}

/**
 * Calculate weighted average of two descriptors
 * Used to update face cluster representative descriptor
 */
function averageDescriptors(
  desc1: number[],
  desc2: number[],
  weight: number = 0.5
): number[] {
  return desc1.map((val, idx) => val * (1 - weight) + desc2[idx] * weight);
}

/**
 * Get clustering statistics for monitoring
 */
export function getClusteringStats() {
  return { ...clusteringStats };
}

/**
 * Reset clustering statistics
 */
export function resetClusteringStats() {
  clusteringStats = {
    totalDetections: 0,
    newClusters: 0,
    matchedClusters: 0,
    lowConfidenceRejected: 0,
  };
}

/**
 * Find matching face cluster or create new one
 * Enhanced with descriptor normalization and cluster descriptor updating
 */
export async function clusterFace(descriptor: number[], confidence: number = 1.0) {
  clusteringStats.totalDetections++;

  // Reject low-confidence detections
  if (confidence < MIN_DETECTION_CONFIDENCE) {
    clusteringStats.lowConfidenceRejected++;
    console.log(
      `Rejected low-confidence face detection: ${confidence.toFixed(3)} < ${MIN_DETECTION_CONFIDENCE}`
    );
    return null;
  }

  // Normalize descriptor for consistent comparison
  const normalizedDescriptor = normalizeDescriptor(descriptor);

  // Get all existing faces
  const existingFaces = await prisma.face.findMany({
    select: {
      id: true,
      faceDescriptor: true,
      imageCount: true,
    },
  });

  // Find closest matching face
  let closestFace: { id: string; distance: number; imageCount: number } | null = null;

  for (const face of existingFaces) {
    const existingDescriptor = normalizeDescriptor(face.faceDescriptor as number[]);
    const distance = euclideanDistance(normalizedDescriptor, existingDescriptor);

    if (
      distance < FACE_SIMILARITY_THRESHOLD &&
      (!closestFace || distance < closestFace.distance)
    ) {
      closestFace = { id: face.id, distance, imageCount: face.imageCount };
    }
  }

  // If we found a match, update the cluster descriptor with weighted average
  if (closestFace) {
    clusteringStats.matchedClusters++;
    
    console.log(
      `Matched face to existing cluster ${closestFace.id} (distance: ${closestFace.distance.toFixed(4)}, images: ${closestFace.imageCount})`
    );

    // Update cluster descriptor with weighted average
    // Give more weight to the existing descriptor if the cluster has many images
    const existingFace = existingFaces.find((f) => f.id === closestFace!.id);
    if (existingFace) {
      const existingNormalized = normalizeDescriptor(existingFace.faceDescriptor as number[]);
      
      // Weight decreases as cluster grows (more stable clusters change less)
      const updateWeight = Math.min(
        DESCRIPTOR_UPDATE_WEIGHT,
        1.0 / Math.max(closestFace.imageCount, 1)
      );
      
      const updatedDescriptor = averageDescriptors(
        existingNormalized,
        normalizedDescriptor,
        updateWeight
      );

      // Update the face descriptor in database
      await prisma.face.update({
        where: { id: closestFace.id },
        data: { faceDescriptor: updatedDescriptor },
      });
    }

    return closestFace.id;
  }

  // Otherwise, create a new face cluster
  clusteringStats.newClusters++;
  
  console.log(
    `Created new face cluster (confidence: ${confidence.toFixed(3)})`
  );

  const newFace = await prisma.face.create({
    data: {
      faceDescriptor: normalizedDescriptor,
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

    let processedCount = 0;
    let rejectedCount = 0;

    // Process each detected face
    for (const face of faces) {
      // Cluster face to find or create Face record (with confidence filtering)
      const faceId = await clusterFace(face.descriptor, face.confidence);

      // Skip if face was rejected due to low confidence
      if (!faceId) {
        rejectedCount++;
        continue;
      }

      processedCount++;

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

    console.log(
      `✓ Face processing complete for image ${imageId}: ${processedCount} processed, ${rejectedCount} rejected`
    );
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

/**
 * Re-cluster all faces to find and merge similar clusters
 * This is useful after manual corrections or to improve clustering over time
 */
export async function reclusterAllFaces(
  mergeThreshold: number = FACE_SIMILARITY_THRESHOLD
): Promise<{ merged: number; clusters: number }> {
  try {
    console.log('Starting face re-clustering...');

    // Get all face clusters
    const allFaces = await prisma.face.findMany({
      select: {
        id: true,
        faceDescriptor: true,
        imageCount: true,
      },
      orderBy: {
        imageCount: 'desc', // Process larger clusters first
      },
    });

    if (allFaces.length < 2) {
      console.log('Not enough face clusters to re-cluster');
      return { merged: 0, clusters: allFaces.length };
    }

    let mergedCount = 0;
    const processedIds = new Set<string>();
    const clustersToMerge: Array<{ targetId: string; sourceIds: string[] }> = [];

    // Find clusters that should be merged
    for (let i = 0; i < allFaces.length; i++) {
      const face1 = allFaces[i];
      
      if (processedIds.has(face1.id)) continue;

      const desc1 = normalizeDescriptor(face1.faceDescriptor as number[]);
      const similarFaces: string[] = [];

      for (let j = i + 1; j < allFaces.length; j++) {
        const face2 = allFaces[j];
        
        if (processedIds.has(face2.id)) continue;

        const desc2 = normalizeDescriptor(face2.faceDescriptor as number[]);
        const distance = euclideanDistance(desc1, desc2);

        if (distance < mergeThreshold) {
          similarFaces.push(face2.id);
          processedIds.add(face2.id);
        }
      }

      if (similarFaces.length > 0) {
        clustersToMerge.push({
          targetId: face1.id,
          sourceIds: similarFaces,
        });
        processedIds.add(face1.id);
      }
    }

    // Perform merges
    for (const merge of clustersToMerge) {
      console.log(
        `Merging ${merge.sourceIds.length} cluster(s) into ${merge.targetId}`
      );

      for (const sourceId of merge.sourceIds) {
        // Move all ImageFace relations to target
        const imageFaces = await prisma.imageFace.findMany({
          where: { faceId: sourceId },
        });

        for (const imageFace of imageFaces) {
          // Check if target already has this image
          const existing = await prisma.imageFace.findUnique({
            where: {
              imageId_faceId: {
                imageId: imageFace.imageId,
                faceId: merge.targetId,
              },
            },
          });

          if (!existing) {
            await prisma.imageFace.update({
              where: {
                imageId_faceId: {
                  imageId: imageFace.imageId,
                  faceId: sourceId,
                },
              },
              data: { faceId: merge.targetId },
            });
          } else {
            // Delete duplicate
            await prisma.imageFace.delete({
              where: {
                imageId_faceId: {
                  imageId: imageFace.imageId,
                  faceId: sourceId,
                },
              },
            });
          }
        }

        // Delete source face
        await prisma.face.delete({
          where: { id: sourceId },
        });

        mergedCount++;
      }
    }

    // Update image counts for affected faces
    await updateFaceImageCounts();

    const remainingClusters = allFaces.length - mergedCount;
    console.log(
      `✓ Re-clustering complete: merged ${mergedCount} cluster(s), ${remainingClusters} remaining`
    );

    return { merged: mergedCount, clusters: remainingClusters };
  } catch (error) {
    console.error('Face re-clustering failed:', error);
    throw error;
  }
}
