import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, Max, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCarpetRollDto } from './create-carpet-roll.dto';

export class BulkImportRollRow {
  @ApiProperty({ example: 'Sun Flower' })
  @IsString()
  productName!: string;

  @ApiPropertyOptional({ example: 'Cream' })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiPropertyOptional({ example: 'R-001' })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designCode?: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0.1)
  widthFt!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  widthInch?: number;

  @ApiProperty({ example: 100, description: 'Whole feet portion' })
  @IsNumber()
  @Min(0)
  lengthFt!: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Inches portion (0-11). Pakistani format: 29.6 = 29ft + 6in',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthInch?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  costPerSqft?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  salePricePerSqft?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pile?: string;
}

export class BulkImportPreviewDto {
  @ApiProperty({ type: [BulkImportRollRow] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BulkImportRollRow)
  rows!: BulkImportRollRow[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}

/** A checked preview row sent back to create the roll. */
export class BulkImportApplyRow {
  @IsString()
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @IsOptional() @IsString()
  rollNumber?: string;

  @IsOptional() @IsString()
  designCode?: string;

  @IsNumber() @Min(0.1)
  widthFt!: number;

  @IsOptional() @IsNumber() @Min(0) @Max(11.99)
  widthInch?: number;

  @IsNumber() @Min(0)
  lengthFt!: number;

  @IsOptional() @IsNumber() @Min(0) @Max(11.99)
  lengthInch?: number;

  @IsOptional() @IsNumber() @Min(0)
  costPerSqft?: number;

  @IsOptional() @IsNumber() @Min(0)
  salePricePerSqft?: number;

  @IsOptional() @IsString()
  rackNumber?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  quality?: string;

  @IsOptional() @IsString()
  pile?: string;
}

export class BulkImportApplyDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BulkImportApplyRow)
  rows!: BulkImportApplyRow[];

  @IsOptional() @IsString()
  shopId?: string;
}

export class BulkOpeningDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateCarpetRollDto)
  rolls!: CreateCarpetRollDto[];
}
