import { Type } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator';
import { ShopVerificationLevel } from '@prisma/client';

export class ListShopsDto {
  @IsOptional() @Type(() => Number) @IsLatitude()
  lat?: number;

  @IsOptional() @Type(() => Number) @IsLongitude()
  lng?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  radiusKm?: number = 10;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  area?: string;

  @IsOptional() @IsString()
  industry?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsIn(['UNVERIFIED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
  minVerification?: ShopVerificationLevel;

  @IsOptional() @Type(() => Boolean)
  onlyOpen?: boolean;

  @IsOptional() @Type(() => Boolean)
  freeDelivery?: boolean;

  @IsOptional() @Type(() => Boolean)
  bargainEnabled?: boolean;

  @IsOptional() @Type(() => Boolean)
  groupBuyEnabled?: boolean;

  @IsOptional() @Type(() => Number)
  minRating?: number;

  @IsOptional() @IsIn(['distance', 'rating', 'popular', 'newest', 'delivery_time'])
  sortBy?: 'distance' | 'rating' | 'popular' | 'newest' | 'delivery_time' = 'popular';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
