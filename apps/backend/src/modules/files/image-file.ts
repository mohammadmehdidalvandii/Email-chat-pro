/**
 * Pure image-header inspection (Task 4.1 — image upload validation).
 *
 * architecture.md §File Upload Validation requires the backend to enforce
 * supported image formats AND pixel dimensions (100×100–5000×5000). Instead of
 * adding an image-processing dependency (none is in stack.md — decision 2 in
 * current-task.md), the format and dimensions are sniffed from the file's
 * magic bytes and header fields:
 *
 *   - PNG  — 8-byte signature; width/height at bytes 16/20 (big-endian).
 *   - GIF  — "GIF87a"/"GIF89a"; width/height at bytes 6/8 (little-endian).
 *   - JPEG — 0xFFD8FF start; dimension fields parsed by walking the marker
 *            segments until the SOF marker that carries frame width/height.
 *   - WebP — "RIFF"…"WEBP"; dimensions depend on the chunk: VP8X (extended),
 *            VP8 (lossy), or VP8L (lossless).
 *
 * The client-supplied `Content-Type` is deliberately NOT trusted here — it is
 * easy to spoof. The magic bytes are the authoritative format signal; the multer
 * fileFilter only uses the mime type as a cheap pre-filter.
 */

export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp'

/** Format + pixel dimensions parsed from an image file header. */
export interface ImageFileInfo {
  format: ImageFormat
  width: number
  height: number
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Returns the format and dimensions of `buffer` when it is a recognized image
 * (JPEG, PNG, GIF, or WebP), or null when it is not one of those formats.
 */
export function inspectImageBuffer(buffer: Buffer): ImageFileInfo | null {
  const png = inspectPng(buffer)
  if (png) return png
  const gif = inspectGif(buffer)
  if (gif) return gif
  const jpeg = inspectJpeg(buffer)
  if (jpeg) return jpeg
  return inspectWebp(buffer)
}

/** Maps a parsed format to its canonical MIME type. */
export function mimeTypeForFormat(format: ImageFormat): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
  }
}

function inspectPng(buffer: Buffer): ImageFileInfo | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null
  }
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (width === 0 || height === 0) return null
  return { format: 'png', width, height }
}

function inspectGif(buffer: Buffer): ImageFileInfo | null {
  if (buffer.length < 10) return null
  const header = buffer.toString('latin1', 0, 6)
  if (header !== 'GIF87a' && header !== 'GIF89a') return null
  const width = buffer.readUInt16LE(6)
  const height = buffer.readUInt16LE(8)
  if (width === 0 || height === 0) return null
  return { format: 'gif', width, height }
}

function inspectJpeg(buffer: Buffer): ImageFileInfo | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    return null
  }

  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]

    // Standalone markers that carry no segment length.
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }
    // Restart markers (RST0..RST7) also have no length field.
    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 2
      continue
    }
    // SOS: everything after is entropy-coded. If no SOF was found by now the
    // header is non-conforming (SOF always precedes SOS in a valid file).
    if (marker === 0xda) break
    if (offset + 4 > buffer.length) break

    const length = buffer.readUInt16BE(offset + 2)
    // SOF0..SOF15 (excluding DHT 0xc4, JPG 0xc8, DAC 0xcc) carry the frame
    // height at offset+5 and width at offset+7.
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isStartOfFrame && offset + 9 <= buffer.length) {
      const height = buffer.readUInt16BE(offset + 5)
      const width = buffer.readUInt16BE(offset + 7)
      if (width === 0 || height === 0) return null
      return { format: 'jpeg', width, height }
    }
    if (length < 2) break
    offset += 2 + length
  }

  return null
}

function inspectWebp(buffer: Buffer): ImageFileInfo | null {
  if (
    buffer.length < 12 ||
    buffer.toString('latin1', 0, 4) !== 'RIFF' ||
    buffer.toString('latin1', 8, 12) !== 'WEBP'
  ) {
    return null
  }
  const chunkTag = buffer.toString('latin1', 12, 16)

  // Each chunk format needs a different minimum header size to be readable.
  if (chunkTag === 'VP8X' && buffer.length >= 30) {
    // Extended format: 24-bit canvas dimensions at bytes 24-29, each minus 1.
    const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16))
    const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16))
    if (width <= 0 || height <= 0) return null
    return { format: 'webp', width, height }
  }

  if (chunkTag === 'VP8 ' && buffer.length >= 30) {
    // Lossy format: frame starts with the 0x9d 0x01 0x2a sync code at bytes
    // 23-25; the 14-bit dimensions follow at bytes 26-29.
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null
    const b0 = buffer[26]
    const b1 = buffer[27]
    const b2 = buffer[28]
    const b3 = buffer[29]
    const width = (b0 | ((b1 & 0x3f) << 8)) & 0x3fff
    const height = ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)) & 0x3fff
    if (width === 0 || height === 0) return null
    return { format: 'webp', width, height }
  }

  if (chunkTag === 'VP8L' && buffer.length >= 25) {
    // Lossless format: 14-bit dimensions minus 1 at bytes 21-24.
    const b0 = buffer[21]
    const b1 = buffer[22]
    const b2 = buffer[23]
    const b3 = buffer[24]
    const width = 1 + (b0 | ((b1 & 0x3f) << 8))
    const height = 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10))
    if (width <= 0 || height <= 0) return null
    return { format: 'webp', width, height }
  }

  return null
}
