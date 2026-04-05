import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '@/common/logger/app-logger.service';
import { WebhookService } from '@/common/modules/webhook/webhook.service';
import { User } from '@/users/entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TypeTransaction } from '../enums/type-transaction.enum';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionWebhook } from './transaction.webhook';

describe('TransactionWebhook', () => {
  let service: TransactionWebhook;
  let config: { get: jest.Mock };
  let webhookService: { sendJson: jest.Mock };
  let transactionRepository: { findById: jest.Mock };
  let logger: { error: jest.Mock };

  const txId = '33333333-3333-3333-3333-333333333333';
  const userId = '11111111-1111-1111-1111-111111111111';

  const baseTransaction = (): Transaction =>
    ({
      id: txId,
      amount: 10,
      type: TypeTransaction.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      fromUser: null,
      toUser: { id: userId } as User,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Transaction;

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'webhook.url') return 'https://hooks.example/transactions';
        return undefined;
      }),
    };
    webhookService = { sendJson: jest.fn().mockResolvedValue({ status: 200 }) };
    transactionRepository = { findById: jest.fn() };
    logger = { error: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionWebhook,
        { provide: ConfigService, useValue: config },
        { provide: WebhookService, useValue: webhookService },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(TransactionWebhook);
  });

  describe('notify', () => {
    it('does nothing when webhook URL is not configured', async () => {
      config.get.mockReturnValue(undefined);

      await service.notify(txId, 'transaction.created');

      expect(transactionRepository.findById).not.toHaveBeenCalled();
      expect(webhookService.sendJson).not.toHaveBeenCalled();
    });

    it('does nothing when URL is blank after trim', async () => {
      config.get.mockReturnValue('   ');

      await service.notify(txId, 'transaction.created');

      expect(transactionRepository.findById).not.toHaveBeenCalled();
      expect(webhookService.sendJson).not.toHaveBeenCalled();
    });

    it('does nothing when transaction is not found', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await service.notify(txId, 'transaction.created');

      expect(transactionRepository.findById).toHaveBeenCalledWith(txId);
      expect(webhookService.sendJson).not.toHaveBeenCalled();
    });

    it('sends JSON payload with event and transaction', async () => {
      const tx = baseTransaction();
      transactionRepository.findById.mockResolvedValue(tx);

      await service.notify(txId, 'transaction.cancelled');

      expect(webhookService.sendJson).toHaveBeenCalledWith(
        'https://hooks.example/transactions',
        {
          event: 'transaction.cancelled',
          transaction: tx,
        },
      );
    });

    it('logs error and does not rethrow when sendJson fails', async () => {
      const err = new Error('network');
      webhookService.sendJson.mockRejectedValue(err);
      transactionRepository.findById.mockResolvedValue(baseTransaction());

      await expect(
        service.notify(txId, 'transaction.created'),
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        '[TransactionWebhook] Webhook request failed',
        err.stack,
      );
    });
  });
});
