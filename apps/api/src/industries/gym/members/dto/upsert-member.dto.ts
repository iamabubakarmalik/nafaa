import { ApiPropertyOptional } from '@nestjs/swagger';
import { GymGoal, GymMemberStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpsertMemberDto {
  /** Existing customer to enrol; left out, the member's own name and phone open a new khata. */
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[0-9+\-\s]{7,20}$/, { message: 'Phone number sahi likhein' }) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^(\d{5}-?\d{7}-?\d)?$/, { message: 'CNIC me 13 number hote hain (35202-1234567-1)' }) cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referralCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() memberNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rfidCard?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() biometricId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContactRelation?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() currentWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() targetWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bodyFatPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() muscleMassPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bmi?: number;
  @ApiPropertyOptional({ enum: GymGoal }) @IsOptional() @IsEnum(GymGoal) primaryGoal?: GymGoal;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsEnum(GymGoal, { each: true }) secondaryGoals?: GymGoal[];
  @ApiPropertyOptional() @IsOptional() @IsString() fitnessLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() injuries?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() medications?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() doctorClearance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorClearanceUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredWorkoutTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredTrainerId?: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsNumber({}, { each: true }) workoutDays?: number[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) dietaryPreferences?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ enum: GymMemberStatus }) @IsOptional() @IsEnum(GymMemberStatus) status?: GymMemberStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() referredById?: string;
}