import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceCategoryType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertTechnicianDto {
  @ApiProperty() @IsString() employeeCode!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() specializations?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() brandsExpertise?: string[];
  @ApiPropertyOptional({ enum: ApplianceCategoryType, isArray: true }) @IsOptional() @IsArray() categoriesExpertise?: ApplianceCategoryType[];
  @ApiPropertyOptional() @IsOptional() @IsInt() experienceYears?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() certifications?: string[];
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentZone?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() visitChargeRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hourlyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
