import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsPositive,
  Max,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';
import { REASON_CODES, type ReasonCode } from '../reason-codes';

/**
 * Only these change stock by hand; sales, purchases and transfers have their
 * own flows. OPENING_BALANCE is first stock or goods made in the shop: it adds
 * stock but is not "found stock", so it stays out of write-offs and profit.
 */
export const ADJUSTMENT_TYPES = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'OPENING_BALANCE'] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export class CreateAdjustmentDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional({
    description:
      'Kis shop ka stock theek karna hai. Multi-shop me ye zaroori hai — ' +
      'iske baghair sirf global ginti badalti thi aur shop ka stock ' +
      '(ShopStock) purana hi reh jata tha.',
  })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    description: 'Variant ID (required if product has variants)',
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Carpet Roll ID (for carpet businesses)',
  })
  @IsOptional()
  @IsString()
  carpetRollId?: string;

  @ApiPropertyOptional({
    description: 'IMEI ID (for mobile businesses)',
  })
  @IsOptional()
  @IsString()
  imeiId?: string;

  @ApiProperty({
    enum: ADJUSTMENT_TYPES,
    description: 'Type of adjustment',
  })
  @IsIn(ADJUSTMENT_TYPES)
  type!: AdjustmentType;

  @ApiProperty({
    example: 5,
    description: 'Quantity (decimal allowed). For carpet rolls, this is length in feet.',
  })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 'Damaged in storage' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ enum: REASON_CODES, description: 'Reason from the fixed list; sets the type and the profit effect.' })
  @IsOptional()
  @IsIn(REASON_CODES)
  reasonCode?: ReasonCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  // ─── Carpet-specific fields ─────────────────────────
  @ApiPropertyOptional({
    description: 'For carpet: length adjustment in feet (positive = add, negative = subtract)',
  })
  @IsOptional()
  @IsNumber()
  lengthFt?: number;

  @ApiPropertyOptional({
    description: 'For carpet: length adjustment in inches (0-11)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthInch?: number;

  @ApiPropertyOptional({
    description: 'For carpet: mark whole roll as damaged/lost (status change)',
  })
  @IsOptional()
  @IsString()
  rollAction?: 'ADJUST_LENGTH' | 'MARK_DAMAGED' | 'MARK_LOST' | 'RESTORE';

  // ─── Batch (expiry-tracked goods) ───────────────────
  @ApiPropertyOptional({ description: 'Stock out: taken from this batch first. Stock in: added to this batch.' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'Stock in: new or existing batch number (with its expiry)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Stock in: expiry date of that batch' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Stock in: manufacture date of a new batch' })
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;
}

/** One line of a multi-line adjustment, in base units or a pack unit. */
export class AdjustmentLineDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsIn(ADJUSTMENT_TYPES) type!: AdjustmentType;
  @IsNumber() @IsPositive() quantity!: number;
  /** Base units in one of the unit used (carton = 24); default 1. */
  @IsOptional() @IsNumber() @IsPositive() conversionRate?: number;
  @IsOptional() @IsString() @MaxLength(30) unitName?: string;
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
  /** Reason from the fixed list for this line; the batch's reasonCode when left out. */
  @IsOptional() @IsIn(REASON_CODES) reasonCode?: ReasonCode;
  @IsOptional() @IsString() batchId?: string;
  @IsOptional() @IsString() @MaxLength(80) batchNumber?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() manufactureDate?: string;
}

export class BatchAdjustmentDto {
  @IsOptional() @IsString() shopId?: string;
  @IsString() @IsNotEmpty() @MaxLength(120) reason!: string;
  @IsOptional() @IsIn(REASON_CODES) reasonCode?: ReasonCode;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => AdjustmentLineDto) items!: AdjustmentLineDto[];
}

/** Physical stock count: what is on the shelf; the difference is adjusted. */
export class CountLineDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsNumber() @Min(0) counted!: number;
}

export class StockCountDto {
  @IsOptional() @IsString() shopId?: string;
  /** Reason on each line; "Stock ginti" when left out (bulk edit sends "Bulk edit"). */
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  /** A data correction: stock is set to the count, profit is not touched. Needs stock_adjustments.correct. */
  @IsOptional() @IsBoolean() correction?: boolean;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => CountLineDto) items!: CountLineDto[];
}

export class ListAdjustmentsDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsIn(['all', ...ADJUSTMENT_TYPES]) type?: string;
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
