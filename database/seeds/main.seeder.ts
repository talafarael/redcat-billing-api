import { DataSource } from 'typeorm';
import { Seeder, runSeeder } from 'typeorm-extension';
import UserSeeder from './user.seed';
import TransactionSeeder from './transaction.seed';
export default class MainSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    await runSeeder(dataSource, UserSeeder);
    await runSeeder(dataSource, TransactionSeeder);
  }
}