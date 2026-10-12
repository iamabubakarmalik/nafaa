import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const STOCK_STATUSES = [
  'all', 'in', 'low', 'out', 'dead', 'slow', 'fast', 'expiry', 'blocked', 'raw', 'made', 'noCost', 'negative', 'inactive',
] as const;
export const STOCK_SORTS = ['value', 'retail', 'profit', 'margin', 'stock', 'age', 'sold', 'revenue', 'cover', 'name'] as const;

export type StockStatusFilter = (typeof STOCK_STATUSES)[number];
export type StockSort = (typeof STOCK_SORTS)[number];

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Filters shared by the list, analytics, branch and period views. */
export class StockFilterDto {
  /** Business days "YYYY-MM-DD"; sales and movements are counted inside this period. */
  @IsOptional() @Matches(DAY_KEY) from?: string;
  @IsOptional() @Matches(DAY_KEY) to?: string;
  /** Category id, or "none" for products without one. */
  @IsOptional() @IsString() @MaxLength(60) categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) brandId?: string;
  /** Supplier of the last purchase, or "none". */
  @IsOptional() @IsString() @MaxLength(60) supplierId?: string;
  /** Industry type: agri, appliance or electronics category. */
  @IsOptional() @IsString() @MaxLength(60) group?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  /** Stock with no sale for this many days counts as dead. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(365) deadDays?: number;
}

export class StockListDto extends StockFilterDto {
  @IsOptional() @IsIn(STOCK_STATUSES as unknown as string[]) status?: StockStatusFilter;
  @IsOptional() @IsIn(STOCK_SORTS as unknown as string[]) sort?: StockSort;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit?: number;
}

export const LEDGER_SORTS = ['closing', 'change', 'in', 'out', 'name'] as const;
export type LedgerSort = (typeof LEDGER_SORTS)[number];

export class StockLedgerDto extends StockFilterDto {
  /** "moved" = only items that moved in the period. */
  @IsOptional() @IsIn(['all', 'moved']) show?: 'all' | 'moved';
  @IsOptional() @IsIn(LEDGER_SORTS as unknown as string[]) sort?: LedgerSort;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit?: number;
}
