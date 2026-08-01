import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SportsAgeGroup, SportsCategoryType, SportsGenderTarget } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertSportsProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: SportsCategoryType }) @IsOptional() @IsEnum(SportsCategoryType) categoryType?: SportsCategoryType;
  @ApiPropertyOptional() @IsOptional() @IsString() sport?: string;
  @ApiPropertyOptional({ enum: SportsAgeGroup }) @IsOptional() @IsEnum(SportsAgeGroup) ageGroup?: SportsAgeGroup;
  @ApiPropertyOptional({ enum: SportsGenderTarget }) @IsOptional() @IsEnum(SportsGenderTarget) genderTarget?: SportsGenderTarget;

  // Cricket bat
  @ApiPropertyOptional() @IsOptional() @IsString() batWood?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() batWeightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batGrade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() handleType?: string;

  // Ball
  @ApiPropertyOptional() @IsOptional() @IsString() ballType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ballWeight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ballCircumference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ballMaterial?: string;

  // Apparel
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() material?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fit?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCustomization?: boolean;

  // Shoe
  @ApiPropertyOptional() @IsOptional() @IsString() shoeSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() studType?: string;

  // Gym
  @ApiPropertyOptional() @IsOptional() @IsString() weight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() maxUserWeight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() powerRating?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() motorType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() foldable?: boolean;

  // General
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() material2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfMake?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() certifications?: string[];

  // Team
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTeamOrderable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() minTeamOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bulkDiscountPct?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() customizationOptions?: string[];

  // Warranty
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;

  // Pricing
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() teamPrice?: number;

  // Flags
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isProfessional?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() careInstructions?: string;
}
