import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareCategoryType, HardwareUnit } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertHardwareProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: HardwareCategoryType }) @IsOptional() @IsEnum(HardwareCategoryType) categoryType?: HardwareCategoryType;

  @ApiPropertyOptional({ enum: HardwareUnit }) @IsOptional() @IsEnum(HardwareUnit) unit?: HardwareUnit;
  @ApiPropertyOptional({ enum: HardwareUnit }) @IsOptional() @IsEnum(HardwareUnit) bulkUnit?: HardwareUnit;
  @ApiPropertyOptional() @IsOptional() @IsInt() bulkQuantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightPerUnit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() volumePerUnit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() widthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() diameterMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() thicknessMm?: number;

  // Steel
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() diameter?: string;

  // Cement
  @ApiPropertyOptional() @IsOptional() @IsString() gradeStrength?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bagWeight?: number;

  // Tile
  @ApiPropertyOptional() @IsOptional() @IsString() tileSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() finishType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() piecesPerBox?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sqftPerBox?: number;

  // Paint
  @ApiPropertyOptional() @IsOptional() @IsString() colorCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() finishSheen?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() coverage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() litersPerCan?: number;

  // Pricing tiers
  @ApiPropertyOptional() @IsOptional() @IsNumber() minBulkQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bulkPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cashPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditPrice?: number;

  // Delivery
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresTruck?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresCrane?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeliverInCity?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeliverIntercity?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryChargePerKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minDeliveryCharge?: number;

  // Storage
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresCoveredStorage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresDryStorage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() shelfLifeMonths?: number;

  // Certifications
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasIsoCertification?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPsqcaCertification?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() certificationNumbers?: string[];

  // Origin
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturingLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() batchTraceable?: boolean;

  // Flags
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFastMoving?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
