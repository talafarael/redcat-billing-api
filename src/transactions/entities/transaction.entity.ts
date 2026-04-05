import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TypeTransaction } from '@/transactions/enums/type-transaction.enum';
import { TransactionStatus } from '@/transactions/enums/transaction-status.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  amount: number;

  @Column({ type: 'enum', enum: TypeTransaction })
  type: TypeTransaction;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  comment?: string;

  @ManyToOne(() => User, (user) => user.sentTransactions, { nullable: true })
  fromUser: User | null;

  @ManyToOne(() => User, (user) => user.receivedTransactions)
  toUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
