/**
 * Requests for the product import (Excel / CSV). The browser maps the sheet
 * columns and sends every cell as text; the server parses and validates the
 * values, so a check and an import always judge a row the same way.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
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
