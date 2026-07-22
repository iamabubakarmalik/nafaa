import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListGroupBuysDto {
  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
