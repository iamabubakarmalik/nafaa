import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import {
  COMPARE_DEFAULTS, REPORT_FIGURES, REPORT_PERIODS, ROUND_OFF, SUMMARY_CHANNELS, SUMMARY_PARTS,
} from '../../../../common/helpers/reports-config.helper';

/** Daily summary: how it goes out, to whom, and which lines it carries. */
export class ReportsSummaryDto {
  @ApiPropertyOptional({ enum: SUMMARY_CHANNELS, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(SUMMARY_CHANNELS.length) @IsIn(SUMMARY_CHANNELS, { each: true })
  channels?: string[];

  /** null = the owner and everyone with `reports.view`. */
  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) @MaxLength(64, { each: true })
  recipientIds?: string[] | null;

  @ApiPropertyOptional({ enum: SUMMARY_PARTS, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(SUMMARY_PARTS.length) @IsIn(SUMMARY_PARTS, { each: true })
  include?: string[];
}

/** Settings → Reports. Every field optional; unknown fields are refused. */
export class UpdateReportsConfigDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 12 }) @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearStartMonth?: number;
  @ApiPropertyOptional({ enum: REPORT_PERIODS }) @IsOptional() @IsIn(REPORT_PERIODS) defaultPeriod?: string;
  @ApiPropertyOptional({ enum: COMPARE_DEFAULTS }) @IsOptional() @IsIn(COMPARE_DEFAULTS) compareDefault?: string;
  @ApiPropertyOptional({ enum: ROUND_OFF }) @IsOptional() @IsIn(ROUND_OFF) roundOff?: string;

  /** Changing this needs the owner (checked in the service). */
  @ApiPropertyOptional({ enum: REPORT_FIGURES, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(REPORT_FIGURES.length) @IsIn(REPORT_FIGURES, { each: true })
  staffFigures?: string[];

  @ApiPropertyOptional({ type: ReportsSummaryDto })
  @IsOptional() @ValidateNested() @Type(() => ReportsSummaryDto)
  summary?: ReportsSummaryDto;
}
