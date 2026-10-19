import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalonCommissionType, SalonStaffRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertStaffProfileDto {
  @ApiProperty() @IsString() staffId!: string;
  @ApiPropertyOptional({ enum: SalonStaffRole }) @IsOptional() @IsEnum(SalonStaffRole) role?: SalonStaffRole;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() specialization?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(70) experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional({ enum: SalonCommissionType }) @IsOptional() @IsEnum(SalonCommissionType) commissionType?: SalonCommissionType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commissionFixed?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @Matches(HHMM, { message: 'Waqt HH:MM me likhein' }) workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(HHMM, { message: 'Waqt HH:MM me likhein' }) workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(HHMM, { message: 'Waqt HH:MM me likhein' }) breakStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(HHMM, { message: 'Waqt HH:MM me likhein' }) breakEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBookable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxDailyBookings?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(240) bookingBuffer?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AssignServiceDto {
  @ApiProperty() @IsString() serviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) customPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(1440) customDuration?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) customCommissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class AssignServicesDto {
  @ApiProperty({ type: [AssignServiceDto] })
  @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => AssignServiceDto) services!: AssignServiceDto[];
}
