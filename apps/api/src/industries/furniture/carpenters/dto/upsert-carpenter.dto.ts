import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureMaterialType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertCarpenterDto {
  @ApiProperty() @IsString() employeeCode!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() specializations?: string[];
  @ApiPropertyOptional({ enum: FurnitureMaterialType, isArray: true }) @IsOptional() @IsArray() materialsExpertise?: FurnitureMaterialType[];
  @ApiPropertyOptional() @IsOptional() @IsInt() experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() workshopLocation?: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() dailyWage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() perProjectRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
