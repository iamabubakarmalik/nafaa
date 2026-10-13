import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DAY_KEY = /^(\d{4}-\d{2}-\d{2}|all)$/;

/** A business-day period; `from = 'all'` means since the first record. */
export class StaffPeriodDto {
  @IsOptional() @Matches(DAY_KEY) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}

export const BILL_KINDS = ['all', 'discount', 'credit', 'returned', 'voided', 'big'] as const;
export type BillKind = (typeof BILL_KINDS)[number];

export class StaffBillsDto extends StaffPeriodDto {
  @IsString() @MaxLength(60) userId!: string;
  @IsOptional() @IsIn(BILL_KINDS as unknown as string[]) kind?: BillKind;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100) limit?: number;
}

export const SHIFT_STATUSES = ['open', 'closed', 'short', 'over', 'matched'] as const;
export type ShiftFilter = (typeof SHIFT_STATUSES)[number];

export class StaffShiftsDto extends StaffPeriodDto {
  @IsOptional() @IsString() @MaxLength(60) staffId?: string;
  @IsOptional() @IsIn(SHIFT_STATUSES as unknown as string[]) status?: ShiftFilter;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(200) limit?: number;
}
