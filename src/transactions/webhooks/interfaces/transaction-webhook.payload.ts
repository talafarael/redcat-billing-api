import { Transaction } from '@/transactions/entities/transaction.entity';

export type TransactionWebhookEvent =
  | 'transaction.created'
  | 'transaction.cancelled';

export interface TransactionWebhookPayload {
  event: TransactionWebhookEvent;
  transaction: Transaction;
}
