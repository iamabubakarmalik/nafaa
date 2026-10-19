import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AmcStatus, AmcType, ServiceBusinessType } from '@prisma/client';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class CreateAmcDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerEmail?: string;
  @ApiPropertyOptional({ enum: AmcType }) @IsOptional() @IsEnum(AmcType) type?: AmcType;
  /** What is covered, e.g. ["2 AC split 1.5 ton", "1 geyser"]. */
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(160, { each: true }) coveredItems?: string[];
  @ApiPropertyOptional({ enum: ServiceBusinessType, isArray: true }) @IsOptional() @IsArray() @IsEnum(ServiceBusinessType, { each: true }) coveredServiceTypes?: ServiceBusinessType[];
  @ApiProperty() @IsInt() @Min(1) @Max(104) numberOfVisits!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesParts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesLabour?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) partsCapAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emergencyIncluded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) emergencyDiscountPct?: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100_000_000) contractValue!: number;
  /** Money taken now; the rest goes on the customer's khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) amountPaid?: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(24) paymentInstallments?: number;
  /** Shop day YYYY-MM-DD (today when left out). */
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(120) reminderDaysBefore?: number;
  @ApiProperty() @IsString() @MaxLength(500) serviceAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(500) numberOfSites?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) termsConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) specialConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  /** Spreads the visits evenly over the contract. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoScheduleVisits?: boolean;
}

export class ScheduleVisitDto {
  @ApiProperty() @IsDateString() scheduledDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) visitType?: string;
  /** Staff id of the technician. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() technicianId?: string;
}

export class CompleteVisitDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() technicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) workDone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) recommendations?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) customerRating?: number;
}

export class VisitJobDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() primaryTechnicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) problemDescription?: string;
}

export class CancelAmcDto {
  @ApiProperty() @IsString() @MaxLength(500) reason!: string;
}

export class AmcPaymentDto {
  @ApiProperty() @IsNumber() @Min(1) @Max(100_000_000) amount!: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: string;
}

export class ListAmcQuery {
  @ApiPropertyOptional({ enum: AmcStatus }) @IsOptional() @IsEnum(AmcStatus) status?: AmcStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional({ enum: AmcType }) @IsOptional() @IsEnum(AmcType) type?: AmcType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class RenewAmcDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) contractValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) amountPaid?: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS) paymentMode?: string;
}
