import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { getDatabaseConfig } from './config/database.config'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}