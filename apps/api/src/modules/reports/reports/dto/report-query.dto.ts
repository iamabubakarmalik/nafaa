import { IsOptional, Matches } from 'class-validator';

/** Period of a report: business-day keys; `from=all` means since the first record. */
export class ReportQueryDto {
  @IsOptional()
  @Matches(/^(all|\d{4}-\d{2}-\d{2})$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
