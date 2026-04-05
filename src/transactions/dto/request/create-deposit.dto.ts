import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({
    example: 100,
    description: 'Amount to deposit (positive integer)',
  })
  @IsNumber()
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Top up balance' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ example: 'uuid-of-recipient' })
  @IsUUID()
  toUserId: string;
}
