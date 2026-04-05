import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/users/enums/role.enum';

export class UserProfileResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.ClIENT })
  role: Role;

  @ApiProperty({ example: 0 })
  balance: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
