import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../enums/role.enum';
import { Exclude } from 'class-transformer';
import { Transaction } from 'src/transactions/entities/transaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  refreshToken: string | null;

  @OneToMany(() => Transaction, (transaction) => transaction.fromUser)
  sentTransactions: Transaction[];

  @OneToMany(() => Transaction, (transaction) => transaction.toUser)
  receivedTransactions: Transaction[];

  @Column({ type: 'enum', enum: Role, default: Role.ClIENT })
  role: Role;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
