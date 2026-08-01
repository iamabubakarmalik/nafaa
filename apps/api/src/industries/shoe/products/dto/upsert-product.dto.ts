import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoeCategoryType, ShoeGender, ShoeSizeSystem, ShoeWidth } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertShoeProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: ShoeCategoryType }) @IsOptional() @IsEnum(ShoeCategoryType) categoryType?: ShoeCategoryType;
  @ApiPropertyOptional({ enum: ShoeGender }) @IsOptional() @IsEnum(ShoeGender) gender?: ShoeGender;
  @ApiPropertyOptional() @IsOptional() @IsString() ageGroup?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() modelName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collection?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() season?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() upperMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soleMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() innerMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() liningMaterial?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patternType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() closureType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toeShape?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() heelHeight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() heelType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soleType?: string;

  @ApiPropertyOptional({ enum: ShoeSizeSystem }) @IsOptional() @IsEnum(ShoeSizeSystem) sizeSystem?: ShoeSizeSystem;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() availableSizes?: string[];
  @ApiPropertyOptional({ enum: ShoeWidth }) @IsOptional() @IsEnum(ShoeWidth) width?: ShoeWidth;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() runsLarge?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() runsSmall?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() sizingNotes?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isWaterproof?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBreathable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasAirCushion?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasArchSupport?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOrthopedic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHandmade?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() sport?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() playingSurface?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() careInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cleaningRecommendation?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyDetails?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBox?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesDustBag?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesExtraLaces?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() boxColor?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() memberPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTrending?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBridal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEidSpecial?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
