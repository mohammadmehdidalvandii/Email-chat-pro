/**
 * Pure video-header inspection (Task 4.2 — video upload validation).
 *
 * architecture.md §File Upload Validation requires the backend to enforce the
 * supported video formats (mp4/webm/mov/avi, max 50MB) AND the 5-minute
 * duration rule. No video-metadata library is in stack.md (current-task.md Task
 * 4.2 Approved Decision 1), so — exactly as Task 4.1 parsed image dimensions in
 * image-file.ts — the format and duration are read dependency-free from each
 * container's magic bytes and header fields:
 *
 *   - MP4/MOV (ISO BMFF) — "ftyp" box at byte 4; the major brand at bytes 8-11
 *     distinguishes MOV ("qt  ") from MP4. Duration comes from the "mvhd" box
 *     (inside "moov"): duration / timescale.
 *   - WebM (Matroska/EBML) — EBML signature 1A 45 DF A3 whose DocType is
 *     "webm". Duration comes from the Segment → Info element: the float
 *     "Duration" multiplied by "TimecodeScale" (ns per timecode unit).
 *   - AVI (RIFF) — "RIFF"…"AVI ". Duration comes from the hdrl → "avih" block:
 *     dwMicroSecPerFrame × dwTotalFrames.
 *
 * The client-supplied Content-Type is deliberately NOT trusted here — it is
 * easy to spoof. The magic bytes are the authoritative format signal; the multer
 * fileFilter only uses the mime type as a cheap pre-filter.
 *
 * A recognized format whose duration cannot be read (missing/zero box, unknown
 * sentinel, empty fields, malformed nesting) reports null, letting FilesService
 * reject it with VIDEO_DURATION_INVALID so the ≤5-minute guarantee can never be
 * silently bypassed.
 */

export type VideoFormat = 'mp4' | 'mov' | 'webm' | 'avi'

/** Format + duration (seconds) parsed from a video file header. */
export interface VideoFileInfo {
  format: VideoFormat
  durationSeconds: number
}

const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3])

/** Matroska/EBML element IDs needed by the duration parse. */
const ELEM_EBML = [0x1a, 0x45, 0xdf, 0xa3] as const
const ELEM_DOC_TYPE = [0x42, 0x82] as const
const ELEM_SEGMENT = [0x18, 0x53, 0x80, 0x67] as const
const ELEM_INFO = [0x15, 0x49, 0xa9, 0x66] as const
const ELEM_TIMECODE_SCALE = [0x2a, 0xd7, 0xb1] as const
const ELEM_DURATION = [0x44, 0x89] as const

/**
 * Returns the container format of `buffer` when it is a recognized video (mp4,
 * mov, webm, or avi), or null when it is none of those formats. Magic bytes are
 * the only signal used; the DocType element is verified for WebM so an mkv
 * cannot masquerade as webm.
 */
export function detectVideoFormat(buffer: Buffer): VideoFormat | null {
  if (buffer.length >= 12 && buffer.toString('latin1', 4, 8) === 'ftyp') {
    const majorBrand = buffer.toString('latin1', 8, 12)
    return majorBrand === 'qt  ' ? 'mov' : 'mp4'
  }
  if (detectWebm(buffer)) return 'webm'
  if (detectAvi(buffer)) return 'avi'
  return null
}

/**
 * Returns the duration of `buffer` in seconds (or null when it cannot be read)
 * for a format already confirmed by {@link detectVideoFormat}.
 */
export function readVideoDuration(buffer: Buffer, format: VideoFormat): number | null {
  switch (format) {
    case 'mp4':
    case 'mov':
      return readIsoBmffDuration(buffer)
    case 'webm':
      return readWebmDuration(buffer)
    case 'avi':
      return readAviDuration(buffer)
  }
}

/** Maps a parsed video format to the canonical MIME type used in the data URI. */
export function mimeTypeForVideoFormat(format: VideoFormat): string {
  switch (format) {
    case 'mp4':
      return 'video/mp4'
    case 'mov':
      return 'video/quicktime'
    case 'webm':
      return 'video/webm'
    case 'avi':
      return 'video/x-msvideo'
  }
}

