import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/users/enums/role.enum';
import { TransactionRepository } from './repositories/transaction.repository';
import { Transaction } from './entities/transaction.entity';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TypeTransaction } from './enums/type-transaction.enum';
import { CreateDepositDto } from './dto/request/create-deposit.dto';
import { CreateTransferDto } from './dto/request/create-transfer.dto';
import { PaginatedTransactionsResponseDto } from './dto/response/paginated-transactions.dto';
import { PaginationQueryDto } from 'src/common/dto/request/pagination-query.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly usersService: UsersService,
  ) {}

  async createDeposit(dto: CreateDepositDto): Promise<Transaction> {
    await this.usersService.findByIdOrFail(dto.toUserId);
    await this.usersService.adjustBalance(dto.toUserId, dto.amount);

    return this.transactionRepository.createDeposit({
      ...dto,
      balance: dto.amount,
      toUser: { id: dto.toUserId },
    });
  }

  async createTransfer(
    dto: CreateTransferDto,
    fromUserId: string,
  ): Promise<Transaction> {
    if (fromUserId === dto.toUserId) {
      throw new BadRequestException('Cannot transfer funds to yourself');
    }

    const [fromUser] = await Promise.all([
      this.usersService.findByIdOrFail(fromUserId),
      this.usersService.findByIdOrFail(dto.toUserId),
    ]);

    if (fromUser.balance < dto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    await this.usersService.adjustBalance(fromUserId, -dto.amount);
    await this.usersService.adjustBalance(dto.toUserId, dto.amount);

    return this.transactionRepository.createTransfer({
      balance: dto.amount,
      fromUser: { id: fromUserId },
      toUser: { id: dto.toUserId },
      comment: dto.comment,
    });
  }

  async getMyTransactions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    const [data, total] = await this.transactionRepository.findByUserId(
      userId,
      query,
    );
    return this.buildPaginatedResponse(data, total, query);
  }

  async getAllTransactions(
    query: PaginationQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    const [data, total] = await this.transactionRepository.findAll(query);
    return this.buildPaginatedResponse(data, total, query);
  }

  private buildPaginatedResponse(
    data: Transaction[],
    total: number,
    { page, limit }: PaginationQueryDto,
  ): PaginatedTransactionsResponseDto {
    return {
      data: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cancelTransaction(
    transactionId: string,
    requesterId: string,
    requesterRole: Role,
  ): Promise<Transaction> {
    let transaction = await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new ConflictException('Transaction is already cancelled');
    }

    this.checkPermissions(transaction, requesterId, requesterRole);

    transaction = await this.rollbackTransaction(transaction);
    transaction.status = TransactionStatus.CANCELLED;

    return this.transactionRepository.save(transaction);
  }

  private async rollbackTransaction(
    transaction: Transaction,
  ): Promise<Transaction> {
    switch (transaction.type) {
      case TypeTransaction.DEPOSIT:
        return this.cancelDeposit(transaction);
      case TypeTransaction.TRANSFER:
        return this.cancelTransfer(transaction);
      default:
        throw new BadRequestException('Unsupported transaction type');
    }
  }

  private async cancelDeposit(transaction: Transaction): Promise<Transaction> {
    await this.usersService.adjustBalance(
      transaction.toUser.id,
      -transaction.balance,
    );
    return transaction;
  }

  private async cancelTransfer(transaction: Transaction): Promise<Transaction> {
    if (!transaction.fromUser) {
      throw new BadRequestException('Transfer transaction must have a sender');
    }
    await this.usersService.adjustBalance(
      transaction.fromUser.id,
      transaction.balance,
    );
    await this.usersService.adjustBalance(
      transaction.toUser.id,
      -transaction.balance,
    );
    transaction.status = TransactionStatus.CANCELLED;
    return transaction;
  }

  private checkPermissions(
    transaction: Transaction,
    requesterId: string,
    requesterRole: Role,
  ) {
    if (requesterRole === Role.ADMIN) return;

    const isOwner =
      transaction.toUser?.id === requesterId ||
      transaction.fromUser?.id === requesterId;

    if (!isOwner) {
      throw new ForbiddenException(
        'You do not have permission to cancel this transaction',
      );
    }
  }
}
