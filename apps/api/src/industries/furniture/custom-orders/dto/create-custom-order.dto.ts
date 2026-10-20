import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureCategoryType, FurnitureMaterialType, FurnitureOrderStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCustomOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @MaxLength(100) customerName!: string;
  @ApiProperty() @IsString() @MaxLength(20) customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCnic?: string;

  @ApiProperty() @IsString() @MaxLength(120) productType!: string;
  @ApiProperty() @IsString() @MaxLength(2000) description!: string;
  @ApiPropertyOptional({ enum: FurnitureCategoryType }) @IsOptional() @IsEnum(FurnitureCategoryType) categoryType?: FurnitureCategoryType;
  @ApiPropertyOptional({ enum: FurnitureMaterialType }) @IsOptional() @IsEnum(FurnitureMaterialType) material?: FurnitureMaterialType;

  @ApiPropertyOptional() @IsOptional() @IsString() woodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorRequested?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() polishRequested?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() upholsteryFabric?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) lengthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) widthCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) heightCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customDimensions?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) sketchUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) referenceImages?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() designNotes?: string;

  @ApiProperty() @IsNumber() @Min(1) quotedPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @ApiProperty() @IsInt() @Min(1) @Max(365) estimatedDays!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() carpenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workshopLocation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryArea?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresInstallation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) installationCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(240) warrantyMonths?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: FurnitureOrderStatus }) @IsEnum(FurnitureOrderStatus) status!: FurnitureOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cancellationReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) refundAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateProgressDto {
  @ApiProperty() @IsInt() @Min(0) @Max(100) progressPct!: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(10) progressPhotos?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() updateNote?: string;
}

export class RecordPaymentDto {
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeposit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}

export class AssignCarpenterDto {
  @ApiProperty() @IsString() carpenterId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) workshopLocation?: string;
}

export class ApproveOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) finalPrice?: number;
}
