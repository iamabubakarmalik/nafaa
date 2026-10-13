import { IsOptional, Matches } from 'class-validator';

/** Business-day keys; both empty means all time. */
export class ExportQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tareekh "2026-10-01" ki shakal me dein' })
  from?: string;

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tareekh "2026-10-31" ki shakal me dein' })
  to?: string;
}
