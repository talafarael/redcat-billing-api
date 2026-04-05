import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PaginationQueryDto } from 'src/common/dto/request/pagination-query.dto';

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
}
