import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncomeReceivedVia } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';

/** Fixed kinds of other income; CUSTOM means one of the shop's own categories (categoryId). */
export const INCOME_CATEGORIES = ['COMPANY_INCENTIVE', 'SCHEME_CLAIM', 'COMMISSION', 'RENT', 'INTEREST', 'OTHER', 'CUSTOM'] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateIncomeDto {
  @ApiProperty({ example: 'Pepsi incentive — October' })
  @IsString() @IsNotEmpty() @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 5000 })
  @IsNumber() @Min(1) @Max(1_000_000_000)
  amount!: number;

  @ApiProperty({ enum: INCOME_CATEGORIES })
  @IsIn(INCOME_CATEGORIES)
  category!: IncomeCategory;

  /** Required when category is CUSTOM. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Business-day key ("2026-10-29") or ISO time; today by default.' })
  @IsOptional() @IsDateString()
  incomeDate?: string;

  @ApiPropertyOptional({ description: 'Company that paid, when it is a supplier.' })
  @IsOptional() @IsString() @MaxLength(64)
  supplierId?: string;

  @ApiProperty({ enum: IncomeReceivedVia })
  @IsEnum(IncomeReceivedVia)
  receivedVia!: IncomeReceivedVia;

  /** Required when receivedVia is ACCOUNT. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  moneyAccountId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  repeatMonthly?: boolean;

  /** Branch; the one in view by default. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  shopId?: string;
}

export class UpdateIncomeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) title?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(1_000_000_000) amount?: number;
  @IsOptional() @IsIn(INCOME_CATEGORIES) category?: IncomeCategory;
  @IsOptional() @IsString() @MaxLength(64) categoryId?: string | null;
  @IsOptional() @IsDateString() incomeDate?: string;
  @IsOptional() @IsString() @MaxLength(64) supplierId?: string | null;
  @IsOptional() @IsEnum(IncomeReceivedVia) receivedVia?: IncomeReceivedVia;
  @IsOptional() @IsString() @MaxLength(64) moneyAccountId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) note?: string | null;
  @IsOptional() @IsBoolean() repeatMonthly?: boolean;
}

export class ListIncomeDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @Matches(DAY_KEY) from?: string;
  @ApiPropertyOptional({ example: '2026-10-31' }) @IsOptional() @Matches(DAY_KEY) to?: string;
  /** A fixed category, or a custom category id. */
  @IsOptional() @IsString() @MaxLength(64) category?: string;
  @IsOptional() @IsString() @MaxLength(64) supplierId?: string;
  @IsOptional() @IsEnum(IncomeReceivedVia) receivedVia?: IncomeReceivedVia;
  @IsOptional() @IsString() @MaxLength(64) shopId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class IncomeCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
