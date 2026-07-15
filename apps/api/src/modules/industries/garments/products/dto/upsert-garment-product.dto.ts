import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentCategoryType, GarmentFabricType, GarmentFitType, GarmentGender, GarmentSeason, GarmentWorkType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertGarmentProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sizeChartId?: string;
  @ApiPropertyOptional({ enum: GarmentGender }) @IsOptional() @IsEnum(GarmentGender) gender?: GarmentGender;
  @ApiPropertyOptional({ enum: GarmentCategoryType }) @IsOptional() @IsEnum(GarmentCategoryType) categoryType?: GarmentCategoryType;
  @ApiPropertyOptional({ enum: GarmentSeason }) @IsOptional() @IsEnum(GarmentSeason) season?: GarmentSeason;
  @ApiPropertyOptional({ enum: GarmentFabricType }) @IsOptional() @IsEnum(GarmentFabricType) fabricType?: GarmentFabricType;
  @ApiPropertyOptional() @IsOptional() @IsString() fabricBlend?: string;
  @ApiPropertyOptional({ enum: GarmentWorkType }) @IsOptional() @IsEnum(GarmentWorkType) workType?: GarmentWorkType;
  @ApiPropertyOptional({ enum: GarmentFitType }) @IsOptional() @IsEnum(GarmentFitType) fitType?: GarmentFitType;
  @ApiPropertyOptional() @IsOptional() @IsString() neckline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sleeveType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sleeveLength?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pattern?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() careInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelHeight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelWearingSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() styleCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lookBookUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isReadyMade?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isStitchable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFabricOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowAlteration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowReservation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowLayaway?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() minAlterationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() defaultStitchingDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOnSale?: boolean;
}

export class UpsertVariantProfileDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() variantId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorFamily?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skuSuffix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() chest?: number;
  @ApiPropertyOptional() @IsOptional() waist?: number;
  @ApiPropertyOptional() @IsOptional() hip?: number;
  @ApiPropertyOptional() @IsOptional() shoulder?: number;
  @ApiPropertyOptional() @IsOptional() length?: number;
  @ApiPropertyOptional() @IsOptional() sleeveLength?: number;
  @ApiPropertyOptional() @IsOptional() inseam?: number;
  @ApiPropertyOptional() @IsOptional() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() fabricMeters?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeaturedColor?: boolean;
}
