import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceCategoryType, ApplianceEnergyRating } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertApplianceProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: ApplianceCategoryType }) @IsOptional() @IsEnum(ApplianceCategoryType) categoryType?: ApplianceCategoryType;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() modelYear?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() capacity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() powerConsumption?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voltage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensions?: string;
  @ApiPropertyOptional({ enum: ApplianceEnergyRating }) @IsOptional() @IsEnum(ApplianceEnergyRating) energyRating?: ApplianceEnergyRating;
  @ApiPropertyOptional() @IsOptional() @IsString() bee_rating?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnergyStar?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInverter?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() acTonnage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() acType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coolingCapacity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() heatingCapacity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() refrigerantType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eer?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() fridgeCapacityLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() refrigeratorType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() doorCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() compressorType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() washingCapacityKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() washingType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() rpm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfPrograms?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() screenSizeInch?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() displayType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() refreshRate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() smartOS?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() hdmiPorts?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() usbPorts?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() compressorWarrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() motorWarrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresInstallation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() installationCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() installationCovered?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() installationTimeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresPlumbing?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresGasConnection?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresElectrician?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresLargeVehicle?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() freeDelivery?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryChargePerKm?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() features?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() smartFeatures?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() safetyFeatures?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() boxContents?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() emiStartingFrom?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cashDiscount?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
