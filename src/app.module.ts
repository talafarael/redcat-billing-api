import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './common/modules/database/database.module';
import { validate } from './common/config/validation';
import config from './common/config/config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WebhookModule } from './common/modules/webhook/webhook.module';
import { AllExceptionsFilter } from './common/filters/logger-exceptions.filter';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    WebhookModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validate,
    }),
    AuthModule,
    TransactionsModule,
    LoggerModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
