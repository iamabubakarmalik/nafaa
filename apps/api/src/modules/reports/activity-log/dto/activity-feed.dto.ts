/** Filters and paging for the activity log feed. */

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class ActivityFeedDto {
  /** Business day "YYYY-MM-DD"; left out means from the beginning. */
  @IsOptional() @Matches(DAY) from?: string;
  /** Business day "YYYY-MM-DD"; left out means today. */
  @IsOptional() @Matches(DAY) to?: string;
  /** User id, or "system" for entries without a user. */
  @IsOptional() @IsString() @MaxLength(60) userId?: string;
  @IsOptional() @IsString() @MaxLength(60) action?: string;
  @IsOptional() @IsString() @MaxLength(60) entity?: string;
  /** Branch id: entries by people assigned to that branch. Owners only. */
  @IsOptional() @IsString() @MaxLength(60) shopId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  /** `nextCursor` from the previous page. */
  @IsOptional() @IsString() @MaxLength(120) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}
