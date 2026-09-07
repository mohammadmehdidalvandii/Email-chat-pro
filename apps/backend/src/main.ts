import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { API_BASE_PATH } from '@email-chat-pro/constants'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

/** Origin allowed to call the API during local development. */
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix(API_BASE_PATH)
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  const port = Number(process.env.PORT ?? 4000)
  await app.listen(port)
}

void bootstrap()
