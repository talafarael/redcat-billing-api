import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TypeTransaction } from '../enums/type-transaction.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { CreateDepositRepositoryDto } from '../dto/repository/create-deposit.dto';
import { CreateTransferRepositoryDto } from '../dto/repository/create-transfer.dto';
import { PaginationQueryDto } from 'src/common/dto/request/pagination-query.dto';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  findById(id: string): Promise<Transaction | null> {
    return this.findOne({
      where: { id },
      relations: ['fromUser', 'toUser'],
    });
  }

  createDeposit(dto: CreateDepositRepositoryDto): Promise<Transaction> {
    return this.save(
      this.create({
        ...dto,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
      }),
    );
  }

  createTransfer(dto: CreateTransferRepositoryDto): Promise<Transaction> {
    return this.save(
      this.create({
        ...dto,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.COMPLETED,
      }),
    );
  }

  findByUserId(
    userId: string,
    { page, limit }: PaginationQueryDto
  ): Promise<[Transaction[], number]> {
    return this.findAndCount({
      where: [{ fromUser: { id: userId } }, { toUser: { id: userId } }],
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAll({ page, limit }: PaginationQueryDto): Promise<[Transaction[], number]> {
    return this.findAndCount({
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
