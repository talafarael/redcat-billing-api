import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import config from './common/config/config';
import { validate } from './common/config/validation';
import { AllExceptionsFilter } from './common/filters/logger-exceptions.filter';
import { LoggerModule } from './common/logger/logger.module';
import { DatabaseModule } from './common/modules/database/database.module';
import { WebhookModule } from './common/modules/webhook/webhook.module';

import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validate,
    }),
    DatabaseModule,
    LoggerModule,
    WebhookModule,
    AuthModule,
    TransactionsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
