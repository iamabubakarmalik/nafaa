import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const EXPIRY_BUCKETS = ['expired', '30', '90', '180', 'all'] as const;
export type ExpiryBucket = (typeof EXPIRY_BUCKETS)[number];
export const EXPIRY_SORTS = ['soon', 'value', 'name'] as const;

export class ListExpiryDto {
  @ApiPropertyOptional({ enum: EXPIRY_BUCKETS, description: 'expired, within 30/90/180 days, or every batch with an expiry' })
  @IsOptional() @IsIn(EXPIRY_BUCKETS as unknown as string[]) bucket?: ExpiryBucket;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) search?: string;
  @ApiPropertyOptional({ enum: EXPIRY_SORTS }) @IsOptional() @IsIn(EXPIRY_SORTS as unknown as string[]) sort?: (typeof EXPIRY_SORTS)[number];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