// ---------------------------------------------------------------------------
// MP4 / MOV (ISO Base Media File Format)
// ---------------------------------------------------------------------------

/** Parsed ISO BMFF box header (size field consumed; data starts at dataStart). */
interface IsoBox {
  type: string
  dataStart: number
  dataEnd: number
  next: number
}

/**
 * Reads a box header at `offset`: 4-byte size (0 → to EOF, 1 → 8-byte extended
 * size), 4-byte type. Returns null when the box is truncated or malformed.
 */
function readIsoBox(buffer: Buffer, offset: number): IsoBox | null {
  if (offset + 8 > buffer.length) return null
  let size = buffer.readUInt32BE(offset)
  const type = buffer.toString('latin1', offset + 4, offset + 8)
  let dataStart = offset + 8
  if (size === 1) {
    if (offset + 16 > buffer.length) return null
    size = Number(buffer.readBigUInt64BE(offset + 8))
    if (size < 16) return null
    dataStart = offset + 16
  } else if (size === 0) {
    size = buffer.length - offset
  }
  if (size < dataStart - offset || offset + size > buffer.length) return null
  return { type, dataStart, dataEnd: offset + size, next: offset + size }
}

/** Returns the byte offset of the "mvhd" box inside [start, end), or null. */
function findMvhd(buffer: Buffer, start: number, end: number): number | null {
  let offset = start
  let guard = 0
  while (offset + 8 <= end && offset + 8 <= buffer.length) {
    const box = readIsoBox(buffer, offset)
    if (!box || box.next > end) return null
    if (box.type === 'moov') {
      const mvhd = findMvhd(buffer, box.dataStart, box.dataEnd)
      if (mvhd !== null) return mvhd
    } else if (box.type === 'mvhd') {
      return box.dataStart - 8
    }
    guard += 1
    if (guard > 10_000) return null
    offset = box.next
  }
  return null
}

/** mvhd → duration / timescale (seconds). Both 0xFFFFFFFF (v0) and 0 mean
 * "unknown/still being written" and are rejected. */
function readIsoBmffDuration(buffer: Buffer): number | null {
  const mvhdStart = findMvhd(buffer, 0, buffer.length)
  if (mvhdStart === null) return null

  const version = buffer[mvhdStart + 8]
  if (version === 1) {
    // creation(8) modification(8) timescale(4) duration(8) after the 4-byte
    // version/flags at mvhdStart+8.
    const timescaleOffset = mvhdStart + 28
    const durationOffset = mvhdStart + 32
    if (durationOffset + 8 > buffer.length) return null
    const timescale = buffer.readUInt32BE(timescaleOffset)
    if (timescale === 0) return null
    const duration = buffer.readBigUInt64BE(durationOffset)
    if (duration === 0n || duration === 0xffffffffffffffffn) return null
    return Number(duration) / timescale
  }

  const timescaleOffset = mvhdStart + 20
  const durationOffset = mvhdStart + 24
  if (durationOffset + 4 > buffer.length) return null
  const timescale = buffer.readUInt32BE(timescaleOffset)
  if (timescale === 0) return null
  const duration = buffer.readUInt32BE(durationOffset)
  if (duration === 0 || duration === 0xffffffff) return null
  return duration / timescale
}

// ---------------------------------------------------------------------------
// WebM (EBML / Matroska)
// ---------------------------------------------------------------------------

/** Number of leading zero bits of `byte` — determines an EBML element ID length.
 * (Matroska IDs are VINTs whose byte count is the leading-zero count + 1.) */
function leadingZeroBits(byte: number): number {
  let count = 0
  for (let i = 7; i >= 0; i -= 1) {
    if ((byte & (1 << i)) === 0) count += 1
    else break
  }
  return count
}

/**
 * Reads an EBML variable-length integer (used for element sizes). The first
 * byte's highest set bit marks the length; the remaining bits + following bytes
 * are the value.
 */
