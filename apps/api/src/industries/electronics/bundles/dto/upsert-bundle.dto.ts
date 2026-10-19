import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
  MinLength, ValidateNested,
} from 'class-validator';

export class BundleItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(1000) quantity!: number;
  /** Normal price of one piece; left out, the product's price is used. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
}

export class UpsertBundleDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @ApiProperty({ type: [BundleItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => BundleItemDto)
  items!: BundleItemDto[];
  /** Kept for older callers; the server works it out from the items. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) originalPrice?: number;
  @ApiProperty() @IsNumber() @Min(1) bundlePrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string | null;
}

/** Any subset of the fields, e.g. only isActive or isFeatured. */
export class PatchBundleDto extends PartialType(UpsertBundleDto) {}
