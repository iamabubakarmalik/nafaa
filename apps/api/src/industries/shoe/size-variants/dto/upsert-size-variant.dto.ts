import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoeSizeSystem, ShoeWidth } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertSizeVariantDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() size!: string;
  @ApiPropertyOptional({ enum: ShoeSizeSystem }) @IsOptional() @IsEnum(ShoeSizeSystem) sizeSystem?: ShoeSizeSystem;
  @ApiPropertyOptional({ enum: ShoeWidth }) @IsOptional() @IsEnum(ShoeWidth) width?: ShoeWidth;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() boxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() lowStockAlert?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priceOverride?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costOverride?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkUpsertSizeVariantsDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ type: [UpsertSizeVariantDto] }) @IsArray() variants!: Omit<UpsertSizeVariantDto, 'productId'>[];
}

export class AdjustStockDto {
  @ApiProperty() @IsInt() delta!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
