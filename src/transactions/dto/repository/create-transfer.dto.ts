export class CreateTransferRepositoryDto {
  balance: number;
  fromUser: { id: string };
  toUser: { id: string };
  comment?: string;
}
