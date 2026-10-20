import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PetGroomingServiceType, PetSpeciesType } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertGroomerDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Code likhein' }) @MaxLength(30) employeeCode!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Naam likhein' }) @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @Matches(/^[0-9+\-\s]{10,15}$/, { message: 'Phone 10 se 15 hindse' }) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) cnic?: string;

  @ApiPropertyOptional({ enum: PetSpeciesType, isArray: true }) @IsOptional() @IsArray() @IsEnum(PetSpeciesType, { each: true }) specializations?: PetSpeciesType[];
  @ApiPropertyOptional({ enum: PetGroomingServiceType, isArray: true }) @IsOptional() @IsArray() @IsEnum(PetGroomingServiceType, { each: true }) serviceTypes?: PetGroomingServiceType[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(60) experienceYears?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) certifications?: string[];

  /** 0 = Sunday … 6 = Saturday, on shop time. */
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true }) workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt HH:MM likhein' }) workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt HH:MM likhein' }) workEndTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) perServiceRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
}

export class UpdateGroomerDto extends PartialType(UpsertGroomerDto) {}
