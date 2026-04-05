export class CreateTransferRepositoryDto {
  amount: number;
  fromUser: { id: string };
  toUser: { id: string };
  comment?: string;
}
