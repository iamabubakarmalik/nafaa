/** Requests for a product's suppliers and the bulk product update. */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class SupplierLinkDto {
  @ApiProperty() @IsUUID() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) supplierSku?: string | null;
  /** Usual cost of one base unit. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number | null;
  /** In base units. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderQty?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(365) leadDays?: number | null;
  /** The pack usually bought from this supplier. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() unitId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPreferred?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string | null;
}

export class ReplaceSupplierLinksDto {
  @ApiProperty({ type: [SupplierLinkDto] })
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SupplierLinkDto)
  links!: SupplierLinkDto[];
}

export class SupplierLinksQuery {
  @IsOptional() @IsUUID() supplierId?: string;
}

/** One change applied to many products from the products page. */
export class BulkProductUpdateDto {
  @ApiProperty() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @IsUUID('all', { each: true }) productIds!: string[];
  /** Move to a category; 'none' clears it. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) brandId?: string;
  /** Add this supplier to every product (kept if already there). */
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;
  /** With supplierId: also make it the preferred supplier. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() preferred?: boolean;
  /** Change a price by a percent (+10 = 10% up, -5 = 5% down). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(500) pricePercent?: number;
  /** Which price the percent applies to. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['price', 'wholesalePrice', 'creditPrice']) priceField?: 'price' | 'wholesalePrice' | 'creditPrice';
  /** Round the new price to this step (1, 5, 10). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) @Max(1000) roundTo?: number;
  /** Also change each pack's price of that tier by the same percent. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() withPacks?: boolean;
}
