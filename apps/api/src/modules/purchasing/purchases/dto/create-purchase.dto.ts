import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

// ─── Carpet roll payload (per-roll details) ────────────────
class PurchaseRollDto {
  @ApiPropertyOptional({ example: 'R-001' })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional({ example: 'SF-2024-A' })
  @IsOptional()
  @IsString()
  designCode?: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  widthFt!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthInch?: number;

  @ApiProperty({ example: 122 })
  @IsNumber()
  @Min(0)
  lengthFt!: number;

  @ApiPropertyOptional({ example: 31.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerSqft?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePricePerSqft?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePricePerSqft?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * One bill line: a product (optionally a variant) or a bakery raw material.
 * Quantity and cost are in the chosen unit: a product unit (`unitId`, e.g.
 * carton = 24) or a purchase-only unit (`unitName` + `conversionRate`, e.g.
 * bori = 50 kg). Without a unit the line is in base units.
 */
export class CreatePurchaseItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional({ description: 'Bakery raw material' }) @IsOptional() @IsString() ingredientId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) unitName?: string;
  @ApiPropertyOptional({ description: 'Base units in one of this unit' })
  @IsOptional() @IsNumber() @IsPositive() conversionRate?: number;

  @ApiProperty({ example: 10 }) @IsNumber() @IsPositive() quantity!: number;
  @ApiProperty({ example: 800, description: 'Cost of one unit as bought' }) @IsNumber() @Min(0) costPrice!: number;
  @ApiPropertyOptional({ description: 'New selling price of one base unit' }) @IsOptional() @IsNumber() @Min(0) salePrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;

  @ApiPropertyOptional({ type: [PurchaseRollDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRollDto)
  rolls?: PurchaseRollDto[];
}

export class CreatePurchaseDto {
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' }) @IsIn(MONEY_METHODS) paymentMethod!: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional({ description: 'Freight, loading and other costs' }) @IsOptional() @IsNumber() @Min(0) otherCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional({ description: 'Paid now; missing = paid in full' }) @IsOptional() @IsNumber() @Min(0) paidAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) supplierInvoiceNo?: string;
  @ApiPropertyOptional({ description: 'Bill date (default now)' }) @IsOptional() @IsDateString() purchasedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedAt?: string;
  @ApiPropertyOptional({ description: 'false = order only, goods not here yet' }) @IsOptional() @IsBoolean() receive?: boolean;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];
}

class LineQtyDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty({ description: 'In the line\'s unit' }) @IsNumber() @IsPositive() quantity!: number;
}

/** Goods of an order arriving, all or part. */
export class ReceivePurchaseDto {
  @ApiProperty({ type: [LineQtyDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LineQtyDto) items!: LineQtyDto[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional({ description: 'Close the order; the rest will not come' }) @IsOptional() @IsBoolean() close?: boolean;
}

/** Goods sent back to the supplier. */
export class ReturnPurchaseDto {
  @ApiProperty({ type: [LineQtyDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LineQtyDto) items!: LineQtyDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

export class CancelPurchaseDto {
  @ApiProperty() @IsString() @MaxLength(200) reason!: string;
}

export class ListPurchasesDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsIn(['all', 'PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED', 'credit', 'returned']) status?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
