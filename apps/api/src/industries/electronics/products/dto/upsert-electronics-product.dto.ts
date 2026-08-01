import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectronicsCategoryType, ElectronicsConditionType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertElectronicsProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: ElectronicsCategoryType }) @IsOptional() @IsEnum(ElectronicsCategoryType) categoryType?: ElectronicsCategoryType;
  @ApiPropertyOptional({ enum: ElectronicsConditionType }) @IsOptional() @IsEnum(ElectronicsConditionType) conditionType?: ElectronicsConditionType;

  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() connectivity?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() powerRating?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batteryCapacity?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() batteryLifeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() chargingTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() operatingRange?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waterResistance?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() screenSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() refreshRate?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() compatibleWith?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() compatibleOS?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() widthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightMm?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasInternationalWarranty?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasImei?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() boxContents?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasManual?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasWarrantyCard?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() onlinePrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTrending?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
