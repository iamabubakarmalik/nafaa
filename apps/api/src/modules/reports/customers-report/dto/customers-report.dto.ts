import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const PERIOD_KEY = /^(\d{4}-\d{2}-\d{2}|all)$/;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const SEGMENTS = ['champions', 'loyal', 'promising', 'attention', 'atRisk', 'lost', 'never'] as const;
export type SegmentKey = (typeof SEGMENTS)[number];

/** One branch, for the owner's all-branches view; ignored when a branch is already active. */
class CustomerBranchDto {
  @IsOptional() @IsUUID() branch?: string;
}

/** Business-day period; `from = all` means all time. */
export class CustomerPeriodDto extends CustomerBranchDto {
  @IsOptional() @Matches(PERIOD_KEY) from?: string;
  @IsOptional() @Matches(DAY_KEY) to?: string;
}

export class CustomerSegmentDto extends CustomerBranchDto {
  /** Customers of one segment; without it only the summary comes back. */
  @IsOptional() @IsIn(SEGMENTS as unknown as string[]) segment?: SegmentKey;
}

export class CustomerCohortDto extends CustomerBranchDto {
  /** How many months of first-time buyers to follow. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(3) @Max(24) months?: number;
}
