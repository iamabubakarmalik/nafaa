import { IsOptional, IsString } from 'class-validator';

export class VerifyJazzCashDto {
  @IsString()
  txnRefNo!: string;

  @IsOptional() @IsString()
  orderId?: string;
}
