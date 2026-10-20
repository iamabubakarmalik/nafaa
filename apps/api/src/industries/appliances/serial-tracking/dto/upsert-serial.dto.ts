import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ApplianceInstallationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

/** Unit states the shop sets by hand; SOLD comes from a bill, REMOVED from the remove button. */
export const SERIAL_STATES = ['IN_STOCK', 'RESERVED', 'SOLD', 'IN_TRANSIT', 'IN_REPAIR', 'RETURNED', 'DEFECTIVE', 'LOST'] as const;

export class UpsertApplianceSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufactureDate?: string;
  @ApiPropertyOptional({ enum: SERIAL_STATES }) @IsOptional() @IsIn([...SERIAL_STATES]) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
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

/** One unit entered by hand; it is placed in the given branch or the one being viewed. */
export class CreateApplianceSerialDto extends UpsertApplianceSerialDto {
  @ApiPropertyOptional({ description: 'Branch the unit sits in' }) @IsOptional() @IsString() shopId?: string;
}

/** All serials of one shipment at once. */
export class BulkSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ description: 'Branch the units sit in' }) @IsOptional() @IsString() shopId?: string;
  @ApiProperty({ type: [String], example: ['SN-001', 'SN-002'] })
  @IsArray() @IsString({ each: true }) serialNumbers!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
}

/** Edit or sell one unit. The POS marks a unit sold with the bill's details. */
export class UpdateApplianceSerialDto extends PartialType(UpsertApplianceSerialDto) {
  @ApiPropertyOptional() @IsOptional() @IsNumber() soldPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() soldAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
}

export class SaleUnitDto {
  @ApiProperty() @IsString() serialId!: string;
}

/** The exact units that left on a counter bill, picked right after the sale. */
export class AssignSaleSerialsDto {
  @ApiProperty() @IsString() saleId!: string;
  @ApiProperty({ type: [SaleUnitDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SaleUnitDto) units!: SaleUnitDto[];
}

/**
 * Puts units in a branch. With a received stock transfer, units of its
 * products move from its source branch to its destination, up to the
 * quantity received. Without one, only units that have no branch yet are
 * placed in `toShopId`.
 */
export class MoveSerialsDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) serialIds?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Scanned serial numbers, instead of ids' }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) serialNumbers?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() transferId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toShopId?: string;
}
