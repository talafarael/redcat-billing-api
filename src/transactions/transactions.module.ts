import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/modules/database/database.module';
import { UsersModule } from '@/users/users.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionWebhook } from './webhooks/transaction.webhook';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionRepository, TransactionWebhook],
  exports: [TransactionsService],
})
export class TransactionsModule {}
