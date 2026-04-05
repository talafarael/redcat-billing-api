import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction.dto';
import { PaginatedResponseDto } from 'src/common/dto/response/pagination.dto';

export class PaginatedTransactionsResponseDto extends PaginatedResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];
}
