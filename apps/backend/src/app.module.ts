import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { getDatabaseConfig } from './config/database.config'
import { AuthModule } from './modules/auth/auth.module'
import { ChatsModule } from './modules/chats/chats.module'
import { MessagesModule } from './modules/messages/messages.module'
import { UsersModule } from './modules/users/users.module'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
