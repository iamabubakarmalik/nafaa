import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const LOW_STATUSES = ['all', 'out', 'low', 'soon', 'expiry', 'registration', 'season', 'ordered', 'ignored'] as const;
export const LOW_SORTS = ['urgency', 'daysLeft', 'value', 'lost', 'name', 'stock'] as const;

/** How the numbers are worked out; the page keeps the shop's choice. */
export class LowStockSettingsDto {
  /** Business days of sales used for the daily average. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(90) days?: number;
  /** Days of stock an order should cover. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(180) targetDays?: number;
  /** Stock that lasts this many days or less counts as "running out soon". */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) soonDays?: number;
  /** Batches expiring within this many days are shown. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(180) expiryDays?: number;
}

export class ListLowStockDto extends LowStockSettingsDto {
  @IsOptional() @IsIn(LOW_STATUSES as unknown as string[]) status?: (typeof LOW_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(60) categoryId?: string;
  /** Supplier id, or "none" for items never bought from a supplier. */
  @IsOptional() @IsString() @MaxLength(60) supplierId?: string;
  /** Industry type, e.g. an appliance or electronics category. */
  @IsOptional() @IsString() @MaxLength(60) group?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsIn(LOW_SORTS as unknown as string[]) sort?: (typeof LOW_SORTS)[number];
  /** "reorder" = only lines worth ordering from a supplier, sorted by supplier. */
  @IsOptional() @IsIn(['alerts', 'reorder']) view?: 'alerts' | 'reorder';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}

export class SetAlertDto {
  @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000) alert!: number;
  /** Branch whose level changes; the active branch when left out. */
  @IsOptional() @IsString() shopId?: string;
}

export class IgnoreDto {
  @IsBoolean() ignore!: boolean;
  @IsOptional() @IsString() shopId?: string;
}
