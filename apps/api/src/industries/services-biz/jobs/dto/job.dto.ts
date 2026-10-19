import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ServiceCategory, ServiceJobStatus, ServiceLocationType, ServicePriority } from '@prisma/client';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class JobPartDto {
  /** Shelf product; its stock leaves when the job is billed. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiProperty() @IsString() @MaxLength(160) partName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.001) @Max(100000) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) unitPrice?: number;
  /** What the shop paid for a part bought outside (shelf parts use the product cost). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomerSupplied?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isUnderWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(3650) warrantyDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

/** Job details that can be set at intake and changed until the bill. */
export class JobDetailsDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerAltPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['INDIVIDUAL', 'BUSINESS']) customerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) serviceName?: string;
  @ApiPropertyOptional({ enum: ServiceCategory }) @IsOptional() @IsEnum(ServiceCategory) category?: ServiceCategory;
  @ApiPropertyOptional({ enum: ServicePriority }) @IsOptional() @IsEnum(ServicePriority) priority?: ServicePriority;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) problemDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() underWarranty?: boolean;
  @ApiPropertyOptional({ enum: ServiceLocationType }) @IsOptional() @IsEnum(ServiceLocationType) locationType?: ServiceLocationType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) serviceAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) preferredTimeSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) visitCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) labourCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) transportCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) emergencyCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) taxAmount?: number;
  /** Advance the shop asks for (a target, not money received). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) advanceAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(3650) jobWarrantyDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) jobWarrantyTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) technicianNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) internalNotes?: string;
}

export class CreateJobDto extends JobDetailsDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) ticketNumber?: string;
  /** Staff id of the technician. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() primaryTechnicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(10) @IsUUID('all', { each: true }) assistantTechnicianIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() amcId?: string;
  @ApiPropertyOptional({ type: [JobPartDto] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => JobPartDto) parts?: JobPartDto[];
  /** Money taken at intake; held on the customer's khata until the bill. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) advancePaid?: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) advanceMethod?: string;
}

export class UpdateJobDto extends JobDetailsDto {}

export class JobStatusDto {
  @ApiProperty({ enum: ServiceJobStatus }) @IsEnum(ServiceJobStatus) status!: ServiceJobStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
}

export class AssignJobDto {
  @ApiProperty() @IsUUID() primaryTechnicianId!: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(10) @IsUUID('all', { each: true }) assistantIds?: string[];
}

export class JobPaymentDto {
  @ApiProperty() @IsNumber() @Min(1) @Max(100_000_000) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAdvance?: boolean;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: string;
}

export class PaymentPartDto {
  @ApiProperty({ enum: MONEY_METHODS }) @IsIn(MONEY_METHODS) method!: (typeof MONEY_METHODS)[number];
  @ApiProperty() @IsNumber() @Min(0.01) @Max(100_000_000) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
}

export class BillJobDto {
  /** Money handed over now (with `payments`, their sum). Above what is due means change. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) paidAmount?: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: string;
  /** Split payment: what was handed over by each method. */
  @ApiPropertyOptional({ type: [PaymentPartDto] }) @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => PaymentPartDto) payments?: PaymentPartDto[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  /** Work warranty from today; left out, the job's own days. */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(3650) jobWarrantyDays?: number;
}

export class CancelJobDto {
  @ApiProperty() @IsString() @MaxLength(500) reason!: string;
}

export class ReturnVisitDto {
  @ApiProperty() @IsDateString() returnVisitDate!: string;
  @ApiProperty() @IsString() @MaxLength(500) reason!: string;
}

export class RatingDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) feedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wouldRecommend?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) satisfaction?: string;
}

export const JOB_VIEWS = ['open', 'booked', 'working', 'waiting', 'ready', 'late', 'unpaid', 'closed', 'all'] as const;
export type JobView = (typeof JOB_VIEWS)[number];
export const JOB_SORTS = ['due', 'new', 'old', 'amount'] as const;

export class ListJobsQuery {
  @ApiPropertyOptional({ enum: JOB_VIEWS }) @IsOptional() @IsIn(JOB_VIEWS) view?: JobView;
  @ApiPropertyOptional({ enum: ServiceJobStatus }) @IsOptional() @IsEnum(ServiceJobStatus) status?: ServiceJobStatus;
  @ApiPropertyOptional({ enum: ServicePriority }) @IsOptional() @IsEnum(ServicePriority) priority?: ServicePriority;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() technicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: JOB_SORTS }) @IsOptional() @IsIn(JOB_SORTS) sort?: (typeof JOB_SORTS)[number];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class CounterSaleItemDto {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.001) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) lineDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class CounterSaleDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: string;
  @ApiProperty() @IsNumber() @Min(0) paidAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiProperty({ type: [CounterSaleItemDto] }) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => CounterSaleItemDto) items!: CounterSaleItemDto[];
}

export class JobPhotosDto {
  @ApiProperty() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(1000, { each: true }) urls!: string[];
}

export class JobSignatureDto {
  @ApiProperty() @IsString() @MaxLength(200_000) signatureUrl!: string;
}
