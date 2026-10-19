import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const PAY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];
export const DELIVERY_STATES = ['PENDING', 'SCHEDULED', 'DISPATCHED', 'ARRIVED', 'DELIVERED', 'FAILED', 'CANCELLED'] as const;

export class CreateApplianceDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() serialTrackingIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiProperty() @IsString() deliveryAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) floorNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasLift?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) helperCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unloadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) floorCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresInstallation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateApplianceDeliveryStatusDto {
  @ApiProperty({ enum: DELIVERY_STATES }) @IsIn([...DELIVERY_STATES]) status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ConfirmApplianceDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photoUrls?: string[];
  /** Money the driver collected for the delivery charges at the door. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAY_METHODS) paymentMethod?: string;
}

export class AssignApplianceVehicleDto {
  @ApiProperty() @IsString() vehicleNumber!: string;
  @ApiProperty() @IsString() driverName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) helperCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;
}

export class ApplianceDeliveryPaymentDto {
  @ApiProperty({ example: 1500 }) @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAY_METHODS) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
