import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional,
  IsString, Matches, MaxLength, Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Chocolate Cake' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ example: 'CAKE-001' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  barcode?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  /** Price for wholesale buyers. Empty or null means the retail price. */
  @ApiPropertyOptional({ example: 1000, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number | null;

  /** Price for credit (udhaar) customers. Empty or null means the retail price. */
  @ApiPropertyOptional({ example: 1300, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditPrice?: number | null;

  @ApiPropertyOptional({ example: 17 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  /**
   * Opening stock, booked as an OPENING_BALANCE movement on create. On an
   * edit it is used only for a product that has never held stock.
   */
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAlert?: number;

  /** Branch that receives the opening stock; the active branch when left out. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  /**
   * Kind of product: MADE / BOUGHT (kitchen, bakery), SERVICE / SERVICE_FEE
   * (no stock), or an industry kind such as PET_ANIMAL. null clears it.
   */
  @ApiPropertyOptional({ example: 'MADE', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z_]+$/, { message: 'productType sirf haroof aur _ ho sakta hai' })
  productType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expiryTracked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  /** Bought to make things (flour, fabric, spare parts); hidden from the POS. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRawMaterial?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
