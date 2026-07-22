import { Type } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchProductsDto {
  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  subCategory?: string;

  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @Type(() => Number) @IsLatitude()
  lat?: number;

  @IsOptional() @Type(() => Number) @IsLongitude()
  lng?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  radiusKm?: number;

  @IsOptional() @Type(() => Number) @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @Min(0)
  maxPrice?: number;

  @IsOptional() @Type(() => Number) @Min(1) @Max(5)
  minRating?: number;

  @IsOptional() @Type(() => Boolean)
  inStockOnly?: boolean;

  @IsOptional() @Type(() => Boolean)
  bargainEnabled?: boolean;

  @IsOptional() @Type(() => Boolean)
  groupBuyEnabled?: boolean;

  @IsOptional() @Type(() => Boolean)
  onDiscount?: boolean;

  @IsOptional() @Type(() => Boolean)
  freeDelivery?: boolean;

  @IsOptional() @IsIn(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'bestsellers'])
  sortBy?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestsellers' = 'relevance';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 24;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
