import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureMaterialType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertCarpenterDto {
  @ApiProperty() @IsString() @MaxLength(20) employeeCode!: string;
  @ApiProperty() @IsString() @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @MaxLength(20) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) specializations?: string[];
  @ApiPropertyOptional({ enum: FurnitureMaterialType, isArray: true }) @IsOptional() @IsArray() materialsExpertise?: FurnitureMaterialType[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(70) experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() workshopLocation?: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) dailyWage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) perProjectRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PayCarpenterDto {
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  /** The order this pay is for, when it is a per-job payment. */
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}
