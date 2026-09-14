import { detectVideoFormat, readVideoDuration, inspectVideoBuffer } from './video-file'

// ---------------------------------------------------------------------------
// MP4 (ISO BMFF) helpers
// ---------------------------------------------------------------------------

function ftypBox(brand: string): Buffer {
  const buf = Buffer.alloc(16)
  buf.writeUInt32BE(16, 0)
  buf.write('ftyp', 4, 'latin1')
  const padded = brand.padEnd(4).slice(0, 4)
  buf.write(padded, 8, 'latin1')
  return buf
}

function mvhdBoxV0(timescale: number, duration: number): Buffer {
  const buf = Buffer.alloc(28)
  buf.writeUInt32BE(28, 0)
  buf.write('mvhd', 4, 'latin1')
  // version 0 + flags (4 zero bytes) at 8-11
  // creation time at 12-15 (zero)
  // modification time at 16-19 (zero)
  buf.writeUInt32BE(timescale, 20)
  buf.writeUInt32BE(duration, 24)
  return buf
}

function buildMp4(brand: string, timescale: number, duration: number): Buffer {
  const mvhd = mvhdBoxV0(timescale, duration)
  const moovHeader = Buffer.alloc(8)
  moovHeader.writeUInt32BE(8 + mvhd.length, 0)
  moovHeader.write('moov', 4, 'latin1')
  const moov = Buffer.concat([moovHeader, mvhd])
  return Buffer.concat([ftypBox(brand), moov])
}

// ---------------------------------------------------------------------------
// WebM (EBML / Matroska) helpers
// ---------------------------------------------------------------------------

const ELEM_DOC_TYPE = [0x42, 0x82] as const
const ELEM_TIMECODE_SCALE = [0x2a, 0xd7, 0xb1] as const
const ELEM_DURATION = [0x44, 0x89] as const
const ELEM_INFO = [0x15, 0x49, 0xa9, 0x66] as const
const ELEM_SEGMENT = [0x18, 0x53, 0x80, 0x67] as const

function vintSize(value: number): Buffer {
  if (value < 0x80) return Buffer.from([0x80 | value])
  throw new Error('use single-byte sizes in tests only')
}

function element(idBytes: readonly number[], data: Buffer): Buffer {
  return Buffer.concat([Buffer.from(idBytes), vintSize(data.length), data])
}

function uint32be(value: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(value, 0)
  return buf
}

function doubleBE(value: number): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeDoubleBE(value, 0)
  return buf
}

function buildWebm(seconds: number, timecodeScale: number): Buffer {
  const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
  const ebmlHeader = Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    vintSize(docType.length),
    docType,
  ])

  // Duration is in timecode units: element × TimecodeScale = ns, so a real
  // 300s video (timecodeScale 1e6) stores 300_000.0.
  const durationFloat = (seconds * 1e9) / timecodeScale

  const infoBody = Buffer.concat([
    element(ELEM_TIMECODE_SCALE, uint32be(timecodeScale)),
    element(ELEM_DURATION, doubleBE(durationFloat)),
  ])
  const info = element(ELEM_INFO, infoBody)
  const segment = element(ELEM_SEGMENT, info)
  return Buffer.concat([ebmlHeader, segment])
}

// ---------------------------------------------------------------------------
// AVI (RIFF) helpers
// ---------------------------------------------------------------------------

function uint32le(n: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(n, 0)
  return buf
}

