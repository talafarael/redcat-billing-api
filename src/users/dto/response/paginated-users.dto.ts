import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@/common/pagination/pagination.dto';
import { UserProfileResponseDto } from './user-profile.dto';

export class PaginatedUsersResponseDto extends PaginatedResponseDto {
  @ApiProperty({ type: [UserProfileResponseDto] })
  data: UserProfileResponseDto[];
}
