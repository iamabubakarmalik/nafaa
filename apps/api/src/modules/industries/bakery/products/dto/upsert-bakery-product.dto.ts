import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BakeryCategory, BakerySize, CakeShape, CakeFlavor, CreamType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBakeryProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ enum: BakeryCategory }) @IsEnum(BakeryCategory) category!: BakeryCategory;
  @ApiPropertyOptional({ enum: BakerySize }) @IsOptional() @IsEnum(BakerySize) defaultSize?: BakerySize;
  @ApiPropertyOptional({ enum: CakeShape }) @IsOptional() @IsEnum(CakeShape) defaultShape?: CakeShape;
  @ApiPropertyOptional({ enum: CakeFlavor }) @IsOptional() @IsEnum(CakeFlavor) defaultFlavor?: CakeFlavor;
  @ApiPropertyOptional({ enum: CreamType }) @IsOptional() @IsEnum(CreamType) defaultCreamType?: CreamType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerPiece?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerDozen?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerSlice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerBox?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerTray?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() servingSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfSlices?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomizable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCakeCustomizable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowsMessageOnCake?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowsPhotoOnCake?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowsCustomShape?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowsFlavorChoice?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowsSizeChoice?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() prepTimeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() advanceOrderHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() minOrderQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxOrderQty?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() shelfLifeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() shelfLifeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresRefrigeration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() storageTempMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() storageTempMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bestConsumedWithin?: string;

  @ApiPropertyOptional() @IsOptional() ingredients?: any;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() allergens?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() containsEgg?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() containsNuts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() containsGluten?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() containsDairy?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEggless?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSugarFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHalal?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() dietaryBadges?: string[];
  @ApiPropertyOptional() @IsOptional() nutritionInfo?: any;
  @ApiPropertyOptional() @IsOptional() @IsInt() caloriesPerServing?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() variationImages?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ingredientList?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() servingSuggestions?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSeasonalItem?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() seasonName?: string;
}
