import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileResponseDto } from '@/users/dto/response/user-profile.dto';
import { TypeTransaction } from '@/transactions/enums/type-transaction.enum';
import { TransactionStatus } from '@/transactions/enums/transaction-status.enum';

export class TransactionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 100 })
  amount: number;

  @ApiProperty({ enum: TypeTransaction, example: TypeTransaction.DEPOSIT })
  type: TypeTransaction;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @ApiPropertyOptional({ example: 'Top up balance' })
  comment?: string;

  @ApiPropertyOptional({ type: () => UserProfileResponseDto })
  fromUser: UserProfileResponseDto | null;

  @ApiProperty({ type: () => UserProfileResponseDto })
  toUser: UserProfileResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
