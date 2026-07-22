import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateOrderDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  shopRating!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  riderRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  qualityRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  packagingRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  deliveryRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  valueRating?: number;

  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  comment?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional() @IsString()
  videoUrl?: string;
}
