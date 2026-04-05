import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { runSeeder } from 'typeorm-extension';
import MainSeeder from '../../../../database/seeds/main.seeder';

export async function runDevSeedIfNeeded(
  dataSource: DataSource,
  nodeEnv: string | undefined,
): Promise<void> {
  if (nodeEnv !== 'development') {
    return;
  }
  console.log('Running development seed...');
  const logger = new Logger('DevSeed');
  await runSeeder(dataSource, MainSeeder);
  logger.log('Development seed completed.');
}
