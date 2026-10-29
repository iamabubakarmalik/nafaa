/**
 * Request bodies for distribution setup: settings, price lists, routes and
 * trade schemes.
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
  ValidateNested,
} from 'class-validator';
import { CREDIT_MODES } from '../distribution.constants';
import { LIST_BASES } from '../helpers/pricing';
import { SCHEME_TYPES } from '../helpers/scheme-resolver';

/* ───────────── settings ───────────── */

export class UpdateDistributionSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional({ enum: CREDIT_MODES }) @IsOptional() @IsIn(CREDIT_MODES) creditMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireCheckIn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(10) @Max(5000) checkInRadiusM?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) orderPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) loadSheetPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() recoveryNeedsVerify?: boolean;
  /** Null clears it. */
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() defaultPriceListId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() defaultShopId?: string | null;
}

/* ───────────── price lists ───────────── */

export class SavePriceListDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional({ enum: LIST_BASES, default: 'WHOLESALE' }) @IsOptional() @IsIn(LIST_BASES) basedOn?: string;
  @ApiPropertyOptional({ description: 'Percent added to the base price (negative for less).' })
  @IsOptional() @IsNumber() @Min(-90) @Max(500) adjustPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class PriceListItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiPropertyOptional({ description: 'ProductUnit id; empty for the base unit.' }) @IsOptional() @IsString() unitId?: string | null;
  @ApiProperty({ description: 'Price per pack (per base unit when no unitId). 0 or less removes the row.' })
  @IsNumber() price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minQty?: number | null;
}

export class UpsertPriceListItemsDto {
  @ApiProperty({ type: [PriceListItemDto] })
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => PriceListItemDto)
  items!: PriceListItemDto[];
}

export class ImportPriceRowDto {
  @ApiPropertyOptional({ description: 'SKU, barcode or exact product name (first that matches).' })
  @IsOptional() @IsString() @MaxLength(200) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional({ description: 'Pack name (Carton, Dozen); empty for the base unit.' })
  @IsOptional() @IsString() @MaxLength(40) unitName?: string;
  @ApiProperty() @IsNumber() price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minQty?: number;
}

export class ImportPriceListDto {
  @ApiProperty({ type: [ImportPriceRowDto] })
  @IsArray() @ArrayMaxSize(5000) @ValidateNested({ each: true }) @Type(() => ImportPriceRowDto)
  rows!: ImportPriceRowDto[];
}

export class DeletePriceListItemsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(2000) @IsString({ each: true }) ids!: string[];
}

/* ───────────── routes ───────────── */

export class SaveRouteDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) area?: string;
  @ApiPropertyOptional({ description: 'Godown or shop whose stock this route sells.' }) @IsOptional() @IsString() shopId?: string | null;
  @ApiPropertyOptional({ type: [Number], description: '0 = Sunday … 6 = Saturday' })
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) visitDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() bookerId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryUserId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class AssignCustomersDto {
  @ApiProperty({ type: [String], description: 'Customers in visit order; they are added after the route\'s current customers unless `replace`.' })
  @IsArray() @ArrayMaxSize(2000) @IsString({ each: true }) customerIds!: string[];
  @ApiPropertyOptional({ description: 'Make these the route\'s only customers, in this order.' })
  @IsOptional() @IsBoolean() replace?: boolean;
}

/* ───────────── schemes ───────────── */

export class SchemeSlabDto {
  @ApiProperty() @IsNumber() @Min(0.0001) minQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) percent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) amountPerUnit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freeQty?: number;
}

export class SaveSchemeDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty({ enum: SCHEME_TYPES }) @IsIn(SCHEME_TYPES) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(1000) @IsString({ each: true }) productIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) brandIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) categoryIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) priceListIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) buyQty?: number;
  @ApiPropertyOptional({ description: 'Buy pack name, e.g. Carton; empty for base units.' }) @IsOptional() @IsString() @MaxLength(40) buyUnitName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freeQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() freeProductId?: string | null;
  @ApiPropertyOptional({ description: 'PERCENT_OFF: percent. AMOUNT_PER_UNIT: rupees per buy pack.' }) @IsOptional() @IsNumber() @Min(0) value?: number;
  @ApiPropertyOptional({ type: [SchemeSlabDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => SchemeSlabDto) slabs?: SchemeSlabDto[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderValue?: number | null;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD (start of that business day) or ISO time.' }) @IsOptional() @IsString() startsAt?: string | null;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD (end of that business day) or ISO time.' }) @IsOptional() @IsString() endsAt?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isClaimable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class SchemePreviewLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiProperty({ description: 'Quantity in base units.' }) @IsNumber() @Min(0) baseQty!: number;
  @ApiProperty({ description: 'Price per base unit before the scheme.' }) @IsNumber() @Min(0) unitPrice!: number;
}

export class SchemePreviewDto {
  @ApiPropertyOptional({ description: 'Customer whose price list limits the schemes.' }) @IsOptional() @IsString() customerId?: string;
  @ApiProperty({ type: [SchemePreviewLineDto] })
  @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => SchemePreviewLineDto) lines!: SchemePreviewLineDto[];
}

export class UpdatePriceListDto extends PartialType(SavePriceListDto) {}
export class UpdateRouteDto extends PartialType(SaveRouteDto) {}
export class UpdateSchemeDto extends PartialType(SaveSchemeDto) {}
