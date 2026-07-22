import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeatAnimalType, MeatCutCategory, MeatFreshnessType, MeatQualityGrade, MeatSaleUnit, MeatSlaughterMethod } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertMeatProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ enum: MeatAnimalType }) @IsEnum(MeatAnimalType) animalType!: MeatAnimalType;
  @ApiProperty({ enum: MeatCutCategory }) @IsEnum(MeatCutCategory) cutCategory!: MeatCutCategory;
  @ApiPropertyOptional({ enum: MeatFreshnessType }) @IsOptional() @IsEnum(MeatFreshnessType) freshnessType?: MeatFreshnessType;
  @ApiPropertyOptional({ enum: MeatSlaughterMethod }) @IsOptional() @IsEnum(MeatSlaughterMethod) slaughterMethod?: MeatSlaughterMethod;
  @ApiPropertyOptional({ enum: MeatQualityGrade }) @IsOptional() @IsEnum(MeatQualityGrade) qualityGrade?: MeatQualityGrade;
  @ApiPropertyOptional({ enum: MeatSaleUnit }) @IsOptional() @IsEnum(MeatSaleUnit) saleUnit?: MeatSaleUnit;

  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerPiece?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minOrderKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxOrderKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightVariancePct?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBoneless?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBoneIn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSkinless?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMarinated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() marinationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOrganic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFreeRange?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGrainFed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGrassFed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFrozen?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() halalCertNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() halalCertBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() halalCertExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHalalCertified?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() otherCerts?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() farmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slaughterhouseName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slaughterhouseLic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breed?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() storageTempMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() storageTempMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() shelfLifeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() packagingType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() animalAge?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() animalSex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cuttingStyle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cleaningLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() packagingWeight?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cookingSuggestions?: string;
  @ApiPropertyOptional() @IsOptional() nutritionInfo?: any;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOnSale?: boolean;
}