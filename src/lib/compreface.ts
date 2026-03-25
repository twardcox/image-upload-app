import sharp from 'sharp';

const COMPREFACE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30000;

interface CompreFaceBox {
  probability: number;
  x_max: number;
  y_max: number;
  x_min: number;
  y_min: number;
}

interface CompreFaceDetectFace {
  box?: CompreFaceBox;
  embedding?: number[];
  landmarks?: number[][];
}

interface CompreFaceDetectResponse {
  result?: CompreFaceDetectFace[];
}

export interface CompreFaceDetection {
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
  descriptor: number[];
  landmarks?: number[][];
}

function getCompreFaceConfig() {
  const baseUrl = process.env.COMPREFACE_BASE_URL?.trim();
  const apiKey = process.env.COMPREFACE_DETECTION_API_KEY?.trim();

  if (!baseUrl) {
    throw new Error('Missing COMPREFACE_BASE_URL environment variable');
  }

  if (!apiKey) {
    throw new Error('Missing COMPREFACE_DETECTION_API_KEY environment variable');
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
  };
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

async function fitImageForCompreFace(imageBuffer: Buffer): Promise<Buffer> {
  if (imageBuffer.length <= COMPREFACE_MAX_IMAGE_BYTES) {
    return imageBuffer;
  }

  let resized = await sharp(imageBuffer)
    .rotate()
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  if (resized.length <= COMPREFACE_MAX_IMAGE_BYTES) {
    return resized;
  }

  resized = await sharp(resized)
    .jpeg({ quality: 70 })
    .toBuffer();

  if (resized.length <= COMPREFACE_MAX_IMAGE_BYTES) {
    return resized;
  }

  throw new Error('Image exceeds CompreFace 5MB request limit even after compression');
}

export async function detectFacesWithCompreFace(
  imageBuffer: Buffer,
  minConfidence: number
): Promise<CompreFaceDetection[]> {
  const { baseUrl, apiKey } = getCompreFaceConfig();
  const requestBuffer = await fitImageForCompreFace(imageBuffer);

  const params = new URLSearchParams({
    det_prob_threshold: String(minConfidence),
    face_plugins: 'calculator,landmarks,face_recognition',
    limit: '0',
    status: 'false',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/detection/detect?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ file: requestBuffer.toString('base64') }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = (await response.json()) as CompreFaceDetectResponse;

  if (!response.ok) {
    throw new Error(
      `CompreFace detection request failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  const faces = payload.result ?? [];

  return faces
    .filter((face) => face.box)
    .map((face) => {
      const box = face.box as CompreFaceBox;
      const descriptor = isNumberArray(face.embedding) ? face.embedding : [];
      const landmarks = Array.isArray(face.landmarks) ? face.landmarks : undefined;

      return {
        box: {
          x: box.x_min,
          y: box.y_min,
          width: box.x_max - box.x_min,
          height: box.y_max - box.y_min,
        },
        confidence: box.probability,
        descriptor,
        landmarks,
      };
    })
    .filter((face) => face.box.width > 0 && face.box.height > 0);
}
