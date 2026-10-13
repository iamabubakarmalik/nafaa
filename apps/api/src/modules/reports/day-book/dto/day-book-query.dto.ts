import { IsOptional, IsString, Matches } from 'class-validator';

/** One business day (`YYYY-MM-DD`, default today) and an optional branch for owners. */
export class DayBookQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  shopId?: string;
}
