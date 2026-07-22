import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MarketplacePaymentMethod, DeliveryType } from '@prisma/client';

export class PreviewCheckoutDto {
  @IsOptional() @IsString()
  addressId?: string;

  @IsOptional() @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @IsOptional() @IsString()
  couponCode?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  loyaltyPointsToUse?: number;

  @IsOptional() @Type(() => Number) @Min(0)
  walletAmountToUse?: number;

  @IsOptional() @IsEnum(MarketplacePaymentMethod)
  paymentMethod?: MarketplacePaymentMethod;
}
