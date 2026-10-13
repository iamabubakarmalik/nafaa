import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Branch and the staff-pay switch, shared by every P&L endpoint. */
export class PnlScopeDto {
  /** One branch, when the owner is on the all-branches view. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) shopId?: string;
  /** Count salaries and commission paid as operating expenses (default yes). */
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() @IsIn(['true', 'false']) staff?: 'true' | 'false';
}

export class PnlQueryDto extends PnlScopeDto {
  /** Business-day keys (YYYY-MM-DD); this month so far when left out. */
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) from?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) to?: string;
  /** Compare with the period just before, or the same dates a year earlier. */
  @ApiPropertyOptional({ enum: ['prev', 'year'] }) @IsOptional() @IsIn(['prev', 'year']) compare?: 'prev' | 'year';
}

export class PnlMonthlyDto extends PnlScopeDto {
  /** How many business months back, the current one included (default 12). */
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(3) @Max(24) months?: number;
}

export const PNL_DETAIL_KINDS = ['expense', 'staff', 'writeoff', 'booking'] as const;
export type PnlDetailKind = (typeof PNL_DETAIL_KINDS)[number];

export class PnlDetailDto extends PnlQueryDto {
  @ApiPropertyOptional({ enum: PNL_DETAIL_KINDS }) @IsIn(PNL_DETAIL_KINDS as unknown as string[]) kind!: PnlDetailKind;
  /** Expense category id, or `none` for expenses without one. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) categoryId?: string;
}
