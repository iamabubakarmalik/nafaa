import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareDeliveryStatus, HardwareDeliveryVehicleType, HardwareUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class DeliveryItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() itemName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiProperty() @IsNumber() orderedQty!: number;
  @ApiPropertyOptional({ enum: HardwareUnit }) @IsOptional() @IsEnum(HardwareUnit) unit?: HardwareUnit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiProperty() @IsString() deliveryAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() siteContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() siteContactPhone?: string;
  @ApiPropertyOptional({ enum: HardwareDeliveryVehicleType }) @IsOptional() @IsEnum(HardwareDeliveryVehicleType) vehicleType?: HardwareDeliveryVehicleType;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() helperName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() distanceKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() loadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unloadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() laborCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tollCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() loadingInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiProperty({ type: [DeliveryItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => DeliveryItemDto) items!: DeliveryItemDto[];
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: HardwareDeliveryStatus }) @IsEnum(HardwareDeliveryStatus) status!: HardwareDeliveryStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueReported?: string;
}

export class ConfirmDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverSignatureUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() deliveryProofUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() gateEntryNumber?: string;
  @ApiPropertyOptional({ type: [Object] }) @IsOptional() @IsArray() deliveredItems?: Array<{ itemId: string; deliveredQty: number; damagedQty?: number; returnedQty?: number }>;
}
