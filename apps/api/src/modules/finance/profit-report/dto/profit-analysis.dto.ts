import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const PROFIT_SORTS = ['profit', 'margin', 'revenue', 'qty', 'discount', 'returns', 'loss', 'name'] as const;
export const PROFIT_VIEWS = ['all', 'loss', 'fallback', 'nocost', 'discount', 'returns'] as const;
export const UNIT_KINDS = ['all', 'IMEI', 'USED', 'SERIAL'] as const;

/** Period (business days, inclusive) and the filters every profit query shares. */
export class ProfitRangeDto {
  @IsOptional() @IsString() @Matches(DAY_KEY) from?: string;
  @IsOptional() @IsString() @Matches(DAY_KEY) to?: string;
  @IsOptional() @IsString() @MaxLength(60) categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) brandId?: string;
  /** Who made the sale (sold by, else created by). */
  @IsOptional() @IsString() @MaxLength(60) staffId?: string;
}

export class ProfitItemsDto extends ProfitRangeDto {
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsIn(PROFIT_SORTS as unknown as string[]) sort?: (typeof PROFIT_SORTS)[number];
  @IsOptional() @IsIn(PROFIT_VIEWS as unknown as string[]) view?: (typeof PROFIT_VIEWS)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000) limit?: number;
}

export class ProfitUnitsDto extends ProfitRangeDto {
  @IsOptional() @IsIn(UNIT_KINDS as unknown as string[]) kind?: (typeof UNIT_KINDS)[number];
  @IsOptional() @IsString() @MaxLength(60) search?: string;
}
