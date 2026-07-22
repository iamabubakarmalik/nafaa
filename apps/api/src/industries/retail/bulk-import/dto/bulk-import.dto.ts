import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BulkJobType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BulkImportRowDto {
  @ApiProperty()
  @IsString()
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
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  wholesalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  lowStockAlert?: number;
}

export class BulkImportDto {
  @ApiProperty({ enum: BulkJobType })
  @IsEnum(BulkJobType)
  jobType!: BulkJobType;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({ type: [BulkImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportRowDto)
  rows!: BulkImportRowDto[];
}
