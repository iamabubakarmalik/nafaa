import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** Where money came from or went to. */
export const MONEY_SOURCES = ['SALE', 'KHATA', 'CASH_IN', 'REFUND', 'PURCHASE', 'SUPPLIER', 'EXPENSE', 'CASH_OUT'] as const;
export type MoneySource = (typeof MONEY_SOURCES)[number];

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export class MoneyPeriodDto {
  /** Business-day keys (YYYY-MM-DD); the last 30 days when left out. */
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) from?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) to?: string;
  /** One account (payment method); every account when left out. */
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) account?: PaymentMethod;
}

export class MoneyLedgerDto extends MoneyPeriodDto {
  @ApiPropertyOptional({ enum: MONEY_SOURCES }) @IsOptional() @IsIn(MONEY_SOURCES as unknown as string[]) source?: MoneySource;
  @ApiPropertyOptional({ enum: ['in', 'out'] }) @IsOptional() @IsIn(['in', 'out']) direction?: 'in' | 'out';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  /** Up to 500 so a statement can be printed in one go. */
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}
