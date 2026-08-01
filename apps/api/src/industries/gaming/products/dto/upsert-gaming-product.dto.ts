import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingCategoryType, GamingConditionType, GamingConsolePlatform } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertGamingProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ enum: GamingCategoryType }) @IsOptional() @IsEnum(GamingCategoryType) categoryType?: GamingCategoryType;
  @ApiPropertyOptional({ enum: GamingConsolePlatform }) @IsOptional() @IsEnum(GamingConsolePlatform) platform?: GamingConsolePlatform;
  @ApiPropertyOptional({ enum: GamingConditionType }) @IsOptional() @IsEnum(GamingConditionType) conditionType?: GamingConditionType;

  // Game specific
  @ApiPropertyOptional() @IsOptional() @IsString() publisher?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() developer?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() genre?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() ageRating?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() playerCount?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() onlineMultiplayer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresInternet?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() gameFileSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() releaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() language?: string[];

  // Console/hardware
  @ApiPropertyOptional() @IsOptional() @IsString() storageCapacity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() memoryRam?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() processor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() graphicsCard?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displaySpec?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() includedAccessories?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfControllers?: number;

  // PC parts
  @ApiPropertyOptional() @IsOptional() @IsString() gpuModel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cpuModel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ramSpec?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() formFactor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() power?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() socket?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chipset?: string;

  // Rental
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRentable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rentalPricePerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rentalPricePerDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rentalDeposit?: number;

  // Pricing
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountedPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() usedPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tradeInValue?: number;

  // Marketing
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewRelease?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPreOrder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() preOrderReleaseDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() coverImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trailerUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() screenshots?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
