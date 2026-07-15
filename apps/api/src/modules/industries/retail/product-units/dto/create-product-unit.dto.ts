import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitConversionType } from '@prisma/client';
import {
  IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateProductUnitDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 'dozen' })
  @IsString()
  unitName!: string;

  @ApiPropertyOptional({ example: 'Dozen (12 pieces)' })
  @IsOptional()
  @IsString()
  unitLabel?: string;

  @ApiProperty({ enum: UnitConversionType, example: 'DOZEN' })
  @IsEnum(UnitConversionType)
  conversionType!: UnitConversionType;

  @ApiProperty({ example: 12, description: 'How many BASE units this unit equals' })
  @IsNumber()
  @Min(0.0001)
  conversionRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ example: 1650 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrpPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
