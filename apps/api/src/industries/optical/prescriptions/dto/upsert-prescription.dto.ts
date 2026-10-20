import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OpticalPrescriptionType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertPrescriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(120) customerAge?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGender?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() prescribedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() prescriptionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional({ enum: OpticalPrescriptionType }) @IsOptional() @IsEnum(OpticalPrescriptionType) prescriptionType?: OpticalPrescriptionType;

  // Right eye (OD)
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() rightAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightPrism?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightPd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() rightVa?: string;

  // Left eye (OS)
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() leftAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftPrism?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftPd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() leftVa?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() pupilDistance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() segHeight?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() clRightBaseCurve?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clLeftBaseCurve?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clRightDiameter?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clLeftDiameter?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) imageUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) documentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdatePrescriptionDto extends PartialType(UpsertPrescriptionDto) {}
