import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareQuotationStatus, HardwareUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class QuotationItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() itemName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specifications?: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiPropertyOptional({ enum: HardwareUnit }) @IsOptional() @IsEnum(HardwareUnit) unit?: HardwareUnit;
  @ApiProperty() @IsNumber() unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
}

export class CreateQuotationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() validityDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() laborCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() attachmentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiProperty({ type: [QuotationItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationItemDto) items!: QuotationItemDto[];
}

export class UpdateQuotationStatusDto {
  @ApiProperty({ enum: HardwareQuotationStatus }) @IsEnum(HardwareQuotationStatus) status!: HardwareQuotationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
