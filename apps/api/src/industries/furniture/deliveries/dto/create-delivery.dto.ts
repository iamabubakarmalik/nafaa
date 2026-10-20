import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureDeliveryStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateFurnitureDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customOrderId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(50) productIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(50) productNames?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) itemsCount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @MaxLength(100) customerName!: string;
  @ApiProperty() @IsString() @MaxLength(20) customerPhone!: string;
  @ApiProperty() @IsString() @MaxLength(300) deliveryAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) floorNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasLift?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(20) helpersCount?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unloadingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) floorCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) assemblyCharge?: number;

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
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) customerRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerFeedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) assemblyTimeSpent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() assemblyNotes?: string;
  /** Fitting done at the customer's place. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() assembled?: boolean;
}

export class AssignVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(20) helpersCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) scheduledSlot?: string;
}

export class BillChargesDto {
  /** Money taken now; the whole charges when left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}
