import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuctionStatus } from '@prisma/client';

export class ListAuctionsDto {
  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsIn(['DRAFT', 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'])
  status?: AuctionStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
