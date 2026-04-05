import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { PaginationQueryDto } from '@/common/pagination/dto/request/pagination-query.dto';
import { Role } from '@/users/enums/role.enum';
import { User } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TypeTransaction } from './enums/type-transaction.enum';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionsService } from './transactions.service';
import { TransactionWebhook } from './webhooks/transaction.webhook';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let dataSource: { transaction: jest.Mock };
  let transactionRepository: jest.Mocked<
    Pick<
      TransactionRepository,
      | 'createDeposit'
      | 'createTransfer'
      | 'findByUserId'
      | 'findAll'
      | 'findById'
      | 'saveTransaction'
    >
  >;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      'findByIdOrFail' | 'adjustBalance' | 'debitBalanceIfSufficient'
    >
  >;
  let transactionWebhook: { notify: jest.Mock };

  const userIdA = '11111111-1111-1111-1111-111111111111';
  const userIdB = '22222222-2222-2222-2222-222222222222';
  const txId = '33333333-3333-3333-3333-333333333333';

  const mockManager = {} as EntityManager;

  const baseUser = (id: string): User =>
    ({
      id,
      email: 'u@example.com',
      password: 'h',
      refreshToken: null,
      role: Role.CLIENT,
      balance: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as User;

  const baseTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
    ({
      id: txId,
      amount: 50,
      type: TypeTransaction.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      comment: undefined,
      fromUser: null,
      toUser: { id: userIdA } as User,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Transaction;

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(async <T>(fn: (m: EntityManager) => Promise<T>) =>
        fn(mockManager),
      ),
    };
    transactionRepository = {
      createDeposit: jest.fn(),
      createTransfer: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      saveTransaction: jest.fn(),
    };
    usersService = {
      findByIdOrFail: jest.fn(),
      adjustBalance: jest.fn().mockResolvedValue(undefined),
      debitBalanceIfSufficient: jest.fn().mockResolvedValue(undefined),
    };
    transactionWebhook = { notify: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DataSource, useValue: dataSource },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: UsersService, useValue: usersService },
        { provide: TransactionWebhook, useValue: transactionWebhook },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  describe('createDeposit', () => {
    it('validates user, adjusts balance, creates deposit, notifies webhook', async () => {
      const created = baseTransaction();
      usersService.findByIdOrFail.mockResolvedValue(baseUser(userIdA));
      transactionRepository.createDeposit.mockResolvedValue(created);

      const dto = { amount: 100, toUserId: userIdA, comment: 'top up' };
      await expect(service.createDeposit(dto)).resolves.toBe(created);

      expect(usersService.findByIdOrFail).toHaveBeenCalledWith(userIdA);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(usersService.adjustBalance).toHaveBeenCalledWith(
        userIdA,
        100,
        mockManager,
      );
      expect(transactionRepository.createDeposit).toHaveBeenCalledWith(
        {
          ...dto,
          toUser: { id: userIdA },
        },
        mockManager,
      );
      expect(transactionWebhook.notify).toHaveBeenCalledWith(
        created.id,
        'transaction.created',
      );
    });
  });

  describe('createTransfer', () => {
    it('throws BadRequestException when sender and recipient are the same', async () => {
      await expect(
        service.createTransfer(
          { amount: 10, toUserId: userIdA },
          userIdA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersService.findByIdOrFail).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('debits sender, credits recipient, creates transfer, notifies webhook', async () => {
      const created = baseTransaction({
        type: TypeTransaction.TRANSFER,
        fromUser: { id: userIdA } as User,
        toUser: { id: userIdB } as User,
      });
      usersService.findByIdOrFail.mockResolvedValue(baseUser(userIdA));
      transactionRepository.createTransfer.mockResolvedValue(created);

      const dto = { amount: 25, toUserId: userIdB, comment: 'pay' };
      await expect(service.createTransfer(dto, userIdA)).resolves.toBe(created);

      expect(usersService.findByIdOrFail).toHaveBeenCalledWith(userIdA);
      expect(usersService.findByIdOrFail).toHaveBeenCalledWith(userIdB);
      expect(usersService.debitBalanceIfSufficient).toHaveBeenCalledWith(
        userIdA,
        25,
        mockManager,
      );
      expect(usersService.adjustBalance).toHaveBeenCalledWith(
        userIdB,
        25,
        mockManager,
      );
      expect(transactionRepository.createTransfer).toHaveBeenCalledWith(
        {
          amount: 25,
          fromUser: { id: userIdA },
          toUser: { id: userIdB },
          comment: 'pay',
        },
        mockManager,
      );
      expect(transactionWebhook.notify).toHaveBeenCalledWith(
        created.id,
        'transaction.created',
      );
    });
  });

  describe('getMyTransactions', () => {
    it('returns paginated payload from repository', async () => {
      const rows = [baseTransaction()];
      transactionRepository.findByUserId.mockResolvedValue([rows, 7]);
      const query: PaginationQueryDto = { page: 1, limit: 5 };

      await expect(service.getMyTransactions(userIdA, query)).resolves.toEqual({
        data: rows,
        total: 7,
        page: 1,
        limit: 5,
        totalPages: 2,
      });
      expect(transactionRepository.findByUserId).toHaveBeenCalledWith(
        userIdA,
        query,
      );
    });
  });

  describe('getAllTransactions', () => {
    it('returns paginated payload from repository', async () => {
      const rows = [baseTransaction()];
      transactionRepository.findAll.mockResolvedValue([rows, 100]);
      const query: PaginationQueryDto = { page: 2, limit: 10 };

      await expect(service.getAllTransactions(query)).resolves.toEqual({
        data: rows,
        total: 100,
        page: 2,
        limit: 10,
        totalPages: 10,
      });
      expect(transactionRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('cancelTransaction', () => {
    it('throws NotFoundException when transaction does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);
      await expect(
        service.cancelTransaction(txId, userIdA, Role.CLIENT),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when transaction is already cancelled', async () => {
      transactionRepository.findById.mockResolvedValue(
        baseTransaction({ status: TransactionStatus.CANCELLED }),
      );
      await expect(
        service.cancelTransaction(txId, userIdA, Role.CLIENT),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when requester is not owner and not admin', async () => {
      transactionRepository.findById.mockResolvedValue(
        baseTransaction({
          toUser: { id: userIdB } as User,
        }),
      );
      await expect(
        service.cancelTransaction(txId, userIdA, Role.CLIENT),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('allows admin to cancel any transaction', async () => {
      const tx = baseTransaction({
        toUser: { id: userIdB } as User,
      });
      transactionRepository.findById.mockResolvedValue(tx);
      const saved = { ...tx, status: TransactionStatus.CANCELLED };
      transactionRepository.saveTransaction.mockResolvedValue(saved);
      usersService.adjustBalance.mockResolvedValue(undefined);

      await expect(
        service.cancelTransaction(txId, userIdA, Role.ADMIN),
      ).resolves.toBe(saved);

      expect(usersService.adjustBalance).toHaveBeenCalledWith(
        userIdB,
        -50,
        mockManager,
      );
      expect(transactionRepository.saveTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.CANCELLED }),
        mockManager,
      );
      expect(transactionWebhook.notify).toHaveBeenCalledWith(
        saved.id,
        'transaction.cancelled',
      );
    });

    it('cancels deposit for owner: reverses balance on recipient', async () => {
      const tx = baseTransaction({
        type: TypeTransaction.DEPOSIT,
        toUser: { id: userIdA } as User,
      });
      transactionRepository.findById.mockResolvedValue(tx);
      const saved = { ...tx, status: TransactionStatus.CANCELLED };
      transactionRepository.saveTransaction.mockResolvedValue(saved);

      await expect(
        service.cancelTransaction(txId, userIdA, Role.CLIENT),
      ).resolves.toBe(saved);

      expect(usersService.adjustBalance).toHaveBeenCalledWith(
        userIdA,
        -50,
        mockManager,
      );
      expect(transactionWebhook.notify).toHaveBeenCalledWith(
        saved.id,
        'transaction.cancelled',
      );
    });

    it('cancels transfer: restores sender and recipient balances', async () => {
      const tx = baseTransaction({
        type: TypeTransaction.TRANSFER,
        fromUser: { id: userIdA } as User,
        toUser: { id: userIdB } as User,
      });
      transactionRepository.findById.mockResolvedValue(tx);
      const saved = { ...tx, status: TransactionStatus.CANCELLED };
      transactionRepository.saveTransaction.mockResolvedValue(saved);

      await expect(
        service.cancelTransaction(txId, userIdA, Role.CLIENT),
      ).resolves.toBe(saved);

      expect(usersService.adjustBalance).toHaveBeenCalledWith(
        userIdA,
        50,
        mockManager,
      );
      expect(usersService.adjustBalance).toHaveBeenCalledWith(
        userIdB,
        -50,
        mockManager,
      );
    });

    it('throws BadRequestException when transfer has no sender', async () => {
      const tx = baseTransaction({
        type: TypeTransaction.TRANSFER,
        fromUser: null,
        toUser: { id: userIdB } as User,
      });
      transactionRepository.findById.mockResolvedValue(tx);

      await expect(
        service.cancelTransaction(txId, userIdB, Role.CLIENT),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionRepository.saveTransaction).not.toHaveBeenCalled();
    });
  });
});
