import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PtaStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString,
  Length, Matches, Min, ValidateNested,
} from 'class-validator';

export class BulkImeiEntry {
  @ApiProperty({ example: '123456789012345' })
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: PtaStatus })
  @IsOptional()
  @IsEnum(PtaStatus)
  ptaStatus?: PtaStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  ptaTaxPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateImeiDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  warrantyMonths?: number;

  @ApiProperty({ type: [BulkImeiEntry], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkImeiEntry)
  imeis!: BulkImeiEntry[];
}
