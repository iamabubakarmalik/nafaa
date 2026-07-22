import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Min } from 'class-validator';

export class InitiateJazzCashDto {
  @IsString()
  orderId!: string;

  @Type(() => Number) @Min(1)
  amount!: number;

  @IsIn(['WALLET', 'CARD', 'VOUCHER'])
  paymentType!: 'WALLET' | 'CARD' | 'VOUCHER';

  @IsOptional() @IsString()
  mobileNumber?: string; // required for WALLET

  @IsOptional() @IsString()
  cnic?: string; // required for WALLET (last 6 digits)

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  returnUrl?: string;
}
