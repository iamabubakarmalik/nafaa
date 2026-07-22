import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MarketplacePaymentMethod, DeliveryType } from '@prisma/client';

export class PlaceOrderDto {
  @IsString()
  addressId!: string;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsEnum(MarketplacePaymentMethod)
  paymentMethod!: MarketplacePaymentMethod;

  @IsOptional() @IsString()
  savedCardId?: string;

  @IsOptional() @IsString()
  couponCode?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  loyaltyPointsToUse?: number = 0;

  @IsOptional() @Type(() => Number) @Min(0)
  walletAmountToUse?: number = 0;

  @IsOptional() @IsString()
  customerNotes?: string;

  @IsOptional() @IsString()
  deliverySlotStart?: string; // ISO datetime

  @IsOptional() @IsString()
  deliverySlotEnd?: string;

  @IsOptional() @Type(() => Number) @Min(0)
  tipAmount?: number = 0;
}
