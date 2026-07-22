import { Type } from 'class-transformer';
import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator';

export class DiscoverQueryDto {
  @IsOptional() @Type(() => Number) @IsLatitude()
  lat?: number;

  @IsOptional() @Type(() => Number) @IsLongitude()
  lng?: number;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  radiusKm?: number = 5;

  @IsOptional() @IsString()
  industry?: string;

  @IsOptional() @IsString()
  category?: string;
}
