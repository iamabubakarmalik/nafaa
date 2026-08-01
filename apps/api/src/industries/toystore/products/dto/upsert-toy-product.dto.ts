import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToyAgeGroup, ToyCategoryType, ToyGenderTarget, ToySafetyCertification } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertToyProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ enum: ToyCategoryType }) @IsOptional() @IsEnum(ToyCategoryType) categoryType?: ToyCategoryType;
  @ApiPropertyOptional({ enum: ToyAgeGroup }) @IsOptional() @IsEnum(ToyAgeGroup) ageGroup?: ToyAgeGroup;
  @ApiPropertyOptional({ enum: ToyAgeGroup, isArray: true }) @IsOptional() @IsArray() ageGroups?: ToyAgeGroup[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() ageMinYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ageMaxYears?: number;
  @ApiPropertyOptional({ enum: ToyGenderTarget }) @IsOptional() @IsEnum(ToyGenderTarget) genderTarget?: ToyGenderTarget;

  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() characterFranchise?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() themeCategory?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEducational?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() learningAreas?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() developmentSkills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() cognitiveCategory?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() material?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() materialsUsed?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensions?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfPieces?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresBatteries?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() batteriesIncluded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() batteryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() batteryQuantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRemoteControlled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() rcRange?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rcChargingTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rcRunTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rcFrequency?: string;

  @ApiPropertyOptional({ enum: ToySafetyCertification, isArray: true }) @IsOptional() @IsArray() safetyCertifications?: ToySafetyCertification[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() safetyWarnings?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chokingHazard?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smallPartsWarning?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNonToxic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBpaFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPhthalateFree?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() playerCount?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() playDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMultiplayer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSound?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasLights?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMotor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCollectible?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() languagesSupported?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMontessoriApproved?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isWaldorfApproved?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountedPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTrending?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBirthdayGift?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEidGift?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isChristmasGift?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasReplacementParts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() giftWrapAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() giftMessageAvailable?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructionUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
