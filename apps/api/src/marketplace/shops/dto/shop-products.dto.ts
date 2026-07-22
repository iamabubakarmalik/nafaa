import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ShopProductsDto {
  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Type(() => Boolean)
  inStockOnly?: boolean;

  @IsOptional() @Type(() => Number) @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @Min(0)
  maxPrice?: number;

  @IsOptional() @IsIn(['bestsellers', 'newest', 'price_asc', 'price_desc', 'rating'])
  sortBy?: 'bestsellers' | 'newest' | 'price_asc' | 'price_desc' | 'rating' = 'bestsellers';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 24;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
