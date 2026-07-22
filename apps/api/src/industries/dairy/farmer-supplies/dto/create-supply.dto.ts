import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyDeliverySlot, DairyMilkQuality, DairyUnit } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSupplyDto {
  @ApiProperty() @IsString() farmerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplyDate?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiPropertyOptional({ enum: DairyUnit }) @IsOptional() @IsEnum(DairyUnit) unit?: DairyUnit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fatContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() snfContent?: number;
  @ApiPropertyOptional({ enum: DairyMilkQuality }) @IsOptional() @IsEnum(DairyMilkQuality) quality?: DairyMilkQuality;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerLiter?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherAdjustment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
