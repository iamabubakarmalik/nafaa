import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobPriority, JobStatus, JobType, PartCondition, WarrantyStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { CoreReturnInputDto } from '../../core-returns/dto/core-return.dto';

export class LaborItemDto {
  @ApiProperty() @IsString() @MaxLength(300) description!: string;
  @ApiPropertyOptional({ enum: JobType }) @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @ApiPropertyOptional() @IsOptional() @IsString() mechanicId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mechanicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive({ message: 'Ghante 0 se zyada likhein' }) hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ratePerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PartItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() @MaxLength(200) partName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive({ message: 'Part ki quantity 0 se zyada likhein' }) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional({ enum: PartCondition }) @IsOptional() @IsEnum(PartCondition) condition?: PartCondition;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomerSupplied?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warrantyKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ExternalWorkDto {
  @ApiProperty() @IsString() @MaxLength(300) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) markup?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateWorkshopJobDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() makeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) odometerKm?: number;
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

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInsuranceClaim?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceClaimNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;

  /** Money taken when the vehicle is received; kept on the customer's khata as an advance. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() advanceMethod?: string;

  @ApiPropertyOptional({ type: [LaborItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LaborItemDto) laborItems?: LaborItemDto[];
  @ApiPropertyOptional({ type: [PartItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PartItemDto) partsUsed?: PartItemDto[];
  @ApiPropertyOptional({ type: [ExternalWorkDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExternalWorkDto) externalWork?: ExternalWorkDto[];
}

/** Job card fields that can change while the vehicle is in the workshop. */
export class UpdateWorkshopJobDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) odometerKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional({ enum: JobPriority }) @IsOptional() @IsEnum(JobPriority) priority?: JobPriority;
  @ApiPropertyOptional({ enum: JobType }) @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @ApiPropertyOptional() @IsOptional() @IsString() customerComplaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryMechanicId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bayNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() promisedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fuelLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSpareTire?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasToolkit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() externalDamages?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInsuranceClaim?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceClaimNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus }) @IsEnum(JobStatus) status!: JobStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() @IsPositive({ message: 'Amount 0 se zyada likhein' }) amount!: number;
  @ApiProperty() @IsString() paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Handing the vehicle back: money taken now, and the next service to remind about. */
export class DeliverJobDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) nextServiceKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nextServiceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(120) warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warrantyKm?: number;
  /** Old part the customer gives back now; its value is taken off the bill as a trade-in. */
  @ApiPropertyOptional({ type: CoreReturnInputDto }) @IsOptional() @ValidateNested() @Type(() => CoreReturnInputDto) coreReturn?: CoreReturnInputDto;
}

export class SetWarrantyDto {
  @ApiProperty({ enum: WarrantyStatus }) @IsEnum(WarrantyStatus) warrantyStatus!: WarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warrantyKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyNotes?: string;
}

export class RateJobDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}

export const JOB_VIEWS = ['open', 'working', 'waiting', 'ready', 'late', 'unpaid', 'closed', 'all'] as const;
export type JobView = (typeof JOB_VIEWS)[number];

export class ListJobsQuery {
  @IsOptional() @IsIn(JOB_VIEWS as unknown as string[]) view?: JobView;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() jobType?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() mechanicId?: string;
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['due', 'new', 'old', 'amount']) sort?: 'due' | 'new' | 'old' | 'amount';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
