import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { detectFacesWithCompreFace } from '@/lib/compreface';

let modelsLoaded = false;
const FACE_SIMILARITY_THRESHOLD = 0.60; // Merge clusters of same person from different angles/lighting/expressions
const MIN_DETECTION_CONFIDENCE = 0.4; // Improve recall for side-profile and low-contrast faces
const MIN_FACE_SIZE_PX = 48;
const MIN_FACE_SIZE_RATIO = 0.035;
const FACE_EDGE_MARGIN_PX = 2;
const MIN_FACE_ASPECT_RATIO = 0.5;
const MAX_FACE_ASPECT_RATIO = 1.8;
const DESCRIPTOR_UPDATE_WEIGHT = 0.2; // Weight for updating cluster descriptors with new faces

export const DEFAULT_RECLUSTER_THRESHOLD = FACE_SIMILARITY_THRESHOLD;

// Clustering statistics
let clusteringStats = {
  totalDetections: 0,
  newClusters: 0,
  matchedClusters: 0,
  lowConfidenceRejected: 0,
};

/**
 * Keep compatibility with existing call sites.
 * CompreFace is an external service, so there are no local model files to load.
 */
export async function loadModels() {
  if (modelsLoaded) return;
  modelsLoaded = true;
}

/**
 * Detect faces in an image buffer
 */
export async function detectFaces(imageBuffer: Buffer) {
  await loadModels();

  try {
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return [];
    }

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const minFaceSize = Math.max(
      MIN_FACE_SIZE_PX,
      Math.round(Math.min(imageWidth, imageHeight) * MIN_FACE_SIZE_RATIO)
    );

    const detections = await detectFacesWithCompreFace(
      imageBuffer,
      MIN_DETECTION_CONFIDENCE
    );

    return detections
      .filter((detection) => {
        const box = detection.box;
        const smallestSide = Math.min(box.width, box.height);
        const aspectRatio = box.width / box.height;
        const touchesImageEdge =
          box.x <= FACE_EDGE_MARGIN_PX ||
          box.y <= FACE_EDGE_MARGIN_PX ||
          box.x + box.width >= imageWidth - FACE_EDGE_MARGIN_PX ||
          box.y + box.height >= imageHeight - FACE_EDGE_MARGIN_PX;

        if (smallestSide < minFaceSize) {
          return false;
        }

        if (
          aspectRatio < MIN_FACE_ASPECT_RATIO ||
          aspectRatio > MAX_FACE_ASPECT_RATIO
        ) {
          return false;
        }

        if (touchesImageEdge) {
          return false;
        }

        if (!hasReliableLandmarks(detection.landmarks, box)) {
          return false;
        }

        return true;
      })
      .map((detection) => ({
        box: detection.box,
        landmarks: detection.landmarks,
        descriptor: detection.descriptor,
        confidence: detection.confidence,
      }));
  } catch (error) {
    console.error('Face detection error:', error);
    return [];
  }
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number');
}

function isLandmarkInOrNearBox(
  landmark: number[],
  box: { x: number; y: number; width: number; height: number }
): boolean {
  if (landmark.length < 2) return false;

  const [x, y] = landmark;
  const marginX = box.width * 0.15;
  const marginY = box.height * 0.15;

  return (
    x >= box.x - marginX &&
    x <= box.x + box.width + marginX &&
    y >= box.y - marginY &&
    y <= box.y + box.height + marginY
  );
}

