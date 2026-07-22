import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobPriority, JobStatus, JobType, PartCondition, WarrantyStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class LaborItemDto {
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional({ enum: JobType }) @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @ApiPropertyOptional() @IsOptional() @IsString() mechanicId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mechanicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class PartItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() partName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional({ enum: PartCondition }) @IsOptional() @IsEnum(PartCondition) condition?: PartCondition;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomerSupplied?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class ExternalWorkDto {
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() markup?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateWorkshopJobDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() makeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometerKm?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;

  @ApiPropertyOptional({ enum: JobPriority }) @IsOptional() @IsEnum(JobPriority) priority?: JobPriority;
  @ApiPropertyOptional({ enum: JobType }) @IsOptional() @IsEnum(JobType) jobType?: JobType;

  @ApiPropertyOptional() @IsOptional() @IsString() customerComplaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendations?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() primaryMechanicId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() assistantMechanicIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() bayNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() promisedAt?: string;

  // Inspection
  @ApiPropertyOptional() @IsOptional() @IsString() fuelLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSpareTire?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasToolkit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() externalDamages?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() inspectionImageUrls?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInsuranceClaim?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceClaimNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;

  @ApiPropertyOptional({ type: [LaborItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LaborItemDto) laborItems?: LaborItemDto[];
  @ApiPropertyOptional({ type: [PartItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PartItemDto) partsUsed?: PartItemDto[];
  @ApiPropertyOptional({ type: [ExternalWorkDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExternalWorkDto) externalWork?: ExternalWorkDto[];
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus }) @IsEnum(JobStatus) status!: JobStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SetWarrantyDto {
  @ApiProperty({ enum: WarrantyStatus }) @IsEnum(WarrantyStatus) warrantyStatus!: WarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyNotes?: string;
}
