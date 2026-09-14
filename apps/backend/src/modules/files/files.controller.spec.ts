import { Test } from '@nestjs/testing'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'

// @nestjs/jwt v12 ships ESM-only (type: module); the CJS jest transformer
// cannot handle it. This mock short-circuits the ESM import chain (the
// controller's JwtAuthGuard import reaches @nestjs/jwt transitively).
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('FilesController', () => {
  let controller: FilesController

  const filesService = {
    uploadImage: jest.fn(),
    uploadVideo: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: filesService }],
    }).compile()

    controller = moduleRef.get(FilesController)
  })

  it('POST upload delegates to the service and wraps the URL in the ApiResponse envelope', async () => {
    const uploaded = { url: 'https://res.cloudinary.com/example-cloud/img.png' }
    filesService.uploadImage.mockResolvedValue(uploaded)
    const file = { buffer: Buffer.from('image-bytes') } as Express.Multer.File

    const result = await controller.upload(
      { user: { id: 'uuid-1' } } as never,
      { type: 'image' },
      file,
    )

    expect(filesService.uploadImage).toHaveBeenCalledWith(file)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(uploaded)
    expect(result.timestamp).toEqual(expect.any(String))
  })

  it('delegates an absent file so the service reports FILE_REQUIRED', async () => {
    const result = await controller.upload({ user: { id: 'uuid-1' } } as never, {}, undefined)

    expect(filesService.uploadImage).toHaveBeenCalledWith(undefined)
    expect(result.success).toBe(true)
  })

  it('propagates service validation errors', async () => {
    filesService.uploadImage.mockRejectedValue(
      new Error('not reached — the service throws HttpExceptions'),
    )

    await expect(
      controller.upload({ user: { id: 'uuid-1' } } as never, {}, {
        buffer: Buffer.from('x'),
      } as Express.Multer.File),
    ).rejects.toThrow('not reached')
  })

  it('delegates to uploadVideo when dto.type is video', async () => {
    const uploaded = { url: 'https://res.cloudinary.com/example-cloud/vid.mp4' }
    filesService.uploadVideo.mockResolvedValue(uploaded)
    const file = { buffer: Buffer.from('video-bytes') } as Express.Multer.File

    const result = await controller.upload(
      { user: { id: 'uuid-1' } } as never,
      { type: 'video' },
      file,
    )

    expect(filesService.uploadVideo).toHaveBeenCalledWith(file)
    expect(filesService.uploadImage).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.data).toEqual(uploaded)
  })

  it('delegates to uploadImage when dto.type is absent (image default)', async () => {
    const uploaded = { url: 'https://res.cloudinary.com/example-cloud/img.png' }
    filesService.uploadImage.mockResolvedValue(uploaded)
    const file = { buffer: Buffer.from('image-bytes') } as Express.Multer.File

    const result = await controller.upload({ user: { id: 'uuid-1' } } as never, {}, file)

    expect(filesService.uploadImage).toHaveBeenCalledWith(file)
    expect(filesService.uploadVideo).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
  })
})
