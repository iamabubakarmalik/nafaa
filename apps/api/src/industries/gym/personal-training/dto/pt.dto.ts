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
  /** Uses a PT session from the member's plan instead of billing it. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFromPackage?: boolean;
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
