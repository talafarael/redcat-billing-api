import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTransactionBalanceToAmount1744000000000
  implements MigrationInterface
{
  name = 'RenameTransactionBalanceToAmount1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" RENAME COLUMN "balance" TO "amount"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" RENAME COLUMN "amount" TO "balance"`,
    );
  }
}
