import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { User } from '../auth/entities/user.entity'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

/**
 * User profile module (Task 1.4 — User Profile).
 *
 * Owns the `/users/me` endpoints. The User entity and the JwtAuthGuard /
 * JwtStrategy / AuthService providers come from AuthModule (exported there), so
 * the two modules share a single auth identity implementation.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