function buildAvi(microPerFrame: number, totalFrames: number): Buffer {
  const avih = Buffer.alloc(20)
  avih.writeUInt32LE(microPerFrame, 0)
  avih.writeUInt32LE(totalFrames, 16)
  const avihChunk = Buffer.concat([Buffer.from('avih', 'latin1'), uint32le(avih.length), avih])
  const hdrl = Buffer.concat([
    Buffer.from('LIST', 'latin1'),
    uint32le(4 + avihChunk.length),
    Buffer.from('hdrl', 'latin1'),
    avihChunk,
  ])
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    uint32le(4 + hdrl.length),
    Buffer.from('AVI ', 'latin1'),
    hdrl,
  ])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('video-file', () => {
  // ---- MP4 (ISO BMFF) ----
  describe('MP4', () => {
    it('detectVideoFormat returns mp4 for brand isom', () => {
      const buf = buildMp4('isom', 1000, 300000)
      expect(detectVideoFormat(buf)).toBe('mp4')
    })

    it('detectVideoFormat returns mov for brand qt  ', () => {
      const buf = buildMp4('qt  ', 1000, 300000)
      expect(detectVideoFormat(buf)).toBe('mov')
    })

    it('readVideoDuration returns 300 for timescale 1000 / duration 300000', () => {
      const buf = buildMp4('isom', 1000, 300000)
      expect(readVideoDuration(buf, 'mp4')).toBe(300)
    })

    it('readVideoDuration returns null when mvhd is absent', () => {
      // Only ftyp, no moov → no mvhd
      const buf = ftypBox('isom')
      expect(readVideoDuration(buf, 'mp4')).toBeNull()
    })

    it('readVideoDuration returns null when timescale is 0', () => {
      const buf = buildMp4('isom', 0, 0)
      expect(readVideoDuration(buf, 'mp4')).toBeNull()
    })

    it('inspectVideoBuffer returns format and duration for a valid buffer', () => {
      const buf = buildMp4('isom', 1000, 300000)
      expect(inspectVideoBuffer(buf)).toEqual({ format: 'mp4', durationSeconds: 300 })
    })
  })

  // ---- WebM (EBML / Matroska) ----
  describe('WebM', () => {
    it('detectVideoFormat returns webm for a valid WebM buffer', () => {
      const buf = buildWebm(300, 1_000_000)
      expect(detectVideoFormat(buf)).toBe('webm')
    })

    it('detectVideoFormat returns null when DocType is matroska', () => {
      const docType = element(ELEM_DOC_TYPE, Buffer.from('matroska', 'latin1'))
      const ebmlHeader = Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        vintSize(docType.length),
        docType,
      ])
      const buf = Buffer.concat([ebmlHeader])
      expect(detectVideoFormat(buf)).toBeNull()
    })

    it('readVideoDuration returns 300 for 300s with timecodeScale 1000000', () => {
      const buf = buildWebm(300, 1_000_000)
      expect(readVideoDuration(buf, 'webm')).toBe(300)
    })

    it('readVideoDuration returns null when Info element is absent', () => {
      // Build a valid EBML header and segment, but the segment body is empty
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const ebmlHeader = Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        vintSize(docType.length),
        docType,
      ])
      const emptySegment = element(ELEM_SEGMENT, Buffer.alloc(0))
      const buf = Buffer.concat([ebmlHeader, emptySegment])
      expect(readVideoDuration(buf, 'webm')).toBeNull()
    })

    it('inspectVideoBuffer returns format and duration for a valid buffer', () => {
      const buf = buildWebm(300, 1_000_000)
      expect(inspectVideoBuffer(buf)).toEqual({ format: 'webm', durationSeconds: 300 })
    })
  })

  // ---- AVI (RIFF) ----
  describe('AVI', () => {
    it('detectVideoFormat returns avi', () => {
      const buf = buildAvi(40000, 7500)
      expect(detectVideoFormat(buf)).toBe('avi')
    })

    it('readVideoDuration returns 300 for microPerFrame 40000 / totalFrames 7500', () => {
      const buf = buildAvi(40000, 7500)
      expect(readVideoDuration(buf, 'avi')).toBe(300)
    })

    it('readVideoDuration returns null when microPerFrame is 0', () => {
      const buf = buildAvi(0, 7500)
      expect(readVideoDuration(buf, 'avi')).toBeNull()
    })

    it('inspectVideoBuffer returns format and duration for a valid buffer', () => {
      const buf = buildAvi(40000, 7500)
      expect(inspectVideoBuffer(buf)).toEqual({ format: 'avi', durationSeconds: 300 })
    })
  })

  // ---- Unknown format ----
  describe('unknown format', () => {
    it('detectVideoFormat returns null for non-video data', () => {
      expect(detectVideoFormat(Buffer.from('not a video'))).toBeNull()
    })

    it('inspectVideoBuffer returns null for garbage', () => {
      expect(inspectVideoBuffer(Buffer.from('not a video'))).toBeNull()
    })
  })

  // ---- Over-limit (format recognized but duration > 300s) ----
  describe('over-limit duration', () => {
    it('readVideoDuration returns 600.001 for mp4 with 600001 ms / timescale 1000', () => {
      const buf = buildMp4('isom', 1000, 600001)
      expect(readVideoDuration(buf, 'mp4')).toBe(600.001)
    })
  })
})
