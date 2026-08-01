import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpticalPrescriptionType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertPrescriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() customerAge?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGender?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() prescribedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
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
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
