import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExchangeType, JewelryCategory, JewelryMetalType, JewelryOrderStatus, JewelryPurity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class JewelrySaleItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiProperty({ enum: JewelryCategory }) @IsEnum(JewelryCategory) category!: JewelryCategory;
  @ApiProperty({ enum: JewelryMetalType }) @IsEnum(JewelryMetalType) metalType!: JewelryMetalType;
  @ApiProperty({ enum: JewelryPurity }) @IsEnum(JewelryPurity) purity!: JewelryPurity;

  @ApiProperty() @IsNumber() ratePerGram!: number;
  @ApiProperty() @IsNumber() grossWeight!: number;
  @ApiProperty() @IsNumber() netWeight!: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() makingChargePerGram?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() makingChargeFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() makingChargePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wastagePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() polishCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hallmarkCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() stoneValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() hallmarkNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() certificateNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemPhotoUrl?: string;
}

export class CreateJewelrySaleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;

  @ApiProperty({ type: [JewelrySaleItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => JewelrySaleItemDto) items!: JewelrySaleItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() gstAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() exchangeMetalGrams?: number;
  @ApiPropertyOptional({ enum: JewelryPurity }) @IsOptional() @IsEnum(JewelryPurity) exchangeMetalPurity?: JewelryPurity;
  @ApiPropertyOptional() @IsOptional() @IsNumber() exchangeValue?: number;
  @ApiPropertyOptional({ enum: ExchangeType }) @IsOptional() @IsEnum(ExchangeType) exchangeType?: ExchangeType;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hallmarkVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCertificate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateSaleStatusDto {
  @ApiProperty({ enum: JewelryOrderStatus }) @IsEnum(JewelryOrderStatus) status!: JewelryOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}
