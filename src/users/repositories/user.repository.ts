import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { PaginationQueryDto } from '@/common/pagination/dto/request/pagination-query.dto';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  }

  findAll({ page, limit }: PaginationQueryDto): Promise<[User[], number]> {
    return this.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async debitBalanceAtomic(
    userId: string,
    amount: number,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(User) : this;
    const result = await repo
      .createQueryBuilder()
      .update(User)
      .set({ balance: () => 'balance - :amount' })
      .where('id = :userId', { userId })
      .andWhere('balance >= :amount', { amount })
      .andWhere('isActive = :active', { active: true })
      .execute();
    return result.affected ?? 0;
  }
}
