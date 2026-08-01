import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectronicsWarrantyStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateClaimDto {
  @ApiPropertyOptional() @IsOptional() @IsString() serialTrackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerEmail?: string;
  @ApiProperty() @IsString() purchaseDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei?: string;
  @ApiProperty() @IsString() issueDescription!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueCategory?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateClaimStatusDto {
  @ApiProperty({ enum: ElectronicsWarrantyStatus }) @IsEnum(ElectronicsWarrantyStatus) status!: ElectronicsWarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ResolveClaimDto {
  @ApiProperty() @IsString() resolutionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() replacementSerialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() refundAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() repairCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidByCustomer?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidByBrand?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isChargeable?: boolean;
}

export class BrandContactDto {
  @ApiProperty() @IsString() brandRef!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandResponse?: string;
}
