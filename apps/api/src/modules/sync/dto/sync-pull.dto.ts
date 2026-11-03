import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export const SYNC_ENTITIES = ['manifest', 'products', 'stock', 'customers', 'sales', 'ids'] as const;
export type SyncEntity = (typeof SYNC_ENTITIES)[number];
export const SYNC_ID_ENTITIES = ['products', 'customers'] as const;

export class SyncPullQueryDto {
  @ApiPropertyOptional({ enum: SYNC_ENTITIES, default: 'manifest' })
  @IsOptional() @IsIn(SYNC_ENTITIES as unknown as string[])
  entity?: SyncEntity;

  /** Only rows changed after this time, switched-off ones included (the `serverTime` of the last run). */
  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  updatedSince?: string;

  /** `nextCursor` from the previous page. */
  @ApiPropertyOptional() @IsOptional() @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 500, maximum: 1000 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000)
  limit?: number;

  /** For entity=ids: which entity's live ids to list. */
  @ApiPropertyOptional({ enum: SYNC_ID_ENTITIES })
  @IsOptional() @IsIn(SYNC_ID_ENTITIES as unknown as string[])
  of?: (typeof SYNC_ID_ENTITIES)[number];

  /** For entity=sales without updatedSince: how many days back (1–30, default 7). */
  @ApiPropertyOptional({ default: 7 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  days?: number;
}
