import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Transaction } from '@/transactions/entities/transaction.entity';
import { TypeTransaction } from '@/transactions/enums/type-transaction.enum';
import { TransactionStatus } from '@/transactions/enums/transaction-status.enum';
import { CreateDepositRepositoryDto } from '@/transactions/dto/repository/create-deposit.dto';
import { CreateTransferRepositoryDto } from '@/transactions/dto/repository/create-transfer.dto';
import { PaginationQueryDto } from '@/common/pagination/dto/request/pagination-query.dto';

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

  createDeposit(
    dto: CreateDepositRepositoryDto,
    manager?: EntityManager,
  ): Promise<Transaction> {
    const repo = manager ? manager.getRepository(Transaction) : this;
    return repo.save(
      repo.create({
        ...dto,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
      }),
    );
  }

  createTransfer(
    dto: CreateTransferRepositoryDto,
    manager?: EntityManager,
  ): Promise<Transaction> {
    const repo = manager ? manager.getRepository(Transaction) : this;
    return repo.save(
      repo.create({
        ...dto,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.COMPLETED,
      }),
    );
  }

  saveTransaction(
    entity: Transaction,
    manager?: EntityManager,
  ): Promise<Transaction> {
    const repo = manager ? manager.getRepository(Transaction) : this;
    return repo.save(entity);
  }

  findByUserId(
    userId: string,
    { page, limit }: PaginationQueryDto,
  ): Promise<[Transaction[], number]> {
    return this.findAndCount({
      where: [{ fromUser: { id: userId } }, { toUser: { id: userId } }],
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAll({
    page,
    limit,
  }: PaginationQueryDto): Promise<[Transaction[], number]> {
    return this.findAndCount({
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
