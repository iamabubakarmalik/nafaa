import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export class UpsertVariantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  /** Credit (udhaar) price of this variant; empty falls back to the product. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditPrice?: number | null;

  /** Opening stock, booked as an OPENING_BALANCE movement in one branch. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAlert?: number;

  /** Branch that receives the opening stock; the active branch when left out. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/**
 * Body of POST /products/:id/variants/bulk. Lines are not validated one by
 * one (older clients send extra fields); `@Type` keeps them as objects under
 * the global implicit conversion.
 */
export class BulkVariantsDto {
  @ApiProperty({ type: [UpsertVariantDto] })
  @IsArray()
  @Type(() => UpsertVariantDto)
  variants!: UpsertVariantDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}
