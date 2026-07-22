import { Type } from 'class-transformer';
import { IsOptional, IsString, Min } from 'class-validator';

export class RefundJazzCashDto {
  @IsString()
  originalTxnRefNo!: string;

  @Type(() => Number) @Min(1)
  amount!: number;

  @IsOptional() @IsString()
  reason?: string;
}
