import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Transaction } from '@/transactions/entities/transaction.entity';
import { User } from '@/users/entities/user.entity';
import { TypeTransaction } from '@/transactions/enums/type-transaction.enum';
import { TransactionStatus } from '@/transactions/enums/transaction-status.enum';

export default class TransactionSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const transactionRepo = dataSource.getRepository(Transaction);
    const userRepo = dataSource.getRepository(User);

    const count = await transactionRepo.count();

    if (count > 0) return;
    const [alice, bob, carol] = await Promise.all([
      userRepo.findOne({ where: { email: 'alice@example.com' } }),
      userRepo.findOne({ where: { email: 'bob@example.com' } }),
      userRepo.findOne({ where: { email: 'carol@example.com' } }),
    ]);

    if (!alice || !bob || !carol) {
      console.warn('TransactionSeeder: required users not found, skipping.');
      return;
    }

    const transactions: Partial<Transaction>[] = [
      {
        amount: 5000,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        toUser: alice,
      },
      {
        amount: 3000,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        toUser: bob,
      },
      {
        amount: 1500,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        toUser: carol,
      },
      {
        amount: 500,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.COMPLETED,
        fromUser: alice,
        toUser: bob,
        comment: 'Payment for services',
      },
      {
        amount: 200,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.COMPLETED,
        fromUser: bob,
        toUser: carol,
        comment: 'Thanks!',
      },
      {
        amount: 100,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.CANCELLED,
        fromUser: carol,
        toUser: alice,
        comment: 'Cancelled payment',
      },
    ];

    await transactionRepo.save(
      transactionRepo.create(transactions as Transaction[]),
    );
  }
}
