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
})
