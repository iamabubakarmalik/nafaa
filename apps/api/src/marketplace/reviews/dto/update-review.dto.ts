import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @IsString() @MaxLength(100)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  comment?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional() @IsString()
  videoUrl?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  qualityRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  packagingRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  deliveryRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  valueRating?: number;
}
