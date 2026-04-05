import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { User } from 'src/users/entities/user.entity';
import { TypeTransaction } from 'src/transactions/enums/type-transaction.enum';
import { TransactionStatus } from 'src/transactions/enums/transaction-status.enum';

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
      // Initial deposits
      {
        balance: 5000,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        toUser: alice,
      },
      {
        balance: 3000,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        toUser: bob,
      },
      {
        balance: 1500,
        type: TypeTransaction.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        toUser: carol,
      },
      // Transfers between users
      {
        balance: 500,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.COMPLETED,
        fromUser: alice,
        toUser: bob,
        comment: 'Payment for services',
      },
      {
        balance: 200,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.COMPLETED,
        fromUser: bob,
        toUser: carol,
        comment: 'Thanks!',
      },
      {
        balance: 100,
        type: TypeTransaction.TRANSFER,
        status: TransactionStatus.CANCELLED,
        fromUser: carol,
        toUser: alice,
        comment: 'Cancelled payment',
      },
    ];

    await transactionRepo.save(transactionRepo.create(transactions as Transaction[]));
  }
}
