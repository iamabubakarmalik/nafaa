/**
 * Requests for the bulk product editor (spreadsheet view). Only fields that
 * changed are sent. Stock is not part of a save: the editor posts stock
 * through the stock adjustment API so every change leaves a movement.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class BulkEditRowsQuery {
  @IsOptional() @IsUUID() shopId?: string;
  @IsOptional() @IsString() @MaxLength(100) categoryId?: string;
  @IsOptional() @IsIn(['1', 'true']) lowStock?: string;
  @IsOptional() @IsUUID() jobId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class BulkEditChangeDto {
  @ApiProperty() @IsUUID() productId!: string;
  /** Set for a variant row; product-level fields are then ignored. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() variantId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  /** Category / brand by name; a new name creates it, empty clears it. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) lowStockAlert?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkEditSaveDto {
  @ApiProperty({ type: [BulkEditChangeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkEditChangeDto)
  changes!: BulkEditChangeDto[];
}
