export class CreateDepositRepositoryDto {
  balance: number;
  toUser: { id: string };
  comment?: string;
}
