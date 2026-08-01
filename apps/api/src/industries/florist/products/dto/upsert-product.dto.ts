import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FloristCategoryType, FloristFreshnessGrade } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertFloristProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ enum: FloristCategoryType }) @IsOptional() @IsEnum(FloristCategoryType) categoryType?: FloristCategoryType;
  @ApiPropertyOptional({ enum: FloristFreshnessGrade }) @IsOptional() @IsEnum(FloristFreshnessGrade) freshnessGrade?: FloristFreshnessGrade;

  // Flower specifics
  @ApiPropertyOptional() @IsOptional() @IsString() flowerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() stemLengthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isImported?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() season?: string[];

  // Freshness
  @ApiPropertyOptional() @IsOptional() @IsString() arrivalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() freshUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() daysToWither?: number;

  // Bouquet / arrangement
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPreArranged?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() bouquetSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() stemCount?: number;
  @ApiPropertyOptional() @IsOptional() composition?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() wrapType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ribbonColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasVase?: boolean;

  // Occasions
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() occasions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() meaning?: string;

  // Care
  @ApiPropertyOptional() @IsOptional() @IsString() careInstructions?: string;

  // Customization
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomizable?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() customizationOptions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() minLeadTimeHours?: number;

  // Pricing
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weddingPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSeasonalSpecial?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
