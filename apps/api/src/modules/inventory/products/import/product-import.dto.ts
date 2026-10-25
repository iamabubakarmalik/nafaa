/**
 * Requests for the product import (Excel / CSV). The browser maps the sheet
 * columns and sends every cell as text; the server parses and validates the
 * values, so a check and an import always judge a row the same way.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
} from 'class-validator';

/** One sheet row after column mapping. `row` is the line number in the file. */
export class ImportRowDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  row!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) price?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) costPrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) wholesalePrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) taxRate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) stock?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lowStockAlert?: string;

  /** Variant label ("Large", "Red / XL"); several comma-separated ones become several variants. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) variant?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) color?: string;

  /** One pack (carton, box, dozen) of the product. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) packName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) packQty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) packPrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) packBarcode?: string;

  /** Batch and expiry of the opening stock. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) expiryDate?: string;

  /** Phone IMEIs (15 digits each), separated by commas or spaces; stock is their count. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20_000) imei?: string;
}

export const EXISTING_STOCK_MODES = ['add', 'set', 'skip'] as const;
export type ExistingStockMode = (typeof EXISTING_STOCK_MODES)[number];

/**
 * What to do with a row whose product is already in the shop. Left out, such
 * rows are skipped (the behaviour before these options existed).
 */
export class ExistingOptionsDto {
  /** add: stock in the file is added; set: stock becomes the file's number; skip: stock untouched. */
  @ApiProperty({ enum: EXISTING_STOCK_MODES })
  @IsIn(EXISTING_STOCK_MODES)
  stock!: ExistingStockMode;

  /** Also update price and cost from the file. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  prices?: boolean;
}

export class ImportCheckDto {
  @ApiProperty({ type: [ImportRowDto] })
  @IsArray()
  @ArrayMaxSize(10_000)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows!: ImportRowDto[];

  /** Branch that receives the opening stock; the active branch when left out. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ type: ExistingOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExistingOptionsDto)
  existing?: ExistingOptionsDto;
}

/** One chunk of an import. The first chunk opens a job; later chunks pass its id. */
export class ImportRunDto {
  @ApiProperty({ type: [ImportRowDto] })
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows!: ImportRowDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ type: ExistingOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExistingOptionsDto)
  existing?: ExistingOptionsDto;

  @ApiProperty({ example: 'maal.xlsx' })
  @IsString()
  @MaxLength(200)
  fileName!: string;

  /** Rows in the whole file, for the job's progress. */
  @ApiProperty()
  @IsInt()
  @Min(0)
  totalRows!: number;

  /** True on the last chunk: the job is closed with its final status. */
  @ApiProperty()
  @IsBoolean()
  done!: boolean;
}
