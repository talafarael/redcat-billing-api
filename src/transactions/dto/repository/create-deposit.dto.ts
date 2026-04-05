export class CreateDepositRepositoryDto {
  amount: number;
  toUser: { id: string };
  comment?: string;
}
