import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/modules/database/database.module';
import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthCookieService } from '@/auth/auth-cookie.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, AuthCookieService],
  exports: [UsersService],
})
export class UsersModule {}
