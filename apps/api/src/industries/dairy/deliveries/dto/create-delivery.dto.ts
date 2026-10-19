import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyDeliverySlot, DairyUnit } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty() @IsString() dairyCustomerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiProperty() @IsNumber() @Min(0.001) @Max(1000) scheduledQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1000) deliveredQty?: number;
  @ApiPropertyOptional({ enum: DairyUnit }) @IsOptional() @IsEnum(DairyUnit) unit?: DairyUnit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100000) ratePerLiter?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  /** Mark it delivered right away (an extra delivery already handed over). */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() deliverNow?: boolean;
}

export class BulkGenerateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
}

export class ConfirmDeliveryDto {
  @ApiProperty() @IsNumber() @Min(0.001) @Max(1000) deliveredQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) returnedQty?: number;
  /** Money taken at the door; the rest goes on the khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() containerReturned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customerSignature?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  /** Needed when a delivered quantity is changed and the shop asks a PIN for voids. */
  @ApiPropertyOptional() @IsOptional() @IsString() managerPin?: string;
}

export class ConfirmAllDto {
  @ApiPropertyOptional() @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) ids?: string[];
}

export class UndoDeliveryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerPin?: string;
}
