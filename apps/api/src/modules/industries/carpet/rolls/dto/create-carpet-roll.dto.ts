import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { CarpetRollSource, CarpetRollStatus } from '@prisma/client';

export class CreateCarpetRollDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional({ example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 'shop-uuid' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    example: 'R-001',
    description: 'Leave empty to auto-generate (CR-2026-0001)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  rollNumber?: string;

  @ApiPropertyOptional({ example: 'SF-2024-A' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  designCode?: string;

  @ApiProperty({ example: 12, description: 'Width in feet (decimal)' })
  @IsNumber()
  @Min(0.1)
  widthFt!: number;

  @ApiPropertyOptional({ example: 0, description: 'Extra inches (0-11)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthInch?: number;

  @ApiProperty({ example: 100, description: 'Original length — whole feet portion' })
  @IsNumber()
  @Min(0)
  originalLengthFt!: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Original length — inches portion (0-11). Pakistani shop format: 29.6 = 29ft 6in',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalLengthInch?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Remaining length feet (defaults to originalLengthFt)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingLengthFt?: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Remaining length inches (defaults to originalLengthInch)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingLengthInch?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerSqft?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePricePerSqft?: number;

  @ApiPropertyOptional({ example: 82 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePricePerSqft?: number;

  @ApiPropertyOptional({ enum: CarpetRollStatus })
  @IsOptional()
  @IsEnum(CarpetRollStatus)
  status?: CarpetRollStatus;

  @ApiPropertyOptional({ enum: CarpetRollSource })
  @IsOptional()
  @IsEnum(CarpetRollSource)
  sourceType?: CarpetRollSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'Wall-2' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  rackNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Premium' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  quality?: string;

  @ApiPropertyOptional({ example: 'Wool' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  pile?: string;
}
