import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    example: 50,
    description: 'Amount to transfer (positive integer)',
  })
  @IsNumber()
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Payment for services' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ example: 'uuid-of-recipient' })
  @IsUUID()
  toUserId: string;
}
