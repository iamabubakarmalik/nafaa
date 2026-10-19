import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ElectronicsWarrantyStatus } from '@prisma/client';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

export class CreateClaimDto {
  @ApiPropertyOptional() @IsOptional() @IsString() serialTrackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() @MaxLength(200) productName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @MaxLength(120) customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerEmail?: string;
  @ApiProperty() @IsDateString() purchaseDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imei?: string;
  @ApiProperty() @IsString() @MaxLength(2000) issueDescription!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) issueCategory?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) documentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) internalNotes?: string;
}

export class UpdateClaimStatusDto {
  @ApiProperty({ enum: ElectronicsWarrantyStatus }) @IsEnum(ElectronicsWarrantyStatus) status!: ElectronicsWarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

/** How a claim ended. Older claims may carry other free text. */
export const RESOLUTION_TYPES = ['REPAIRED', 'REPLACED', 'REFUNDED', 'REJECTED'] as const;

export class ResolveClaimDto {
  @ApiProperty({ enum: RESOLUTION_TYPES }) @IsIn(RESOLUTION_TYPES as unknown as string[]) resolutionType!: string;
  /** Unit from shop stock given to the customer (REPLACED). */
  @ApiPropertyOptional() @IsOptional() @IsString() replacementSerialId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) replacementSerialNumber?: string;
  /** Kept for older callers; a refund is read from the bill's returns instead. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) refundAmount?: number;
  /** What the repair cost the shop (technician, parts, brand service). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) repairCost?: number;
  /** Charge to the customer; billed as a sale. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidByCustomer?: number;
  /** Of the charge, what the customer pays now; the rest goes on khata. Left out = all of it. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
  @ApiPropertyOptional({ example: 'CASH' }) @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidByBrand?: number;
  /** The shop's repair cost was paid in cash from the drawer. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() costFromDrawer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isChargeable?: boolean;
}

export class BrandContactDto {
  @ApiProperty() @IsString() @MaxLength(80) brandRef!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) brandResponse?: string;
}

export class ListClaimsDto {
  /** Read by the shop scope; listed so the validator accepts it. */
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsIn(['all', 'open', 'repair', 'brand', 'done', 'closed', 'stale']) view?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['new', 'old']) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
