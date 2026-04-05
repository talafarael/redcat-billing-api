import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

const projectRoot = process.cwd();

export const databaseProviders = [
  {
    provide: DataSource,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: Number(configService.get<number>('database.port')),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [join(projectRoot, 'dist', 'src', '**', '*.entity.js')],
        migrations: [join(projectRoot, 'database', 'migrations', '*.{ts,js}')],
        migrationsRun: true,
        synchronize: false,
      });

      return dataSource.initialize();
    },
  },
];
