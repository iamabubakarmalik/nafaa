import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class BarcodeLabelItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  customPrice?: number;
}

export class CreateBarcodeBatchDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  layout?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includePrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeShop?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeMrp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiProperty({ type: [BarcodeLabelItemDto] })
  @IsArray()
  items!: BarcodeLabelItemDto[];
}
