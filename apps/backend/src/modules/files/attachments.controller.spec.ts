import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AttachmentsController } from './attachments.controller'
import { Attachment } from './entities/attachment.entity'
import { Chat } from '../chats/entities/chat.entity'

jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }))

describe('AttachmentsController', () => {
  let controller: AttachmentsController
  const attachmentRepo = { findOne: jest.fn() }
  const chatRepo = { findOne: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [
        { provide: getRepositoryToken(Attachment), useValue: attachmentRepo },
        { provide: getRepositoryToken(Chat), useValue: chatRepo },
      ],
    }).compile()
    controller = moduleRef.get(AttachmentsController)
  })

  it('returns binary data for authorized participant', async () => {
    attachmentRepo.findOne.mockResolvedValue({
      id: 'a-id', data: Buffer.from('bytes'), mimeType: 'image/png', originalName: 'x', message: { chatId: 'c-id' },
    })
    chatRepo.findOne.mockResolvedValue({ id: 'c-id', userAId: 'u1', userBId: 'u2' })
    const send = jest.fn()
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send } as unknown as Response
    await controller.getAttachment({ user: { id: 'u1' } } as never, { id: 'a-id' } as never, res)
    expect(send).toHaveBeenCalledWith(Buffer.from('bytes'))
  })

  it('returns 404 for missing attachment', async () => {
    attachmentRepo.findOne.mockResolvedValue(null)
    await expect(
      controller.getAttachment({ user: { id: 'u1' } } as never, { id: 'bad' } as never, { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as never),
    ).rejects.toThrow('Not Found')
  })
})
