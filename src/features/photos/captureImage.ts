/** Longest edge for on-site captures. Keeps uploads small without losing site detail. */
export const MAX_CAPTURE_EDGE = 1920
/** Hard cap before a photo is uploaded. */
export const MAX_UPLOAD_BYTES = 500 * 1024

const QUALITY_STEPS = [0.82, 0.68, 0.54, 0.4, 0.28, 0.18]
const EDGE_STEPS = [1920, 1600, 1280, 1024, 800, 640]

export function scaledCaptureSize(
  width: number,
  height: number,
  maxEdge: number = MAX_CAPTURE_EDGE,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Camera frame is not ready.')
  }

  const longest = Math.max(width, height)
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) }
  }

  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Storage object path inside the photos bucket: `{land_id}/{photo_id}.jpg`. */
export function photoObjectPath(landId: string, photoId: string): string {
  return `${landId}/${photoId}.jpg`
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  capturedAt: number,
  quality: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not compress the photo.'))
          return
        }
        resolve(
          new File([blob], `site-${capturedAt}.jpg`, {
            type: 'image/jpeg',
            lastModified: capturedAt,
          }),
        )
      },
      'image/jpeg',
      quality,
    )
  })
}

function drawFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
): HTMLCanvasElement {
  const size = scaledCaptureSize(width, height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare the photo.')
  }
  context.drawImage(source, 0, 0, size.width, size.height)
  return canvas
}

async function encodeJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  capturedAt: number,
): Promise<File> {
  for (const edge of EDGE_STEPS) {
    const canvas = drawFrame(source, width, height, edge)
    for (const quality of QUALITY_STEPS) {
      const file = await canvasToJpeg(canvas, capturedAt, quality)
      if (file.size < MAX_UPLOAD_BYTES) {
        return file
      }
    }
  }

  throw new Error('Could not compress the photo under 500KB.')
}

/** Compress a live camera frame to JPEG before upload. */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  capturedAt: number = Date.now(),
): Promise<File> {
  return encodeJpeg(video, video.videoWidth, video.videoHeight, capturedAt)
}

/** Re-encode a library image to a bounded JPEG, applying EXIF orientation. */
export async function compressImageFile(
  file: File,
  capturedAt: number = Date.now(),
): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    return await encodeJpeg(bitmap, bitmap.width, bitmap.height, capturedAt)
  } finally {
    bitmap.close()
  }
}
