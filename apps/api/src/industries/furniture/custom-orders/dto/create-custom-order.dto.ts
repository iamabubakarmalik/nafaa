import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureCategoryType, FurnitureMaterialType, FurnitureOrderStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCnic?: string;

  @ApiProperty() @IsString() productType!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional({ enum: FurnitureCategoryType }) @IsOptional() @IsEnum(FurnitureCategoryType) categoryType?: FurnitureCategoryType;
  @ApiPropertyOptional({ enum: FurnitureMaterialType }) @IsOptional() @IsEnum(FurnitureMaterialType) material?: FurnitureMaterialType;

  @ApiPropertyOptional() @IsOptional() @IsString() woodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorRequested?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() polishRequested?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() upholsteryFabric?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() lengthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() widthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customDimensions?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() sketchUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() referenceImages?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() designNotes?: string;

  @ApiProperty() @IsNumber() quotedPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() depositAmount?: number;
  @ApiProperty() @IsInt() estimatedDays!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() carpenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workshopLocation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryArea?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresInstallation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() installationCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: FurnitureOrderStatus }) @IsEnum(FurnitureOrderStatus) status!: FurnitureOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() refundAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateProgressDto {
  @ApiProperty() @IsInt() progressPct!: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() progressPhotos?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() updateNote?: string;
}

export class RecordPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeposit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}
