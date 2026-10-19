import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceServiceStatus, ApplianceServiceType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateServiceRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() serialTrackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiProperty() @IsString() customerAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiProperty({ enum: ApplianceServiceType }) @IsEnum(ApplianceServiceType) serviceType!: ApplianceServiceType;
  @ApiPropertyOptional({ enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] }) @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
  @ApiProperty() @IsString() reportedIssue!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledTimeSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() coveredUnderWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() coveredUnderAmc?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyClaimNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() amcContractNumber?: string;
  /** Visit fee agreed when the complaint is booked. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) visitCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateServiceStatusDto {
  @ApiProperty({ enum: ApplianceServiceStatus }) @IsEnum(ApplianceServiceStatus) status!: ApplianceServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CompleteServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosedIssue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workDone?: string;
  @ApiPropertyOptional() @IsOptional() partsReplaced?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) visitCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) laborCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) partsCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  /** How `paidAmount` came in; left out, cash. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA']) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() coveredUnderWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() coveredUnderAmc?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresFollowUp?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpReason?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @IsInt() @Min(1) @Max(5) customerRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerFeedback?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAfterUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() customerSignatureUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceCertificate?: string;
}

/** Khula hua kaam edit karne ke liye — sab optional */
export class UpdateServiceRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional({ enum: ApplianceServiceType }) @IsOptional() @IsEnum(ApplianceServiceType) serviceType?: ApplianceServiceType;
  @ApiPropertyOptional({ enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] }) @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reportedIssue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledTimeSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() coveredUnderWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() coveredUnderAmc?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyClaimNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() amcContractNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

/** Repair ka baqi paisa wusool karne ke liye */
export class AddServicePaymentDto {
  @ApiProperty({ example: 1500 }) @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  /** Left out, cash. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA']) paymentMethod?: string;
}

/** Kaam cancel karne ki wajah */
export class CancelServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
