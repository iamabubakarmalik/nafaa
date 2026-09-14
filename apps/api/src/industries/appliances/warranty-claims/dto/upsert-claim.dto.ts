import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceClaimStatus } from '@prisma/client';
import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateClaimDto {
  @ApiProperty() @IsString() productName!: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty({ description: 'Kya kharabi thi' }) @IsString() issue!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() serialTrackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;

  @ApiPropertyOptional({ description: 'Jis repair se ye claim juda hai' })
  @IsOptional() @IsString() serviceRequestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceRequestNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueCategory?: string;

  @ApiPropertyOptional({ description: 'MAIN / COMPRESSOR / MOTOR' })
  @IsOptional() @IsString() warrantyKind?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) partsCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) laborCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) otherCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() brandContact?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Sab optional — sirf jo badla wohi bhejna kaafi */
export class UpdateClaimDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyKind?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) partsCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) laborCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) otherCost?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Brand ko bhejna */
export class SubmitClaimDto {
  @ApiPropertyOptional({ description: 'Brand ka apna reference / ticket number' })
  @IsOptional() @IsString() brandRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Brand ka jawab darj karna */
export class BrandResponseDto {
  @ApiProperty({ enum: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'BRAND_REVIEWING'] })
  @IsEnum(ApplianceClaimStatus) status!: ApplianceClaimStatus;

  @ApiPropertyOptional({ description: 'Brand ne kitna manzoor kiya' })
  @IsOptional() @IsNumber() @Min(0) approvedAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() brandResponse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() replacementSerialNumber?: string;
}

/** Brand se paisa/part mila */
export class SettleClaimDto {
  @ApiProperty({ description: 'Brand se jitna paisa mila' })
  @IsNumber() @Min(0) receivedAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
