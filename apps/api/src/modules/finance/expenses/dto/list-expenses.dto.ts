import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Filters shared by the expense list and its analytics. Dates are business-day keys. */
export class ExpenseFilterDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @Matches(DAY_KEY) from?: string;
  @ApiPropertyOptional({ example: '2026-10-13' }) @IsOptional() @Matches(DAY_KEY) to?: string;
  /** A category id, or "none" for expenses without one. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) categoryId?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  /** Narrows the all-branches view to one branch. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) createdById?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class ListExpensesDto extends ExpenseFilterDto {
  @ApiPropertyOptional({ enum: ExpenseStatus }) @IsOptional() @IsEnum(ExpenseStatus) status?: ExpenseStatus;
  @ApiPropertyOptional({ enum: ['recent', 'amount'] }) @IsOptional() @IsIn(['recent', 'amount']) sort?: 'recent' | 'amount';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number;
}
