import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyDeliverySlot, DairyDeliveryStatus, DairyUnit } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty() @IsString() dairyCustomerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiProperty() @IsNumber() scheduledQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveredQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() returnedQty?: number;
  @ApiPropertyOptional({ enum: DairyUnit }) @IsOptional() @IsEnum(DairyUnit) unit?: DairyUnit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerLiter?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BulkGenerateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
}

export class ConfirmDeliveryDto {
  @ApiProperty() @IsNumber() deliveredQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() returnedQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerSignature?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
