import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceInstallationStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertApplianceSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufactureDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() installationRequired?: boolean;
  @ApiPropertyOptional({ enum: ApplianceInstallationStatus }) @IsOptional() @IsEnum(ApplianceInstallationStatus) installationStatus?: ApplianceInstallationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() installationScheduledFor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
  @ApiPropertyOptional({ description: 'Compressor ki alag warranty — fridge/AC me aam hai' })
  @IsOptional() @IsString() compressorWarrantyEndDate?: string;
  @ApiPropertyOptional({ description: 'Motor ki alag warranty — washing machine me aam hai' })
  @IsOptional() @IsString() motorWarrantyEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
}

/** Aik shipment ke saare serial ek sath register karne ke liye */
export class BulkSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ type: [String], example: ['SN-001', 'SN-002'] })
  @IsArray() @IsString({ each: true }) serialNumbers!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
}
