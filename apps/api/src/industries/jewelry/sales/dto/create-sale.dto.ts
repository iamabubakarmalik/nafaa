import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExchangeType, JewelryCategory, JewelryMetalType, JewelryOrderStatus, JewelryPurity } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { SalePaymentPartDto } from '../../../../modules/sales/sales/dto/create-sale.dto';

class JewelrySaleItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiProperty({ enum: JewelryCategory }) @IsEnum(JewelryCategory) category!: JewelryCategory;
  @ApiProperty({ enum: JewelryMetalType }) @IsEnum(JewelryMetalType) metalType!: JewelryMetalType;
  @ApiProperty({ enum: JewelryPurity }) @IsEnum(JewelryPurity) purity!: JewelryPurity;

  @ApiProperty() @IsNumber() @Min(0) ratePerGram!: number;
  @ApiProperty() @IsNumber() @Min(0) grossWeight!: number;
  @ApiProperty() @IsNumber() @Min(0) netWeight!: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) makingChargePerGram?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) makingChargeFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) makingChargePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) wastagePct?: number;
  /** Fixed wastage in grams, charged at the line's rate. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) wastageGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) polishCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) hallmarkCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) stoneValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number;
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

  @ApiProperty({ type: [JewelrySaleItemDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => JewelrySaleItemDto) items!: JewelrySaleItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) otherCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  /** Split payment: money parts (cash, card, wallet…). Old gold is added by the server, never sent here. */
  @ApiPropertyOptional({ type: [SalePaymentPartDto] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => SalePaymentPartDto) payments?: SalePaymentPartDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) exchangeMetalGrams?: number;
  @ApiPropertyOptional({ enum: JewelryPurity }) @IsOptional() @IsEnum(JewelryPurity) exchangeMetalPurity?: JewelryPurity;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) exchangeValue?: number;
  @ApiPropertyOptional({ enum: ExchangeType }) @IsOptional() @IsEnum(ExchangeType) exchangeType?: ExchangeType;
  /** Kaat on old gold (testing, melting loss) in percent; used when exchangeValue is left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(50) exchangeDeductionPct?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hallmarkVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCertificate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  /** Owner's PIN when the shop's counter rules ask for it (big discount, credit limit). */
  @ApiPropertyOptional() @IsOptional() @IsString() managerPin?: string;
}

export class UpdateSaleStatusDto {
  @ApiProperty({ enum: JewelryOrderStatus }) @IsEnum(JewelryOrderStatus) status!: JewelryOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerPin?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  /** Split payment: money parts (cash, card, wallet…). Old gold is added by the server, never sent here. */
  @ApiPropertyOptional({ type: [SalePaymentPartDto] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => SalePaymentPartDto) payments?: SalePaymentPartDto[];
}
