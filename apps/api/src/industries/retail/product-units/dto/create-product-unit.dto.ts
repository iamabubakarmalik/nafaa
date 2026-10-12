import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitConversionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Blank strings clear the field instead of saving "". */
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class CreateProductUnitDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string | null;

  @ApiProperty({ example: 'dozen' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unitName!: string;

  @ApiPropertyOptional({ example: 'Dozen (12 pieces)' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80)
  unitLabel?: string | null;

  @ApiProperty({ enum: UnitConversionType, example: 'DOZEN' })
  @IsEnum(UnitConversionType)
  conversionType!: UnitConversionType;

  @ApiProperty({ example: 12, description: 'How many base units this unit equals' })
  @IsNumber()
  @Min(0.0001)
  @Max(1_000_000)
  conversionRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 1650, description: 'Base price × rate when empty or 0' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Base cost × rate when empty or 0' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrpPrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60)
  @Matches(/^\S+$/, { message: 'Barcode me khali jagah nahi ho sakti' })
  barcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60)
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** One pack added to many products at once. */
export class BulkAddUnitDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  productIds!: string[];

  @ApiProperty({ example: 'carton' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unitName!: string;

  @ApiProperty({ enum: UnitConversionType })
  @IsEnum(UnitConversionType)
  conversionType!: UnitConversionType;

  @ApiProperty({ example: 24 })
  @IsNumber()
  @Min(0.0001)
  @Max(1_000_000)
  conversionRate!: number;

  @ApiPropertyOptional({ description: 'Percent off the base price × rate (0 = same rate as loose)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Round the pack price to this many rupees (1, 5, 10)' })
  @IsOptional()
  @IsIn([1, 5, 10, 50, 100])
  roundTo?: number;

  @ApiPropertyOptional({ description: 'Products that already have this pack get the new rate and price' })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class UnitsOverviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ enum: ['all', 'with', 'without', 'noBarcode', 'priceIssue'] })
  @IsOptional()
  @IsIn(['all', 'with', 'without', 'noBarcode', 'priceIssue'])
  filter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UnitsAnalyticsDto {
  @ApiPropertyOptional({ description: 'First business day, YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ description: 'Last business day, YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
