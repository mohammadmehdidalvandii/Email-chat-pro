import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AppThrottlerGuard } from './common/guards/throttler.guard'
import { getDatabaseConfig } from './config/database.config'
import { throttlerModuleOptions } from './config/rate-limit.config'
import { AuthModule } from './modules/auth/auth.module'
import { ChatsModule } from './modules/chats/chats.module'
import { ContactsModule } from './modules/contacts/contacts.module'
import { FilesModule } from './modules/files/files.module'
import { MessagesModule } from './modules/messages/messages.module'
import { UsersModule } from './modules/users/users.module'
import { WebSocketModule } from './modules/websocket/websocket.module'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),
    ThrottlerModule.forRootAsync({
      useFactory: throttlerModuleOptions,
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
    ContactsModule,
    FilesModule,
    MessagesModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
