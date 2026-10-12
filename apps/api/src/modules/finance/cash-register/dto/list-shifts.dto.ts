import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const SHIFT_STATUSES = ['OPEN', 'CLOSED', 'SHORT', 'OVER', 'MATCHED'] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export class ListShiftsDto {
  /** Business-day keys (YYYY-MM-DD) of the opening; no date filter when left out. */
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  /** Narrows the owner's all-branches view; ignored for staff tied to a branch. */
  @IsOptional() @IsString() shopId?: string;
  /** Person who opened the shift. */
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsIn(SHIFT_STATUSES as unknown as string[]) status?: ShiftStatus;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
