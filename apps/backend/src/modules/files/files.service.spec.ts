import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { v2 as cloudinary } from 'cloudinary'
import { FilesService } from './files.service'

// Mock the Cloudinary SDK. The config module (getCloudinaryConfig) is NOT
// mocked: it is a pure env reader, so the tests drive it with process.env and
// assert against the cloudinary.config / uploader.upload mocks instead.
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn() },
  },
}))

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

const CLOUDINARY_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const

function mvhdBox(timescale: number, duration: number): Buffer {
  const box = Buffer.alloc(28)
  box.writeUInt32BE(28, 0)
  box.write('mvhd', 4, 'latin1')
  box.writeUInt32BE(0, 8) // version 0 + flags
  box.writeUInt32BE(0, 12) // creation
  box.writeUInt32BE(0, 16) // modification
  box.writeUInt32BE(timescale, 20)
  box.writeUInt32BE(duration, 24)
  return box
}

function buildMp4(timescale: number, duration: number): Buffer {
  const ftyp = Buffer.alloc(16)
  ftyp.writeUInt32BE(16, 0)
  ftyp.write('ftyp', 4, 'latin1')
  ftyp.write('isom', 8, 'latin1')
  const mvhd = mvhdBox(timescale, duration)
  const moov = Buffer.alloc(8 + mvhd.length)
  moov.writeUInt32BE(8 + mvhd.length, 0)
  moov.write('moov', 4, 'latin1')
  mvhd.copy(moov, 8)
  return Buffer.concat([ftyp, moov])
}

function largeImageFile(): Express.Multer.File {
  const header = buildPng(800, 600)
  const buf = Buffer.alloc(11 * 1024 * 1024) // 11MB > IMAGE_MAX_SIZE_BYTES
  header.copy(buf)
  return { buffer: buf, originalname: 'big.png', mimetype: 'image/png' } as Express.Multer.File
}

