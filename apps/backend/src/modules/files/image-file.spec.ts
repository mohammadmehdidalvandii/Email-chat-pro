import { ImageFormat, inspectImageBuffer, mimeTypeForFormat } from './image-file'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function buildPng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  Buffer.from(PNG_SIGNATURE).copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'latin1')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

function buildGif(width: number, height: number): Buffer {
  const buf = Buffer.alloc(10)
  buf.write('GIF89a', 0, 'latin1')
  buf.writeUInt16LE(width, 6)
  buf.writeUInt16LE(height, 8)
  return buf
}

function buildJpeg(width: number, height: number): Buffer {
  // Proper segment layout so the parser's marker walk reaches the SOF0 frame:
  //   SOI(2) + APP0(FF E0, len 16) + SOF0(FF C0, len 17) at byte offset 20.
  const buf = Buffer.alloc(30)
  buf[0] = 0xff
  buf[1] = 0xd8 // SOI
  buf[2] = 0xff
  buf[3] = 0xe0 // APP0 (payload left zero)
  buf.writeUInt16BE(16, 4)
  buf[20] = 0xff
  buf[21] = 0xc0 // SOF0
  buf.writeUInt16BE(17, 22)
  buf[24] = 8 // precision
  buf.writeUInt16BE(height, 25)
  buf.writeUInt16BE(width, 27)
  buf[29] = 3 // components
  return buf
}

function buildWebpLossy(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30)
  buf.write('RIFF', 0, 'latin1')
  buf.writeUInt32LE(26, 4)
  buf.write('WEBP', 8, 'latin1')
  buf.write('VP8 ', 12, 'latin1')
  buf.writeUInt32LE(14, 16)
  buf[23] = 0x9d
  buf[24] = 0x01
  buf[25] = 0x2a
  const w = width & 0x3fff
  const h = height & 0x3fff
  buf[26] = w & 0xff
  buf[27] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6)
  buf[28] = (h >> 2) & 0xff
  buf[29] = (h >> 10) & 0x0f
  return buf
}

function buildWebpLossless(width: number, height: number): Buffer {
  const buf = Buffer.alloc(25)
  buf.write('RIFF', 0, 'latin1')
  buf.writeUInt32LE(21, 4)
  buf.write('WEBP', 8, 'latin1')
  buf.write('VP8L', 12, 'latin1')
  buf.writeUInt32LE(9, 16)
  const w = width - 1
  const h = height - 1
  buf[21] = w & 0xff
  buf[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6)
  buf[23] = (h >> 2) & 0xff
  buf[24] = (h >> 10) & 0x0f
  return buf
}

function buildWebpVp8x(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30)
  buf.write('RIFF', 0, 'latin1')
  buf.writeUInt32LE(26, 4)
  buf.write('WEBP', 8, 'latin1')
  buf.write('VP8X', 12, 'latin1')
  buf.writeUInt32LE(10, 16)
  const w = width - 1
  const h = height - 1
  buf[24] = w & 0xff
  buf[25] = (w >> 8) & 0xff
  buf[26] = (w >> 16) & 0xff
  buf[27] = h & 0xff
  buf[28] = (h >> 8) & 0xff
  buf[29] = (h >> 16) & 0xff
  return buf
}

describe('inspectImageBuffer', () => {
  it('detects a valid PNG with its dimensions', () => {
    const info = inspectImageBuffer(buildPng(800, 600))
    expect(info).toEqual({ format: 'png', width: 800, height: 600 })
  })

  it('detects a valid GIF with its dimensions', () => {
    const info = inspectImageBuffer(buildGif(640, 480))
    expect(info).toEqual({ format: 'gif', width: 640, height: 480 })
  })

  it('detects a valid JPEG with its dimensions', () => {
    const info = inspectImageBuffer(buildJpeg(1024, 768))
    expect(info).toEqual({ format: 'jpeg', width: 1024, height: 768 })
  })

  it('detects a lossy WebP with its dimensions', () => {
    const info = inspectImageBuffer(buildWebpLossy(800, 600))
    expect(info).toEqual({ format: 'webp', width: 800, height: 600 })
  })

  it('detects a lossless WebP with its dimensions', () => {
    const info = inspectImageBuffer(buildWebpLossless(800, 600))
    expect(info).toEqual({ format: 'webp', width: 800, height: 600 })
  })

  it('detects an extended VP8X WebP with its canvas dimensions', () => {
    const info = inspectImageBuffer(buildWebpVp8x(800, 600))
    expect(info).toEqual({ format: 'webp', width: 800, height: 600 })
  })

  it('returns null for a non-image buffer', () => {
    expect(inspectImageBuffer(Buffer.from('just some text, not an image' as string))).toBeNull()
  })

  it('returns null for an empty buffer', () => {
    expect(inspectImageBuffer(Buffer.alloc(0))).toBeNull()
  })

  it('returns null for a truncated PNG signature', () => {
    expect(inspectImageBuffer(buildPng(800, 600).subarray(0, 7))).toBeNull()
  })

  it('returns null for a PNG with zero dimensions', () => {
    expect(inspectImageBuffer(buildPng(0, 600))).toBeNull()
  })

  it('returns null for a JPEG with no SOF marker (SOI + EOI only)', () => {
    expect(inspectImageBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull()
  })

  it('returns null for a GIF with zero width', () => {
    expect(inspectImageBuffer(buildGif(0, 480))).toBeNull()
  })
})

describe('mimeTypeForFormat', () => {
  it('maps every supported format to its canonical MIME type', () => {
    const expected: Record<ImageFormat, string> = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    for (const format of ['jpeg', 'png', 'gif', 'webp'] as const) {
      expect(mimeTypeForFormat(format)).toBe(expected[format])
    }
  })
})
