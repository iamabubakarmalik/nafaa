import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export const PT_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
const METHOD_MSG = { message: 'Payment ka tareeqa sahi chunein' };

export class CreatePtDto {
  @IsString() memberId!: string;
  @IsString() trainerId!: string;
  @IsDateString({}, { message: 'Session ka waqt chunein' }) scheduledStart!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) @Max(240) durationMinutes?: number;
  /** Single session rate; left out, the trainer's per-session rate. Package sessions are free here. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) price?: number;
  /** Uses a PT session from the member's plan or PT package instead of billing it. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFromPackage?: boolean;
  /** The PT package to take the session from (implies isFromPackage). */
  @ApiPropertyOptional() @IsOptional() @IsString() packageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) focusArea?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) trainerNotes?: string;
  /** Book the same slot every week for this many weeks (1 = just this one). */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) weeks?: number;
}

export class PtStatusDto {
  @IsIn(PT_STATUSES as unknown as string[], { message: 'Status sahi chunein' }) status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cancellationReason?: string;
  /** Money taken for a single session when it is completed; the rest goes on khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
}

export class PtRateDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) feedback?: string;
}

export class PtWorkoutLogDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) focusArea?: string;
  @ApiPropertyOptional() @IsOptional() workoutPlan?: unknown;
  @ApiPropertyOptional() @IsOptional() exercisesPerformed?: unknown;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10000) caloriesBurned?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) trainerNotes?: string;
}

export class SellPtPackageDto {
  @IsString() memberId!: string;
  /** Left out, any trainer can take the sessions. */
  @ApiPropertyOptional() @IsOptional() @IsString() trainerId?: string;
  @IsInt({ message: 'Sessions ki ginti likhein' }) @Min(1, { message: 'Kam az kam 1 session' }) @Max(200) sessions!: number;
  @IsNumber({}, { message: 'Package ki qeemat likhein' }) @Min(1, { message: 'Package ki qeemat likhein' }) @Max(10_000_000) price!: number;
  /** Money taken now; the rest goes on the member's khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
  /** `yyyy-mm-dd`; left out, today. */
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  /** Days the sessions stay valid (default 90). */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(730) validDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CancelPtPackageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