describe('FilesService', () => {
  let service: FilesService

  const mockUpload = cloudinary.uploader.upload as jest.Mock
  const mockConfig = cloudinary.config as jest.Mock

  const validFile = () =>
    ({
      buffer: buildPng(800, 600),
      originalname: 'photo.png',
      mimetype: 'image/png',
    }) as Express.Multer.File

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CLOUDINARY_CLOUD_NAME = 'example-cloud'
    process.env.CLOUDINARY_API_KEY = 'api-key'
    process.env.CLOUDINARY_API_SECRET = 'api-secret'
    mockUpload.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/example-cloud/img.png' })
    service = new FilesService()
  })

  afterEach(() => {
    for (const key of CLOUDINARY_KEYS) {
      delete process.env[key]
    }
  })

  it('throws FILE_REQUIRED when no file is sent', async () => {
    await expect(service.uploadImage(undefined)).rejects.toMatchObject({
      status: 400,
      response: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_REQUIRED },
    })
  })

  it('throws FILE_REQUIRED when the uploaded buffer is empty', async () => {
    await expect(
      service.uploadImage({ buffer: Buffer.alloc(0) } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_REQUIRED },
    })
  })

  it('throws FILE_TYPE_INVALID for content that is not a recognized image', async () => {
    await expect(
      service.uploadImage({ buffer: Buffer.from('not an image at all') } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_TYPE_INVALID },
    })
  })

  it('throws FILE_DIMENSIONS_INVALID for an image smaller than the minimum', async () => {
    await expect(
      service.uploadImage({ buffer: buildPng(50, 50) } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_DIMENSIONS_INVALID,
      },
    })
  })

  it('throws FILE_DIMENSIONS_INVALID for an image larger than the maximum', async () => {
    await expect(
      service.uploadImage({ buffer: buildPng(6000, 6000) } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_DIMENSIONS_INVALID,
      },
    })
  })

  it('uploads a valid image and returns the Cloudinary secure URL', async () => {
    const result = await service.uploadImage(validFile())

    expect(mockConfig).toHaveBeenCalledWith({
      cloud_name: 'example-cloud',
      api_key: 'api-key',
      api_secret: 'api-secret',
    })
    expect(mockUpload).toHaveBeenCalledTimes(1)
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
      expect.objectContaining({
        folder: 'email-chat-pro/images',
        resource_type: 'image',
      }),
    )
    expect(result).toEqual({ url: 'https://res.cloudinary.com/example-cloud/img.png' })
  })

  it('configures Cloudinary only once across multiple uploads', async () => {
    await service.uploadImage(validFile())
    await service.uploadImage(validFile())
    expect(mockConfig).toHaveBeenCalledTimes(1)
  })

  it('throws FILE_UPLOAD_FAILED when Cloudinary credentials are missing', async () => {
    for (const key of CLOUDINARY_KEYS) {
      delete process.env[key]
    }

    await expect(service.uploadImage(validFile())).rejects.toMatchObject({
      status: 500,
      response: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.FILE_UPLOAD_FAILED },
    })
  })

  it('throws FILE_UPLOAD_FAILED when Cloudinary rejects the upload', async () => {
    mockUpload.mockRejectedValue(new Error('cloudinary rejected'))

    await expect(service.uploadImage(validFile())).rejects.toMatchObject({
      status: 500,
      response: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.FILE_UPLOAD_FAILED },
    })
  })

  it('throws FILE_UPLOAD_FAILED when the Cloudinary response lacks a secure_url', async () => {
    mockUpload.mockResolvedValue({ public_id: 'abc' })

    await expect(service.uploadImage(validFile())).rejects.toMatchObject({
      status: 500,
      response: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.FILE_UPLOAD_FAILED },
    })
  })

  it('throws FILE_SIZE_EXCEEDED when an image exceeds IMAGE_MAX_SIZE_BYTES', async () => {
    await expect(service.uploadImage(largeImageFile())).rejects.toMatchObject({
      status: 400,
      response: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
      },
    })
  })

  // ── Video upload path (Task 4.2) ──────────────────────────────────────

  it('throws FILE_REQUIRED when no video file is sent', async () => {
    await expect(service.uploadVideo(undefined)).rejects.toMatchObject({
      status: 400,
      response: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_REQUIRED },
    })
  })

  it('throws FILE_TYPE_INVALID for non-video content on the video path', async () => {
    await expect(
      service.uploadVideo({ buffer: Buffer.from('not a video') } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_TYPE_INVALID },
    })
  })

  it('throws VIDEO_DURATION_INVALID when the mp4 duration cannot be read', async () => {
    // ftyp only — no moov/mvhd → duration unreadable
    const ftyp = Buffer.alloc(16)
    ftyp.writeUInt32BE(16, 0)
    ftyp.write('ftyp', 4, 'latin1')
    ftyp.write('isom', 8, 'latin1')

    await expect(
      service.uploadVideo({ buffer: ftyp } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.VIDEO_DURATION_INVALID,
      },
    })
  })

  it('throws VIDEO_DURATION_EXCEEDED when the video exceeds 5 minutes', async () => {
    await expect(
      service.uploadVideo({ buffer: buildMp4(1000, 300_001) } as Express.Multer.File),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.VIDEO_DURATION_EXCEEDED,
      },
    })
  })

  it('uploads a valid video and calls Cloudinary with resource_type video and correct folder', async () => {
    // 299 seconds — under the 300s limit
    const videoBuf = buildMp4(1000, 299_000)
    const file = {
      buffer: videoBuf,
      originalname: 'clip.mp4',
      mimetype: 'video/mp4',
    } as Express.Multer.File

    const result = await service.uploadVideo(file)

    expect(mockUpload).toHaveBeenCalledTimes(1)
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^data:video\/mp4;base64,/),
      expect.objectContaining({
        folder: 'email-chat-pro/videos',
        resource_type: 'video',
      }),
    )
    expect(result).toEqual({ url: 'https://res.cloudinary.com/example-cloud/img.png' })
  })

  it('throws FILE_UPLOAD_FAILED when Cloudinary rejects a video upload', async () => {
    mockUpload.mockRejectedValue(new Error('cloudinary error'))
    const file = {
      buffer: buildMp4(1000, 10_000),
      originalname: 'clip.mp4',
      mimetype: 'video/mp4',
    } as Express.Multer.File

    await expect(service.uploadVideo(file)).rejects.toMatchObject({
      status: 500,
      response: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.FILE_UPLOAD_FAILED },
    })
  })

  it('configures Cloudinary only once across an image upload followed by a video upload', async () => {
    await service.uploadImage(validFile())
    await service.uploadVideo({
      buffer: buildMp4(1000, 10_000),
      originalname: 'clip.mp4',
      mimetype: 'video/mp4',
    } as Express.Multer.File)
    expect(mockConfig).toHaveBeenCalledTimes(1)
  })
})
