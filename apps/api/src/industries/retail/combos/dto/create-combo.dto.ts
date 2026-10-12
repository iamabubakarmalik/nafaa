import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComboStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Blank strings clear the field instead of saving "". */
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export class ComboItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string | null;

  @ApiPropertyOptional({ description: 'Pack unit of the part (dozen, carton); base unit when empty' })
  @IsOptional()
  @IsString()
  unitId?: string | null;

  @ApiProperty({ description: 'Quantity in the chosen unit' })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unitName?: string;

  @ApiPropertyOptional({ description: 'Normal price of one unit of this part; the current price when empty' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;
}

export class CreateComboDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(140)
  slug?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60)
  sku?: string | null;

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
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(1000)
  imageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  categoryId?: string | null;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  comboPrice!: number;

  @ApiPropertyOptional({ enum: ComboStatus })
  @IsOptional()
  @IsEnum(ComboStatus)
  status?: ComboStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPurchasePerCustomer?: number | null;

  @ApiPropertyOptional({ description: 'Upper limit on how many can be sold; parts stock limits it anyway' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockAvailable?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60)
  tagLine?: string | null;

  @ApiProperty({ type: [ComboItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[];
}

export class ComboRangeDto {
  @ApiPropertyOptional({ description: 'First business day, YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ description: 'Last business day, YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
