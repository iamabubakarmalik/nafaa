import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const FORECAST_FILTERS = ['all', 'stockout7', 'reorder', 'fast', 'slow', 'dead', 'overstock'] as const;
export const FORECAST_SORTS = ['urgency', 'value', 'tied', 'demand', 'name'] as const;

const bool = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true' || value === '1');

export class ForecastQueryDto {
  /** Days of stock an order should cover after it arrives. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(180) coverDays?: number;
  /** Lead days for suppliers that have none set. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) leadDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(30) @Max(365) deadDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(30) @Max(365) overstockDays?: number;
  @IsOptional() @Transform(bool) @IsBoolean() festivals?: boolean;
  @IsOptional() @Transform(bool) @IsBoolean() refresh?: boolean;
  @IsOptional() @IsIn(FORECAST_FILTERS as unknown as string[]) filter?: (typeof FORECAST_FILTERS)[number];
  @IsOptional() @IsIn(FORECAST_SORTS as unknown as string[]) sort?: (typeof FORECAST_SORTS)[number];
  @IsOptional() @IsString() @MaxLength(60) categoryId?: string;
  /** Supplier id, or "none". */
  @IsOptional() @IsString() @MaxLength(60) supplierId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class ForecastOrderDto {
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) productIds?: string[];
}
