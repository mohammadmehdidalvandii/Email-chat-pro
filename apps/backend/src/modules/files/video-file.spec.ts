import {
  detectVideoFormat,
  inspectVideoBuffer,
  mimeTypeForVideoFormat,
  readVideoDuration,
  type VideoFormat,
} from './video-file'

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

/**
 * Builds an element whose size VINT declares `declaredSize` regardless of how
 * many payload bytes are actually appended — the shape a truncated file has.
 */
function elementWithDeclaredSize(
  idBytes: readonly number[],
  declaredSize: number,
  data: Buffer,
): Buffer {
  return Buffer.concat([Buffer.from(idBytes), Buffer.from([0x80 | declaredSize]), data])
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

    // Regression (P0-3): a truncated WebM whose Info declares an 8-byte
    // Duration that is not actually present used to make readInfoDuration call
    // buffer.readDoubleBE past the end, throwing a RangeError that escaped
    // uploadVideo as a 500 instead of a VIDEO_DURATION_INVALID 400.
    it('readVideoDuration returns null (not RangeError) for a truncated Duration payload', () => {
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const ebmlHeader = Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        vintSize(docType.length),
        docType,
      ])
      const duration = elementWithDeclaredSize(ELEM_DURATION, 8, Buffer.alloc(0))
      const segment = element(ELEM_SEGMENT, element(ELEM_INFO, duration))
      const truncated = Buffer.concat([ebmlHeader, segment])

      expect(detectVideoFormat(truncated)).toBe('webm')
      expect(() => readVideoDuration(truncated, 'webm')).not.toThrow()
      expect(readVideoDuration(truncated, 'webm')).toBeNull()
      expect(inspectVideoBuffer(truncated)).toBeNull()
    })

    it('readVideoDuration returns null (not RangeError) for a truncated TimecodeScale payload', () => {
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const ebmlHeader = Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        vintSize(docType.length),
        docType,
      ])
      // Declares 8 bytes, supplies 1 → readBigUInt64BE would read past the end.
      const scale = elementWithDeclaredSize(ELEM_TIMECODE_SCALE, 8, Buffer.from([0x0f]))
      const segment = element(ELEM_SEGMENT, element(ELEM_INFO, scale))
      const truncated = Buffer.concat([ebmlHeader, segment])

      expect(() => readVideoDuration(truncated, 'webm')).not.toThrow()
      expect(readVideoDuration(truncated, 'webm')).toBeNull()
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

// ---------------------------------------------------------------------------
// P2 — header hardening.
//
// The ≤5-minute guarantee in architecture.md §File Upload Validation is only
// as strong as this parser. Every case below is a header an attacker controls
// byte-for-byte, and the required outcome for all of them is the SAME: return
// null. A null makes FilesService answer VIDEO_DURATION_INVALID and reject the
// upload; a wrong number, an infinite value, or a thrown RangeError would each
// turn a client-controlled field into a way to slip a long video past the gate
// or to 500 the endpoint. The guards are therefore asserted on the boundary
// values, not just the happy paths.
// ---------------------------------------------------------------------------

/** MP4 with an mvhd v1 box: 64-bit creation/modification, 32-bit timescale, 64-bit duration. */
function mvhdBoxV1(timescale: number, duration: bigint): Buffer {
  const buf = Buffer.alloc(44)
  buf.writeUInt32BE(44, 0)
  buf.write('mvhd', 4, 'latin1')
  buf.writeUInt8(1, 8) // version
  buf.writeUInt32BE(timescale, 28)
  buf.writeBigUInt64BE(duration, 32)
  return buf
}

function buildMp4With(box: Buffer): Buffer {
  const moov = Buffer.alloc(8)
  moov.writeUInt32BE(8 + box.length, 0)
  moov.write('moov', 4, 'latin1')
  return Buffer.concat([ftypBox('isom'), moov, box])
}

