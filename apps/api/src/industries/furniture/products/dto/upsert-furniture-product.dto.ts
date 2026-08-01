import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureCategoryType, FurnitureConditionType, FurnitureMaterialType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertFurnitureProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ enum: FurnitureCategoryType }) @IsOptional() @IsEnum(FurnitureCategoryType) categoryType?: FurnitureCategoryType;
  @ApiPropertyOptional({ enum: FurnitureConditionType }) @IsOptional() @IsEnum(FurnitureConditionType) conditionType?: FurnitureConditionType;
  @ApiPropertyOptional({ enum: FurnitureMaterialType }) @IsOptional() @IsEnum(FurnitureMaterialType) primaryMaterial?: FurnitureMaterialType;
  @ApiPropertyOptional({ enum: FurnitureMaterialType, isArray: true }) @IsOptional() @IsArray() secondaryMaterials?: FurnitureMaterialType[];

  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() lengthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() widthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() depthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() seatHeightCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() seatingCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() storageCompartments?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() drawersCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() shelvesCount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() woodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() woodFinish?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() polishType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() upholsteryFabric?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cushionFilling?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cushionDensity?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresAssembly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() assemblyTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() assemblyPartsCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() assemblyToolsIncluded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() assemblyInstructionsUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() assemblyChargeExtra?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomizable?: boolean;
  @ApiPropertyOptional() @IsOptional() customizationOptions?: any;
  @ApiPropertyOptional() @IsOptional() @IsInt() customLeadTimeDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() careInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isWaterResistant?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTermiteProof?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresLargeVehicle?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresMultipleHelpers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() helpersNeeded?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryChargeBase?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() freeDeliveryRadius?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountedPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() emiStartingFrom?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustomMade?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEcoFriendly?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() showroomLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() showroomFloor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayZone?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() images3d?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() ar_model_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