function readVintSize(buffer: Buffer, offset: number): { value: number; length: number } | null {
  if (offset >= buffer.length) return null
  const first = buffer[offset]
  let length = 1
  while (length <= 8 && (first & (0x80 >> (length - 1))) === 0) length += 1
  if (length > 8) return null
  let value = first & ((0x80 >> (length - 1)) - 1)
  for (let i = 1; i < length; i += 1) {
    if (offset + i >= buffer.length) return null
    value = value * 256 + buffer[offset + i]
  }
  return { value, length }
}

/** An all-ones VINT (all value bits set) means the element size is unknown. */
function isUnknownVintSize(value: number, length: number): boolean {
  if (length >= 7) return true // beyond the exact-safe integer range
  return value === Math.pow(2, 7 * length) - 1
}

interface EbmlElement {
  idBytes: Buffer
  dataStart: number
  dataLength: number
  next: number
}

/** Reads an EBML element (ID + size VINT + data). An unknown-size element is
 * bounded by the end of the buffer. */
function readEbmlElement(buffer: Buffer, offset: number): EbmlElement | null {
  if (offset >= buffer.length) return null
  const first = buffer[offset]
  if (first === 0) return null
  const idLength = leadingZeroBits(first) + 1
  if (offset + idLength > buffer.length) return null
  const idBytes = Buffer.from(buffer.subarray(offset, offset + idLength))
  const size = readVintSize(buffer, offset + idLength)
  if (!size) return null
  const dataStart = offset + idLength + size.length
  const dataLength = isUnknownVintSize(size.value, size.length)
    ? buffer.length - dataStart
    : size.value
  return { idBytes, dataStart, dataLength, next: dataStart + dataLength }
}

function elementIdEquals(idBytes: Buffer, target: readonly number[]): boolean {
  if (idBytes.length !== target.length) return false
  for (let i = 0; i < idBytes.length; i += 1) {
    if (idBytes[i] !== target[i]) return false
  }
  return true
}

/** Verifies the EBML DocType element reads "webm" (rejects mkv/matroska). */
function detectWebm(buffer: Buffer): boolean {
  if (!EBML_MAGIC.equals(buffer.subarray(0, 4))) return false
  const header = readEbmlElement(buffer, 0)
  if (!header || !elementIdEquals(header.idBytes, ELEM_EBML)) return false
  const end = Math.min(header.next, buffer.length)
  let offset = header.dataStart
  let guard = 0
  while (offset + 2 <= end) {
    const element = readEbmlElement(buffer, offset)
    if (!element) return false
    if (elementIdEquals(element.idBytes, ELEM_DOC_TYPE)) {
      const docType = buffer.toString(
        'latin1',
        element.dataStart,
        Math.min(element.dataStart + element.dataLength, buffer.length),
      )
      return docType === 'webm'
    }
    guard += 1
    if (guard > 1000) return false
    offset = element.next
  }
  return false
}

function readWebmDuration(buffer: Buffer): number | null {
  const header = readEbmlElement(buffer, 0)
  if (!header || !elementIdEquals(header.idBytes, ELEM_EBML)) return null
  let offset = Math.min(header.next, buffer.length)
  let guard = 0
  while (offset + 2 <= buffer.length) {
    const element = readEbmlElement(buffer, offset)
    if (!element) return null
    if (elementIdEquals(element.idBytes, ELEM_SEGMENT)) {
      const segmentEnd = Math.min(element.dataStart + element.dataLength, buffer.length)
      return readSegmentDuration(buffer, element.dataStart, segmentEnd)
    }
    guard += 1
    if (guard > 1000) return null
    offset = element.next
  }
  return null
}

function readSegmentDuration(buffer: Buffer, start: number, end: number): number | null {
  let offset = start
  let guard = 0
  while (offset + 2 <= end && offset + 2 <= buffer.length) {
    const element = readEbmlElement(buffer, offset)
    if (!element) return null
    if (elementIdEquals(element.idBytes, ELEM_INFO)) {
      const infoEnd = Math.min(element.dataStart + element.dataLength, buffer.length)
      return readInfoDuration(buffer, element.dataStart, infoEnd)
    }
    // Info is normally the first child of the Segment; hitting any other
    // (possibly unknown-size) element before it means the duration is unreachable.
    guard += 1
    if (guard > 1000) return null
    offset = element.next
  }
  return null
}

