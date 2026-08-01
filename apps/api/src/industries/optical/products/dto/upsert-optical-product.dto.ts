import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpticalCategoryType, OpticalFrameMaterial, OpticalFrameShape, OpticalGender } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertOpticalProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ enum: OpticalCategoryType }) @IsOptional() @IsEnum(OpticalCategoryType) categoryType?: OpticalCategoryType;

  @ApiPropertyOptional({ enum: OpticalFrameShape }) @IsOptional() @IsEnum(OpticalFrameShape) frameShape?: OpticalFrameShape;
  @ApiPropertyOptional({ enum: OpticalFrameMaterial }) @IsOptional() @IsEnum(OpticalFrameMaterial) frameMaterial?: OpticalFrameMaterial;
  @ApiPropertyOptional({ enum: OpticalGender }) @IsOptional() @IsEnum(OpticalGender) gender?: OpticalGender;

  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionName?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() frameSizeMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bridgeSizeMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() templeLengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() lensWidthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() lensHeightMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() frameWeightG?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() frameColorOptions?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() lensType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lensMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lensIndex?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() lensCoatings?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBlueCut?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasAntiGlare?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasUvProtection?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPolarized?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPhotochromic?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isContactLens?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() clDuration?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clWaterContent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clBaseCurve?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clDiameter?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() clUvProtection?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() clForAstigmatism?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() supportsMinSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() supportsMaxSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() supportsMinCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() supportsMaxCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() supportsProgressive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountedPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDesigner?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls3d?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() tryOnUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
