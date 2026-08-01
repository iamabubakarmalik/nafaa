import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetCategoryType, PetLifeStage, PetSpeciesType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertPetProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ enum: PetCategoryType }) @IsOptional() @IsEnum(PetCategoryType) categoryType?: PetCategoryType;
  @ApiPropertyOptional({ enum: PetSpeciesType }) @IsOptional() @IsEnum(PetSpeciesType) species?: PetSpeciesType;
  @ApiPropertyOptional({ enum: PetLifeStage }) @IsOptional() @IsEnum(PetLifeStage) lifeStage?: PetLifeStage;

  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breedSpecific?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() flavor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proteinSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() proteinPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fatPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fiberPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() moisturePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ingredients?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGrainFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOrganic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHypoallergenic?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() benefits?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() suitedForBreedSizes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() suitedForAges?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() material?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() tankCapacityLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() tankShape?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() filterCapacity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() wattage?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrescriptionOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dosageForm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dosageStrength?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() administrationRoute?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountedPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOnSale?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
