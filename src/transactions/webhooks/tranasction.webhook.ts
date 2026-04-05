import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@/common/logger/app-logger.service';
import { WebhookService } from '@/common/modules/webhook/webhook.service';
import { Transaction } from '../entities/transaction.entity';
import { TransactionRepository } from '../repositories/transaction.repository';
import type {
  TransactionWebhookEvent,
  TransactionWebhookPayload,
} from './interfaces/transaction-webhook.payload';
export type { TransactionWebhookEvent, TransactionWebhookPayload };

@Injectable()
export class TransactionWebhook {
  constructor(
    private readonly config: ConfigService,
    private readonly webhookService: WebhookService,
    private readonly transactionRepository: TransactionRepository,
    private readonly logger: AppLoggerService,
  ) { }

  async notify(
    transactionId: string,
    event: TransactionWebhookEvent,
  ): Promise<void> {
    const url = this.getWebhookUrl();
    if (!url) {
      return;
    }

    const transaction =
      await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      return;
    }

    const payload = this.buildPayload(transaction, event);

    try {
      await this.webhookService.sendJson(url, payload);
    } catch (err) {
      this.logger.error(
        `[${TransactionWebhook.name}] Webhook request failed`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private getWebhookUrl(): string | undefined {
    const url = this.config.get<string>('webhook.url')?.trim();
    return url && url.length > 0 ? url : undefined;
  }

  private buildPayload(
    transaction: Transaction,
    event: TransactionWebhookEvent,
  ): TransactionWebhookPayload {
    return {
      event,
      transaction,
    };
  }
}
