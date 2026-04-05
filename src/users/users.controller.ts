import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorators/role.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Role } from './enums/role.enum';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserProfileResponseDto } from './dto/response/user-profile.dto';
import { PaginatedUsersResponseDto } from './dto/response/paginated-users.dto';
import { PaginationQueryDto } from '@/common/pagination/dto/request/pagination-query.dto';

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getMe(@CurrentUser() user: User): Promise<UserProfileResponseDto> {
    return this.usersService.getProfile(user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description: 'Returns a paginated list of all registered users.',
  })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getUsers(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.getUsers(query);
  }

  @Patch(':id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Block a user (Admin only)',
    description:
      'Deactivates the target user account and invalidates their session. The user will be unable to log in.',
  })
  @ApiNoContentResponse({ description: 'User blocked' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'User is already blocked' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  blockUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.blockUser(id);
  }

  @Patch('me/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate own account',
    description:
      'Permanently deactivates the authenticated account and clears session cookies.',
  })
  @ApiNoContentResponse({ description: 'Account deactivated' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async deactivate(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.usersService.deactivate(user.id, res);
  }
}
