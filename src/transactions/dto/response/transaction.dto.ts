import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileResponseDto } from 'src/users/dto/response/user-profile.dto';
import { TypeTransaction } from 'src/transactions/enums/type-transaction.enum';
import { TransactionStatus } from 'src/transactions/enums/transaction-status.enum';

export class TransactionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 100 })
  balance: number;

  @ApiProperty({ enum: TypeTransaction, example: TypeTransaction.DEPOSIT })
  type: TypeTransaction;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.COMPLETED })
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
