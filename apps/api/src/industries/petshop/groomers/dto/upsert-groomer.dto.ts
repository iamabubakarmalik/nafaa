import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetGroomingServiceType, PetSpeciesType } from '@prisma/client';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertGroomerDto {
  @ApiProperty() @IsString() employeeCode!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;

  @ApiPropertyOptional({ enum: PetSpeciesType, isArray: true }) @IsOptional() @IsArray() specializations?: PetSpeciesType[];
  @ApiPropertyOptional({ enum: PetGroomingServiceType, isArray: true }) @IsOptional() @IsArray() serviceTypes?: PetGroomingServiceType[];
  @ApiPropertyOptional() @IsOptional() @IsInt() experienceYears?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() certifications?: string[];

  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() perServiceRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionPct?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
}