function hasReliableLandmarks(
  landmarks: number[][] | undefined,
  box: { x: number; y: number; width: number; height: number }
): boolean {
  // Accept if landmarks exist and are reasonably aligned.
  // CompreFace should have already filtered bad detections.
  if (!landmarks || landmarks.length === 0) {
    return true;
  }

  if (landmarks.length < 5) {
    return true;
  }

  const validPoints = landmarks.filter((point) => isLandmarkInOrNearBox(point, box));

  // Require at least some (50%) landmarks to align.
  return validPoints.length >= Math.ceil(landmarks.length * 0.5);
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
export async function clusterFace(
  descriptor: number[],
  confidence: number = 1.0,
  userId?: string
) {
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

  if (normalizedDescriptor.length === 0) {
    clusteringStats.newClusters++;

    const newFace = await prisma.face.create({
      data: {
        faceDescriptor: [],
        thumbnailPath: '/api/faces/pending/thumbnail',
        imageCount: 0,
      },
    });

    return newFace.id;
  }

  // Get existing faces for this user only (via ImageFace -> Image ownership)
  const existingFaces = await prisma.face.findMany({
    where: userId
      ? {
          images: {
            some: {
              image: {
                userId,
              },
            },
          },
        }
      : undefined,
    select: {
      id: true,
      faceDescriptor: true,
      imageCount: true,
    },
  });

  // Find closest matching face
  let closestFace: { id: string; distance: number; imageCount: number } | null = null;

  for (const face of existingFaces) {
    const existingDescriptor = normalizeDescriptor(toNumberArray(face.faceDescriptor));

    if (existingDescriptor.length === 0) {
      continue;
    }

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
      const existingNormalized = normalizeDescriptor(toNumberArray(existingFace.faceDescriptor));

      if (existingNormalized.length === 0) {
        return closestFace.id;
      }
      
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
      thumbnailPath: '/api/faces/pending/thumbnail', // Updated once thumbnail is extracted
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
    const thumbnailPath = `/api/faces/${faceId}/thumbnail`;

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

    await prisma.faceThumbnail.upsert({
      where: { faceId },
      update: {
        data: new Uint8Array(thumbnail),
        mimeType: 'image/jpeg',
      },
      create: {
        faceId,
        data: new Uint8Array(thumbnail),
        mimeType: 'image/jpeg',
      },
    });

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
export async function processImageForFaces(
  imageId: string,
  imageBuffer: Buffer,
  userId?: string
) {
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
    const assignedFaceIdsInImage = new Set<string>();

    // Process each detected face
    for (const face of faces) {
      try {
        // Cluster face to find or create Face record (with confidence filtering)
        const faceId = await clusterFace(face.descriptor, face.confidence, userId);

        // Skip if face was rejected due to low confidence
        if (!faceId) {
          rejectedCount++;
          continue;
        }

        if (assignedFaceIdsInImage.has(faceId)) {
          // We currently store one relation per face per image.
          // Keep the first assignment and ignore additional duplicate detections.
          continue;
        }

        assignedFaceIdsInImage.add(faceId);

        processedCount++;

        // Extract and save thumbnail
        await extractFaceThumbnail(imageBuffer, face.box, faceId);

        // Upsert relationship so repeated detections in the same image don't crash processing
        await prisma.imageFace.upsert({
          where: {
            imageId_faceId: {
              imageId,
              faceId,
            },
          },
          create: {
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
          update: {
            boundingBox: {
              x: face.box.x,
              y: face.box.y,
              width: face.box.width,
              height: face.box.height,
            },
            confidence: face.confidence,
          },
        });
      } catch (faceError) {
        console.error(`Failed to process a detected face for image ${imageId}:`, faceError);
      }
    }

    console.log(
      `✓ Face processing complete for image ${imageId}: ${processedCount} processed, ${rejectedCount} rejected`
    );
  } catch (error) {
    console.error(`Face processing failed for image ${imageId}:`, error);
    // Don't throw - we don't want face detection failures to fail the upload
  } finally {
    await updateFaceImageCounts();
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
  mergeThreshold: number = FACE_SIMILARITY_THRESHOLD,
  userId?: string
): Promise<{ merged: number; clusters: number }> {
  try {
    console.log('Starting face re-clustering...');

    // Get all face clusters
    const allFaces = await prisma.face.findMany({
      where: userId
        ? {
            images: {
              some: {
                image: {
                  userId,
                },
              },
            },
          }
        : undefined,
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

    // Build descriptor lookup once so grouping is deterministic and order-independent.
    const descriptorById = new Map<string, number[]>();
    for (const face of allFaces) {
      const descriptor = normalizeDescriptor(toNumberArray(face.faceDescriptor));
      if (descriptor.length > 0) {
        descriptorById.set(face.id, descriptor);
      }
    }

    const ids = Array.from(descriptorById.keys());
    const parent = new Map<string, string>();

    console.log(
      `Re-clustering with ${ids.length} clusters, threshold: ${mergeThreshold.toFixed(3)}`
    );

    const find = (id: string): string => {
      const currentParent = parent.get(id);
      if (!currentParent || currentParent === id) {
        parent.set(id, id);
        return id;
      }

      const root = find(currentParent);
      parent.set(id, root);
      return root;
    };

    const union = (a: string, b: string) => {
      const rootA = find(a);
      const rootB = find(b);

      if (rootA !== rootB) {
        parent.set(rootB, rootA);
      }
    };

    for (const id of ids) {
      parent.set(id, id);
    }

    // Connect any pair of clusters under threshold, then merge connected components.
    let matchCount = 0;
    const distances: number[] = [];

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id1 = ids[i];
        const id2 = ids[j];
        const desc1 = descriptorById.get(id1)!;
        const desc2 = descriptorById.get(id2)!;

        const distance = euclideanDistance(desc1, desc2);
        distances.push(distance);

        if (distance < mergeThreshold) {
          union(id1, id2);
          matchCount++;
          console.log(
            `  Match: ${id1.slice(0, 8)} <-> ${id2.slice(0, 8)} (distance: ${distance.toFixed(4)})`
          );
        }
      }
    }

    console.log(
      `Compared ${ids.length * (ids.length - 1) / 2} pairs: ${matchCount} matched. Min distance: ${Math.min(...distances).toFixed(4)}, Max: ${Math.max(...distances).toFixed(4)}`
    );

    const groups = new Map<string, string[]>();
    for (const id of ids) {
      const root = find(id);
      const members = groups.get(root) ?? [];
      members.push(id);
      groups.set(root, members);
    }

    const faceById = new Map(allFaces.map((face) => [face.id, face]));
    const clustersToMerge: Array<{ targetId: string; sourceIds: string[] }> = [];

    for (const members of groups.values()) {
      if (members.length < 2) {
        continue;
      }

      const sortedMembers = members
        .map((id) => faceById.get(id))
        .filter((face): face is NonNullable<typeof face> => !!face)
        .sort((a, b) => b.imageCount - a.imageCount);

      if (sortedMembers.length < 2) {
        continue;
      }

      const [target, ...sources] = sortedMembers;
      clustersToMerge.push({
        targetId: target.id,
        sourceIds: sources.map((source) => source.id),
      });
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
