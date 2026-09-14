import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceInstallationStatus, ApplianceServiceType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInstallationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() serialTrackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiProperty() @IsString() customerAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional({ enum: ApplianceServiceType }) @IsOptional() @IsEnum(ApplianceServiceType) serviceType?: ApplianceServiceType;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledTimeSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class AssignTechnicianDto {
  @ApiProperty() @IsString() technicianId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledTimeSlot?: string;
}

export class UpdateInstallationStatusDto {
  @ApiProperty({ enum: ApplianceInstallationStatus }) @IsEnum(ApplianceInstallationStatus) status!: ApplianceInstallationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CompleteInstallationDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasProperElectricConnection?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasProperPlumbing?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasProperGasConnection?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wallSpaceAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() drainageAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() additionalMaterialUsed?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() materialsCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() laborCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() visitCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidByCustomer?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() covered_underWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() demoGiven?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() demoNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerSignatureUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAfterUrls?: string[];
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @IsInt() @Min(1) @Max(5) customerRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerFeedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installationCertificateNumber?: string;
}

/** Installation ka baqi paisa wusool karne ke liye */
export class AddInstallationPaymentDto {
  @ApiProperty({ example: 2500 }) @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

/** Nayi tareekh par kaam rakhne ke liye */
export class RescheduleInstallationDto {
  @ApiProperty({ example: '2026-09-20' }) @IsString() newDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
