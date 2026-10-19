import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyDeliverySlot, DairyMilkQuality, DairyUnit } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSupplyDto {
  @ApiProperty() @IsString() farmerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplyDate?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiProperty() @IsNumber() @Min(0.001) @Max(20000) quantity!: number;
  @ApiPropertyOptional({ enum: DairyUnit }) @IsOptional() @IsEnum(DairyUnit) unit?: DairyUnit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(15) fatContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(15) snfContent?: number;
  @ApiPropertyOptional({ enum: DairyMilkQuality }) @IsOptional() @IsEnum(DairyMilkQuality) quality?: DairyMilkQuality;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100000) ratePerLiter?: number;
  /** Deduction (negative) or extra (positive) on this slip. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherAdjustment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  /** Milk product the litres go into (the shop's main milk when left out). */
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class SupplyPayDto {
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class SupplyCancelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
