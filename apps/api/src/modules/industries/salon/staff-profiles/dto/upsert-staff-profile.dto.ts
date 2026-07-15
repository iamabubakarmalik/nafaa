import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalonCommissionType, SalonStaffRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertStaffProfileDto {
  @ApiProperty() @IsString() staffId!: string;
  @ApiPropertyOptional({ enum: SalonStaffRole }) @IsOptional() @IsEnum(SalonStaffRole) role?: SalonStaffRole;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() specialization?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional({ enum: SalonCommissionType }) @IsOptional() @IsEnum(SalonCommissionType) commissionType?: SalonCommissionType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionFixed?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breakStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breakEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBookable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxDailyBookings?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bookingBuffer?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
