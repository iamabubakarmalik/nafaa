import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgriCategory, FeedType, FertilizerType, SeasonType, SeedType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertAgriProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ enum: AgriCategory }) @IsEnum(AgriCategory) category!: AgriCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategory?: string;

  @ApiPropertyOptional({ enum: SeedType }) @IsOptional() @IsEnum(SeedType) seedType?: SeedType;
  @ApiPropertyOptional({ enum: FertilizerType }) @IsOptional() @IsEnum(FertilizerType) fertilizerType?: FertilizerType;
  @ApiPropertyOptional({ enum: FeedType }) @IsOptional() @IsEnum(FeedType) feedType?: FeedType;

  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() npkRatio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
  @ApiPropertyOptional() @IsOptional() ingredients?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() concentration?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() bagsPerTon?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() applicationRate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() applicationMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() applicationInterval?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetCrops?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetPests?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetAnimals?: string[];

  @ApiPropertyOptional({ enum: SeasonType }) @IsOptional() @IsEnum(SeasonType) season?: SeasonType;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() suitableFor?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() cropStage?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() toxicityLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ppePeriod?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() reEntryPeriod?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warningLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hazardClass?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOrganic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() organicCertNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() govtRegNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() govtRegExpiry?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() shelfLifeMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() storageTemp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageInstructions?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minStockAlert?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bulkDiscountThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bulkDiscountPct?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() usageInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() precautions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstAid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() msdsUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brochureUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSeasonal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRestricted?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresLicense?: boolean;
}
