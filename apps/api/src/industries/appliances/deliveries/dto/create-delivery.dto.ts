import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @ApiPropertyOptional() @IsOptional() @IsInt() floorNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasLift?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() helperCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() loadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unloadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() floorCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresInstallation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateApplianceDeliveryStatusDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ConfirmApplianceDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedByCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photoUrls?: string[];
}
