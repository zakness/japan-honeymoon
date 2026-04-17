const MAX_EDGE = 1600
const JPEG_QUALITY = 0.85
const MAX_BYTES = 10 * 1024 * 1024 // 10MB pre-compress cap
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export class ImageCompressionError extends Error {}

export interface CompressedImage {
  blob: Blob
  extension: string
  mimeType: string
}

/**
 * Resize an image to fit within a 1600px longest-edge box and re-encode as
 * JPEG 0.85. GIFs are passed through untouched (canvas would freeze animation).
 * Throws on unsupported MIME types or files larger than 10MB pre-compression.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!ACCEPTED.has(file.type)) {
    throw new ImageCompressionError(`Unsupported image type: ${file.type || 'unknown'}`)
  }
  if (file.size > MAX_BYTES) {
    throw new ImageCompressionError('Image is larger than 10MB')
  }

  if (file.type === 'image/gif') {
    return { blob: file, extension: 'gif', mimeType: 'image/gif' }
  }

  const bitmap = await loadBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageCompressionError('Canvas 2D context unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) throw new ImageCompressionError('Canvas toBlob returned null')
    return { blob, extension: 'jpg', mimeType: 'image/jpeg' }
  } finally {
    bitmap.close?.()
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  // Fallback for older browsers / test envs without createImageBitmap.
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new ImageCompressionError('Failed to decode image'))
      el.src = url
    })
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => {},
    } as unknown as ImageBitmap
  } finally {
    URL.revokeObjectURL(url)
  }
}

function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(w, h)
  if (longest <= maxEdge) return { width: w, height: h }
  const scale = maxEdge / longest
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}
