import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LiveShopStatus } from '@prisma/client';

export class ListLiveShopsDto {
  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsIn(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'])
  status?: LiveShopStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
