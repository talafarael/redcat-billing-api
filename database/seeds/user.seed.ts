import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '@/users/entities/user.entity';
import { Role } from '@/users/enums/role.enum';

const USERS: Array<Partial<User> & { rawPassword: string }> = [
  {
    email: 'admin@redcat.com',
    rawPassword: 'Admin1234!',
    role: Role.ADMIN,
    balance: 0,
    isActive: true,
  },
  {
    email: 'alice@example.com',
    rawPassword: 'Password1!',
    role: Role.CLIENT,
    balance: 5000,
    isActive: true,
  },
  {
    email: 'bob@example.com',
    rawPassword: 'Password1!',
    role: Role.CLIENT,
    balance: 3000,
    isActive: true,
  },
  {
    email: 'carol@example.com',
    rawPassword: 'Password1!',
    role: Role.CLIENT,
    balance: 1500,
    isActive: true,
  },
  {
    email: 'dave@example.com',
    rawPassword: 'Password1!',
    role: Role.CLIENT,
    balance: 0,
    isActive: false,
  },
];

export default class UserSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(User);

    for (const { rawPassword, ...userData } of USERS) {
      const exists = await repo.findOne({ where: { email: userData.email } });
      if (exists) continue;

      const password = await bcrypt.hash(rawPassword, 10);
      const user = repo.create({ ...userData, password });
      await repo.save(user);
    }
  }
}
