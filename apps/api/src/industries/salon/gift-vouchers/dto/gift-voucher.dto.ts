import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, SalonGiftVoucherStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

/** Selling a gift voucher: paid in full now, by one method. */
export class SellVoucherDto {
  @ApiProperty({ example: 5000 }) @IsNumber() @Min(100) @Max(1_000_000) amount!: number;
  @ApiPropertyOptional({ description: 'Customer the voucher is for (or who bought it)' }) @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ description: 'Last day it can be used, yyyy-mm-dd in the shop\'s calendar; left out, no end' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) expiryDate?: string;
  @ApiProperty({ enum: MONEY_METHODS }) @Transform(bankAlias) @IsIn(MONEY_METHODS) paymentMethod!: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class VoucherListQuery {
  @IsOptional() @IsEnum(SalonGiftVoucherStatus) status?: SalonGiftVoucherStatus;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() customerId?: string;
}
