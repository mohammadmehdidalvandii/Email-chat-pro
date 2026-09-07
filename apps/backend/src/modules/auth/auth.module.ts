import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import type { JwtSignOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { getJwtConfig } from '../../config/jwt.config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { User } from './entities/user.entity'
import { JwtAuthGuard } from './guards/jwt.guard'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const config = getJwtConfig()
        return {
          secret: config.secret,
          signOptions: { expiresIn: config.expiresIn as JwtSignOptions['expiresIn'] },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}
