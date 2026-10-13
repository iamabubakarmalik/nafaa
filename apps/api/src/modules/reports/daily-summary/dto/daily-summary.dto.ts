import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export class DailySummaryDayDto {
  /** Business-day key (YYYY-MM-DD); the current business day when left out. */
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) date?: string;
}