function readInfoDuration(buffer: Buffer, start: number, end: number): number | null {
  // Default TimecodeScale is 1ms = 1_000_000 ns (spec: 1_000_000).
  let timecodeScale = 1_000_000
  let duration: number | null = null
  let offset = start
  let guard = 0
  while (offset + 2 <= end && offset + 2 <= buffer.length) {
    const element = readEbmlElement(buffer, offset)
    if (!element) return null
    if (elementIdEquals(element.idBytes, ELEM_TIMECODE_SCALE) && element.dataLength >= 1) {
      if (element.dataLength <= 4) {
        timecodeScale = buffer.readUIntBE(element.dataStart, element.dataLength)
      } else if (element.dataLength === 8) {
        timecodeScale = Number(buffer.readBigUInt64BE(element.dataStart))
      }
    } else if (elementIdEquals(element.idBytes, ELEM_DURATION)) {
      if (element.dataLength === 8) duration = buffer.readDoubleBE(element.dataStart)
      else if (element.dataLength === 4) duration = buffer.readFloatBE(element.dataStart)
    }
    guard += 1
    if (guard > 1000) return null
    offset = element.next
  }
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null
  return (duration * timecodeScale) / 1_000_000_000
}

// ---------------------------------------------------------------------------
// AVI (RIFF)
// ---------------------------------------------------------------------------

function detectAvi(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'AVI '
  )
}

function readAviDuration(buffer: Buffer): number | null {
  // Top-level stream begins after the RIFF header ("RIFF" + size + "AVI ").
  let offset = 12
  let guard = 0
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('latin1', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const dataStart = offset + 8
    if (id === 'LIST' && dataStart + 4 <= buffer.length) {
      // A LIST chunk carries a 4-byte list type; "hdrl" holds the main header.
      if (buffer.toString('latin1', dataStart, dataStart + 4) === 'hdrl') {
        const duration = parseHdrl(buffer, dataStart + 4, Math.min(dataStart + size, buffer.length))
        if (duration !== null) return duration
      }
    } else if (id === 'avih' && size >= 20) {
      const duration = parseAvih(buffer, dataStart)
      if (duration !== null) return duration
    }
    if (size === 0) return null // malformed
    // RIFF chunks are padded to 16-bit alignment.
    offset = dataStart + size + (size & 1)
    guard += 1
    if (guard > 10_000) return null
  }
  return null
}

function parseHdrl(buffer: Buffer, start: number, end: number): number | null {
  let offset = start
  let guard = 0
  while (offset + 8 <= end) {
    const id = buffer.toString('latin1', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const dataStart = offset + 8
    if (id === 'avih' && size >= 20) {
      const duration = parseAvih(buffer, dataStart)
      if (duration !== null) return duration
    }
    if (size === 0) return null
    offset = dataStart + size + (size & 1)
    guard += 1
    if (guard > 10_000) return null
  }
  return null
}

/** avih: dwMicroSecPerFrame at 0, (dwMaxBytesPerSec etc.), dwTotalFrames at 16. */
function parseAvih(buffer: Buffer, dataStart: number): number | null {
  if (dataStart + 20 > buffer.length) return null
  const microSecPerFrame = buffer.readUInt32LE(dataStart)
  const totalFrames = buffer.readUInt32LE(dataStart + 16)
  if (microSecPerFrame === 0 || totalFrames === 0) return null
  return (microSecPerFrame * totalFrames) / 1_000_000
}

/**
 * Returns format + duration for `buffer` in one call, or null when the buffer
 * is not a recognized video OR its duration cannot be read. FilesService keeps
 * the two signals separate (detectVideoFormat / readVideoDuration) so it can
 * return FILE_TYPE_INVALID vs VIDEO_DURATION_INVALID distinctly.
 */
export function inspectVideoBuffer(buffer: Buffer): VideoFileInfo | null {
  const format = detectVideoFormat(buffer)
  if (!format) return null
  const durationSeconds = readVideoDuration(buffer, format)
  if (durationSeconds === null) return null
  return { format, durationSeconds }
}
