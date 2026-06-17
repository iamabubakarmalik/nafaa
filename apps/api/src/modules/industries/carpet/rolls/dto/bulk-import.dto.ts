import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsNumber, IsOptional, IsString, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.1)
  lengthFt!: number;

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
  @ValidateNested({ each: true })
  @Type(() => BulkImportRollRow)
  rows!: BulkImportRollRow[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}
