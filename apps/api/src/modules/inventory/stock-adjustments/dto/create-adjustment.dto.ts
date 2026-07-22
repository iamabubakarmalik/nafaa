import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAdjustmentDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

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
    enum: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS'],
    description: 'Type of adjustment',
  })
  @IsEnum(StockMovementType)
  type!: StockMovementType;

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
}
