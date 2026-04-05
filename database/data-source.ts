import * as dotenv from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';

dotenv.config();

const root = process.cwd();
const seedsPath = join(root, 'database', 'seeds', 'main.seeder.ts');

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'redcat',
  entities: [join(root, 'src', '**/*.entity{.ts,.js}')],
  migrations: [join(root, 'database', 'migrations', '*.{ts,js}')],
  synchronize: false,
};

export const AppDataSource = new DataSource(
  Object.assign(options, { seeds: [seedsPath] }) as DataSourceOptions,
);
