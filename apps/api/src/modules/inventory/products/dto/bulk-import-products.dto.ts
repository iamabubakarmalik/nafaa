import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single row in bulk import (Excel or manual entry).
 * All fields except name are optional — name is required.
 */
export class BulkImportProductRowDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  // Reference by NAME (will be matched to ID server-side)
  @ApiPropertyOptional({ description: 'Category name (will match to ID)' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({ description: 'Brand name (will match to ID)' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tag names' })
  @IsOptional()
  @IsString()
  tagNames?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  wholesalePrice?: number;

  @ApiPropertyOptional({ example: 17 })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  lowStockAlert?: number;

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

  /** Comma-separated variant names (e.g. "Red, Blue, Green") */
  @ApiPropertyOptional({ description: 'Comma-separated variant names' })
  @IsOptional()
  @IsString()
  variantNames?: string;

  /** Comma-separated image URLs */
  @ApiPropertyOptional({ description: 'Comma-separated image URLs' })
  @IsOptional()
  @IsString()
  imageUrls?: string;
}

export class BulkImportProductsPreviewDto {
  @ApiProperty({ type: [BulkImportProductRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportProductRowDto)
  rows!: BulkImportProductRowDto[];
}

// ─── Response types ───────────────────────────────────────

export interface BulkImportProductRowPreview {
  index: number;
  // Original input
  name: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  taxRate: number;
  stock: number;
  lowStockAlert: number;
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  expiryTracked: boolean;
  isActive: boolean;
  isFeatured: boolean;

  // Resolved references
  categoryName?: string;
  categoryId?: string;
  brandName?: string;
  brandId?: string;
  tagNames: string[];
  tagIds: string[];
  variantNames: string[];
  imageUrls: string[];

  // Validation
  valid: boolean;
  errors: string[];
  warnings: string[];

  // Will be auto-created if not found
  willCreateCategory: boolean;
  willCreateBrand: boolean;
  willCreateTags: string[];
}

export interface BulkImportProductsPreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: BulkImportProductRowPreview[];

  // Summary
  totalProductsToCreate: number;
  totalVariantsToCreate: number;
  totalCategoriesToCreate: number;
  totalBrandsToCreate: number;
  totalTagsToCreate: number;

  // Stats
  totalStockValue: number;
  totalCostValue: number;
}