/** ISO BMFF box with an explicit 64-bit (`size === 1`) extended size field. */
function extendedSizeBox(type: string, payload: Buffer): Buffer {
  const buf = Buffer.alloc(16 + payload.length)
  buf.writeUInt32BE(1, 0)
  buf.write(type, 4, 'latin1')
  buf.writeBigUInt64BE(BigInt(16 + payload.length), 8)
  payload.copy(buf, 16)
  return buf
}

describe('video-file header hardening', () => {
  describe('ISO BMFF box sizes', () => {
    it('reads the duration from a box that declares size 0 (extends to EOF)', () => {
      const mvhd = Buffer.alloc(28)
      mvhd.write('mvhd', 0, 'latin1') // size field overwritten with 0 below
      mvhd.writeUInt32BE(0, 0)
      mvhd.write('mvhd', 4, 'latin1')
      mvhd.writeUInt32BE(1000, 20)
      mvhd.writeUInt32BE(300000, 24)
      const moov = Buffer.alloc(8)
      moov.writeUInt32BE(0, 0) // also size 0
      moov.write('moov', 4, 'latin1')

      const buf = Buffer.concat([ftypBox('isom'), moov, mvhd])

      expect(readVideoDuration(buf, 'mp4')).toBe(300)
    })

    it('follows a 64-bit extended size on the moov box', () => {
      const mvhd = mvhdBoxV0(1000, 300000)
      const buf = Buffer.concat([ftypBox('isom'), extendedSizeBox('moov', mvhd)])

      expect(readVideoDuration(buf, 'mp4')).toBe(300)
    })

    it('rejects a box whose extended size runs past the end of the buffer', () => {
      const buf = Buffer.alloc(32)
      buf.writeUInt32BE(1, 0)
      buf.write('moov', 4, 'latin1')
      buf.writeBigUInt64BE(9999n, 8) // claims far more than the file holds

      expect(readVideoDuration(buf, 'mp4')).toBeNull()
    })

    it('rejects a box smaller than its own header', () => {
      const buf = Buffer.alloc(16)
      buf.writeUInt32BE(4, 0) // a 4-byte "box" cannot hold an 8-byte header
      buf.write('ftyp', 4, 'latin1')
      buf.write('isom', 8, 'latin1')

      expect(readVideoDuration(buf, 'mp4')).toBeNull()
    })

    it('rejects a truncated ftyp header that never reaches 12 bytes', () => {
      expect(detectVideoFormat(ftypBox('isom').subarray(0, 10))).toBeNull()
    })

    it('returns null rather than recursing forever on a self-referential box size', () => {
      // size 0 on a box nested directly inside another size-0 box would loop
      // forever without the guard; the bounded walk must terminate.
      const nested = Buffer.alloc(16)
      nested.writeUInt32BE(0, 0)
      nested.write('moov', 4, 'latin1')
      nested.writeUInt32BE(0, 8)
      nested.write('mvhd', 12, 'latin1')

      expect(readVideoDuration(Buffer.concat([ftypBox('isom'), nested]), 'mp4')).toBeNull()
    })
  })

  describe('ISO BMFF duration sentinels', () => {
    it.each([
      ['a zero duration', 0],
      ['the 0xFFFFFFFF "unknown" sentinel', 0xffffffff],
    ])('rejects mvhd v0 with %s', (_label, duration) => {
      expect(readVideoDuration(buildMp4('isom', 1000, duration), 'mp4')).toBeNull()
    })

    it('reads a v1 duration of 300s', () => {
      const buf = buildMp4With(mvhdBoxV1(1000, 300_000n))

      expect(readVideoDuration(buf, 'mp4')).toBe(300)
    })

    it('rejects a v1 duration of 0', () => {
      expect(readVideoDuration(buildMp4With(mvhdBoxV1(1000, 0n)), 'mp4')).toBeNull()
    })

    it('rejects a v1 duration of the 0xFFFFFFFFFFFFFFFF sentinel', () => {
      const buf = buildMp4With(mvhdBoxV1(1000, 0xffffffffffffffffn))

      expect(readVideoDuration(buf, 'mp4')).toBeNull()
    })

    it('rejects a v1 timescale of 0 rather than dividing by zero', () => {
      expect(readVideoDuration(buildMp4With(mvhdBoxV1(0, 300_000n)), 'mp4')).toBeNull()
    })

    it('rejects a v1 box truncated before the duration field', () => {
      const full = mvhdBoxV1(1000, 300_000n)
      const buf = Buffer.concat([ftypBox('isom'), extendedSizeBox('moov', full.subarray(0, 34))])

      expect(readVideoDuration(buf, 'mp4')).toBeNull()
    })
  })

  describe('RIFF / AVI', () => {
    /** Wraps chunks in a RIFF header so detectVideoFormat still reports 'avi'. */
    const riff = (...chunks: Buffer[]) =>
      Buffer.concat([Buffer.from('RIFF', 'latin1'), uint32le(4 + chunks.length), Buffer.from('AVI ', 'latin1'), ...chunks])

    /** A top-level 'avih' chunk placed directly in the stream, not inside hdrl. */
    const bareAvih = (microPerFrame: number, totalFrames: number) => {
      const body = Buffer.alloc(20)
      body.writeUInt32LE(microPerFrame, 0)
      body.writeUInt32LE(totalFrames, 16)
      return Buffer.concat([Buffer.from('avih', 'latin1'), uint32le(20), body])
    }

    it('reads the duration from a top-level avih chunk', () => {
      expect(readVideoDuration(riff(bareAvih(40000, 7500)), 'avi')).toBe(300)
    })

    it('rejects a top-level avih with a zero frame count', () => {
      expect(readVideoDuration(riff(bareAvih(40000, 0)), 'avi')).toBeNull()
    })

    it('rejects a top-level avih with a zero microseconds-per-frame', () => {
      expect(readVideoDuration(riff(bareAvih(0, 7500)), 'avi')).toBeNull()
    })

    it('rejects a top-level avih whose body is truncated', () => {
      const short = Buffer.concat([Buffer.from('avih', 'latin1'), uint32le(20), Buffer.alloc(8)])

      expect(readVideoDuration(riff(short), 'avi')).toBeNull()
    })

    it('rejects a zero-size chunk, which would otherwise stall the walk', () => {
      const zeroSized = Buffer.concat([Buffer.from('JUNK', 'latin1'), uint32le(0)])

      expect(readVideoDuration(riff(zeroSized), 'avi')).toBeNull()
    })

    it('keeps walking past 16-bit padding after an odd-sized chunk', () => {
      // A chunk of odd size is followed by one pad byte; reading the avih at
      // the un-padded offset would miss it and report a bogus duration.
      const odd = Buffer.concat([Buffer.from('JUNK', 'latin1'), uint32le(3), Buffer.from([1, 2, 3, 0])])
      const buf = riff(odd, bareAvih(40000, 7500))

      expect(readVideoDuration(buf, 'avi')).toBe(300)
    })

    it('rejects a zero-size chunk inside hdrl', () => {
      const hdrl = Buffer.concat([
        Buffer.from('LIST', 'latin1'),
        uint32le(4 + 8),
        Buffer.from('hdrl', 'latin1'),
        Buffer.from('JUNK', 'latin1'),
        uint32le(0),
      ])

      expect(readVideoDuration(riff(hdrl), 'avi')).toBeNull()
    })

    it('rejects an avih inside hdrl with a zero frame count', () => {
      const avih = Buffer.alloc(20)
      avih.writeUInt32LE(40000, 0)
      avih.writeUInt32LE(0, 16)
      const chunk = Buffer.concat([Buffer.from('avih', 'latin1'), uint32le(20), avih])
      const hdrl = Buffer.concat([
        Buffer.from('LIST', 'latin1'),
        uint32le(4 + chunk.length),
        Buffer.from('hdrl', 'latin1'),
        chunk,
      ])

      expect(readVideoDuration(riff(hdrl), 'avi')).toBeNull()
    })

    it('returns null when the stream ends before any avih', () => {
      expect(readVideoDuration(riff(), 'avi')).toBeNull()
    })
  })

  describe('Matroska / WebM sentinels', () => {
    it('applies the 1ms default TimecodeScale when the element is absent', () => {
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const header = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), vintSize(docType.length), docType])
      const infoBody = element(ELEM_DURATION, doubleBE(300_000))
      const buf = Buffer.concat([header, element(ELEM_SEGMENT, element(ELEM_INFO, infoBody))])

      // 300_000 timecode units × the 1ms default = 300s.
      expect(readVideoDuration(buf, 'webm')).toBe(300)
    })

    it.each([
      ['a negative duration', -5.0],
      ['a zero duration', 0.0],
    ])('rejects %s', (_label, seconds) => {
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const header = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), vintSize(docType.length), docType])
      const infoBody = element(ELEM_DURATION, doubleBE(seconds))
      const buf = Buffer.concat([header, element(ELEM_SEGMENT, element(ELEM_INFO, infoBody))])

      expect(readVideoDuration(buf, 'webm')).toBeNull()
    })

    it('rejects a non-finite duration (NaN)', () => {
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const header = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), vintSize(docType.length), docType])
      const infoBody = element(ELEM_DURATION, doubleBE(NaN))
      const buf = Buffer.concat([header, element(ELEM_SEGMENT, element(ELEM_INFO, infoBody))])

      expect(readVideoDuration(buf, 'webm')).toBeNull()
    })

    it('reads a 4-byte float Duration', () => {
      const float = Buffer.alloc(4)
      // Float32 precision: 300_000 is stored as 300000.015625.
      float.writeFloatBE(300_000, 0)
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const header = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), vintSize(docType.length), docType])
      const infoBody = Buffer.concat([
        element(ELEM_TIMECODE_SCALE, uint32be(1_000_000)),
        element(ELEM_DURATION, float),
      ])
      const buf = Buffer.concat([header, element(ELEM_SEGMENT, element(ELEM_INFO, infoBody))])

      expect(readVideoDuration(buf, 'webm')).toBe(300)
    })

    it('reads an 8-byte TimecodeScale alongside a 4-byte Duration', () => {
      const scale = Buffer.alloc(8)
      scale.writeBigUInt64BE(2_000_000n, 0)
      const float = Buffer.alloc(4)
      float.writeFloatBE(150_000, 0)
      const docType = element(ELEM_DOC_TYPE, Buffer.from('webm', 'latin1'))
      const header = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), vintSize(docType.length), docType])
      const infoBody = Buffer.concat([element(ELEM_TIMECODE_SCALE, scale), element(ELEM_DURATION, float)])
      const buf = Buffer.concat([header, element(ELEM_SEGMENT, element(ELEM_INFO, infoBody))])

      // 150 units × 2ms = 300s.
      expect(readVideoDuration(buf, 'webm')).toBe(300)
    })

    it('rejects a header with no DocType element at all', () => {
      // A WebM signature with an empty header is a Matroska file, not WebM.
      const header = Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        Buffer.from([0x80]),
      ])

      expect(detectVideoFormat(header)).toBeNull()
      expect(readVideoDuration(header, 'webm')).toBeNull()
    })

    it('rejects a truncated EBML signature', () => {
      expect(detectVideoFormat(Buffer.from([0x1a, 0x45]))).toBeNull()
    })
  })
})

describe('mimeTypeForVideoFormat', () => {
  it.each([
    ['mp4', 'video/mp4'],
    ['mov', 'video/quicktime'],
    ['webm', 'video/webm'],
    ['avi', 'video/x-msvideo'],
  ])('maps %s to %s', (format, mime) => {
    expect(mimeTypeForVideoFormat(format as VideoFormat)).toBe(mime)
  })
})
