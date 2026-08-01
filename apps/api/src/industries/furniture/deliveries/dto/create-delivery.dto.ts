import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureDeliveryStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFurnitureDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customOrderId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() productIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() productNames?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() itemsCount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiProperty() @IsString() deliveryAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() floorNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasLift?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() helpersCount?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() loadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unloadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() floorCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() assemblyCharge?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresAssembly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() assemblyIncluded?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: FurnitureDeliveryStatus }) @IsEnum(FurnitureDeliveryStatus) status!: FurnitureDeliveryStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ConfirmDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() customerRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerFeedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() assemblyTimeSpent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() assemblyNotes?: string;
}
