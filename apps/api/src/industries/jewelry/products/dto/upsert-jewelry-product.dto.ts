import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GemstoneType, JewelryCategory, JewelryMetalType, JewelryPurity, JewelryStyle } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertJewelryProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designNumber?: string;

  @ApiProperty({ enum: JewelryCategory }) @IsEnum(JewelryCategory) category!: JewelryCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategory?: string;
  @ApiPropertyOptional({ enum: JewelryStyle }) @IsOptional() @IsEnum(JewelryStyle) style?: JewelryStyle;

  @ApiProperty({ enum: JewelryMetalType }) @IsEnum(JewelryMetalType) metalType!: JewelryMetalType;
  @ApiProperty({ enum: JewelryPurity }) @IsEnum(JewelryPurity) purity!: JewelryPurity;
  @ApiPropertyOptional() @IsOptional() @IsString() purityHallmark?: string;

  @ApiProperty() @IsNumber() grossWeight!: number;
  @ApiProperty() @IsNumber() netWeight!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() stoneWeight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() waxWeight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherWeight?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() thickness?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() makingChargePerGram?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() makingChargeFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() makingChargePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wastagePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wastageGrams?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() designerCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() polishCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hallmarkCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherCharges?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasStones?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasDiamond?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasGemstone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPearl?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() stoneCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() stoneCaret?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() stoneQuality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stoneColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stoneClarity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stoneCut?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() hallmarkNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hallmarkAuthority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hallmarkDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bisNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jewellerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hallmarkPhotoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() designerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() karigarName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workshopName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomOrder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBespoke?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAntique?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCertified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() certificateNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() certificateAuthority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() certificatePhotoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBuyBackEligible?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() buyBackPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isReturnable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() returnDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() currentValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() insuredValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() insurancePolicyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceExpiry?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() careInstructions?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBridalCollection?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFestivalSpecial?: boolean;

  @ApiPropertyOptional({ type: [Object] }) @IsOptional() @IsArray() gemstones?: {
    type: GemstoneType;
    count?: number;
    caret: number;
    quality?: string;
    color?: string;
    clarity?: string;
    cut?: string;
    shape?: string;
    origin?: string;
    isCertified?: boolean;
    certificateNumber?: string;
    ratePerCaret?: number;
    totalValue?: number;
  }[];
}
