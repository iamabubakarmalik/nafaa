import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectronicsSerialStatus, ElectronicsWarrantyStatus } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() macAddress?: string;
  @ApiPropertyOptional({ enum: ElectronicsSerialStatus }) @IsOptional() @IsEnum(ElectronicsSerialStatus) status?: ElectronicsSerialStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
  @ApiPropertyOptional({ enum: ElectronicsWarrantyStatus }) @IsOptional() @IsEnum(ElectronicsWarrantyStatus) warrantyStatus?: ElectronicsWarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() batteryHealthPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() screenCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() physicalCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() functionalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
}

export class BulkCreateSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ type: [String] }) @IsArray() serialNumbers!: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
}

export class SellSerialDto {
  @ApiProperty() @IsNumber() soldPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
}
