import { Type } from 'class-transformer';
import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator';

export class NearbyShopsDto {
  @Type(() => Number) @IsLatitude()
  lat!: number;

  @Type(() => Number) @IsLongitude()
  lng!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  radiusKm?: number = 5;

  @IsOptional() @IsString()
  industry?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  sortBy?: 'distance' | 'rating' | 'popular' | 'newest' = 'distance';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
