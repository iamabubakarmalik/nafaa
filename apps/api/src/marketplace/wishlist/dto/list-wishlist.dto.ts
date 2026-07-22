import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListWishlistDto {
  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsIn(['recent', 'price_asc', 'price_desc', 'name'])
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'name' = 'recent';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 24;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
