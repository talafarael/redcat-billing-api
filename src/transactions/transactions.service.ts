import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UsersService } from '@/users/users.service';
import { Role } from '@/users/enums/role.enum';
import { TransactionRepository } from './repositories/transaction.repository';
import { Transaction } from './entities/transaction.entity';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TypeTransaction } from './enums/type-transaction.enum';
import { CreateDepositDto } from './dto/request/create-deposit.dto';
import { CreateTransferDto } from './dto/request/create-transfer.dto';
import { PaginatedTransactionsResponseDto } from './dto/response/paginated-transactions.dto';
import { PaginationQueryDto } from '@/common/pagination/dto/request/pagination-query.dto';
import { buildPaginatedResponse } from '@/common/pagination/dto/response/paginated-response.util';
import { TransactionWebhook } from './webhooks/tranasction.webhook';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionRepository: TransactionRepository,
    private readonly usersService: UsersService,
    private readonly transactionWebhook: TransactionWebhook,
  ) { }

  async createDeposit(dto: CreateDepositDto): Promise<Transaction> {
    await this.usersService.findByIdOrFail(dto.toUserId);

    const created = await this.dataSource.transaction(async (manager) => {
      await this.usersService.adjustBalance(dto.toUserId, dto.amount, manager);

      return this.transactionRepository.createDeposit(
        {
          ...dto,
          amount: dto.amount,
          toUser: { id: dto.toUserId },
        },
        manager,
      );
    });

    void this.transactionWebhook.notify(created.id, 'transaction.created');

    return created;
  }

  async createTransfer(
    dto: CreateTransferDto,
    fromUserId: string,
  ): Promise<Transaction> {
    if (fromUserId === dto.toUserId) {
      throw new BadRequestException('Cannot transfer funds to yourself');
    }

    await Promise.all([
      this.usersService.findByIdOrFail(fromUserId),
      this.usersService.findByIdOrFail(dto.toUserId),
    ]);

    const created = await this.dataSource.transaction(async (manager) => {
      await this.usersService.debitBalanceIfSufficient(
        fromUserId,
        dto.amount,
        manager,
      );
      await this.usersService.adjustBalance(dto.toUserId, dto.amount, manager);

      return this.transactionRepository.createTransfer(
        {
          amount: dto.amount,
          fromUser: { id: fromUserId },
          toUser: { id: dto.toUserId },
          comment: dto.comment,
        },
        manager,
      );
    });

    void this.transactionWebhook.notify(created.id, 'transaction.created');

    return created;
  }

  async getMyTransactions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    const [data, total] = await this.transactionRepository.findByUserId(
      userId,
      query,
    );
    return buildPaginatedResponse<Transaction>(data, total, query);
  }

  async getAllTransactions(
    query: PaginationQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    const [data, total] = await this.transactionRepository.findAll(query);
    return buildPaginatedResponse<Transaction>(data, total, query);
  }

  async cancelTransaction(
    transactionId: string,
    requesterId: string,
    requesterRole: Role,
  ): Promise<Transaction> {
    const transaction =
      await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new ConflictException('Transaction is already cancelled');
    }

    this.checkPermissions(transaction, requesterId, requesterRole);

    const cancelled = await this.dataSource.transaction(async (manager) => {
      await this.rollbackTransaction(transaction, manager);
      transaction.status = TransactionStatus.CANCELLED;
      return this.transactionRepository.saveTransaction(transaction, manager);
    });

    void this.transactionWebhook.notify(
      cancelled.id,
      'transaction.cancelled',
    );

    return cancelled;
  }

  private async rollbackTransaction(
    transaction: Transaction,
    manager: EntityManager,
  ): Promise<void> {
    switch (transaction.type) {
      case TypeTransaction.DEPOSIT:
        await this.cancelDeposit(transaction, manager);
        return;
      case TypeTransaction.TRANSFER:
        await this.cancelTransfer(transaction, manager);
        return;
      default:
        throw new BadRequestException('Unsupported transaction type');
    }
  }

  private async cancelDeposit(
    transaction: Transaction,
    manager: EntityManager,
  ): Promise<void> {
    await this.usersService.adjustBalance(
      transaction.toUser.id,
      -transaction.amount,
      manager,
    );
  }

  private async cancelTransfer(
    transaction: Transaction,
    manager: EntityManager,
  ): Promise<void> {
    if (!transaction.fromUser) {
      throw new BadRequestException('Transfer transaction must have a sender');
    }
    await this.usersService.adjustBalance(
      transaction.fromUser.id,
      transaction.amount,
      manager,
    );
    await this.usersService.adjustBalance(
      transaction.toUser.id,
      -transaction.amount,
      manager,
    );
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
