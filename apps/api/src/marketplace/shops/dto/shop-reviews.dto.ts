import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ShopReviewsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @Type(() => Boolean)
  withPhotos?: boolean;

  @IsOptional() @Type(() => Boolean)
  withVideo?: boolean;

  @IsOptional() @IsIn(['recent', 'helpful', 'rating_high', 'rating_low'])
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low' = 'recent';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
