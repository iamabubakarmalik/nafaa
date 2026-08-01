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
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
}
