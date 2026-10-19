import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ServiceBusinessType, TechnicianLevel, TechnicianStatus } from '@prisma/client';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export const COMMISSION_TYPES = ['PERCENTAGE', 'FIXED', 'BOTH', 'NONE'] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class UpsertTechnicianDto {
  @ApiProperty() @IsUUID() staffId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) employeeCode?: string;
  @ApiPropertyOptional({ enum: TechnicianLevel }) @IsOptional() @IsEnum(TechnicianLevel) level?: TechnicianLevel;
  @ApiPropertyOptional({ enum: TechnicianStatus }) @IsOptional() @IsEnum(TechnicianStatus) status?: TechnicianStatus;
  @ApiPropertyOptional({ enum: ServiceBusinessType }) @IsOptional() @IsEnum(ServiceBusinessType) primarySkill?: ServiceBusinessType;
  @ApiPropertyOptional({ enum: ServiceBusinessType, isArray: true }) @IsOptional() @IsArray() @IsEnum(ServiceBusinessType, { each: true }) secondarySkills?: ServiceBusinessType[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(70) experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) cnicNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() licenseExpiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) vehicleAssigned?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) serviceAreas?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) homeCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @Matches(TIME) workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME) workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailableForEmergency?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailableWeekends?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailableNights?: boolean;
  @ApiPropertyOptional({ enum: COMMISSION_TYPES }) @IsOptional() @IsIn(COMMISSION_TYPES) commissionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) fixedPerJob?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) monthlySalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) maxOngoingJobs?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class TechnicianStatusDto {
  @ApiProperty({ enum: TechnicianStatus }) @IsEnum(TechnicianStatus) status!: TechnicianStatus;
}

export class TechnicianLocationDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) lat!: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) lng!: number;
}

export class TechnicianSkillDto {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiPropertyOptional({ enum: TechnicianLevel }) @IsOptional() @IsEnum(TechnicianLevel) skillLevel?: TechnicianLevel;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) customRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) customDuration?: number;
}

export class TechnicianSkillsDto {
  @ApiProperty({ type: [TechnicianSkillDto] }) @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TechnicianSkillDto) skills!: TechnicianSkillDto[];
}

export class CommissionQuery {
  @ApiProperty() @Matches(DAY) from!: string;
  @ApiProperty() @Matches(DAY) to!: string;
  /** Staff id of the technician. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() technicianId?: string;
}

export class PayCommissionDto {
  @ApiProperty() @Matches(DAY) from!: string;
  @ApiProperty() @Matches(DAY) to!: string;
  @ApiProperty() @IsUUID() technicianId!: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(500) @IsUUID('all', { each: true }) jobIds?: string[];
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: (typeof MONEY_METHODS)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}
