import { AttendanceStatus, LeaveStatus, LeaveType } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Board and sheet filters. Dates are business-day keys (YYYY-MM-DD). */
export class SheetQueryDto {
  @IsOptional() @Matches(DAY_KEY) from?: string;
  @IsOptional() @Matches(DAY_KEY) to?: string;
  /** Narrows the owner's all-branches view; ignored for staff tied to a branch. */
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsString() staffId?: string;
}

export class LeaveQueryDto {
  @IsOptional() @IsEnum(LeaveStatus) status?: LeaveStatus;
  @IsOptional() @Matches(DAY_KEY) from?: string;
  @IsOptional() @Matches(DAY_KEY) to?: string;
  @IsOptional() @IsString() shopId?: string;
}

export class PunchDto {
  @IsString() staffId!: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/** Manual fix of one day by the owner or a manager; the reason is logged. */
export class CorrectAttendanceDto {
  @IsString() staffId!: string;
  @Matches(DAY_KEY) date!: string;
  @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  /** Local shop time, HH:mm. */
  @IsOptional() @Matches(CLOCK) checkIn?: string;
  /** Local shop time, HH:mm; earlier than check-in means after midnight. */
  @IsOptional() @Matches(CLOCK) checkOut?: string;
  /** Deletes the day's record instead of saving it. */
  @IsOptional() @IsBoolean() remove?: boolean;
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}

export class CreateLeaveRequestDto {
  @IsString() staffId!: string;
  @IsEnum(LeaveType) type!: LeaveType;
  @Matches(DAY_KEY) startDate!: string;
  @Matches(DAY_KEY) endDate!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  /** Saves the request as approved straight away. */
  @IsOptional() @IsBoolean() approve?: boolean;
}

export const LEAVE_DECISIONS = ['APPROVE', 'REJECT', 'CANCEL'] as const;
export type LeaveDecision = (typeof LEAVE_DECISIONS)[number];

export class DecideLeaveDto {
  @IsIn(LEAVE_DECISIONS as unknown as string[]) decision!: LeaveDecision;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
