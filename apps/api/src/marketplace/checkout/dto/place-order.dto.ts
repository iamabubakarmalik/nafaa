import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { MarketplacePaymentMethod, DeliveryType } from '@prisma/client';

/** A customer upload sent with the order, e.g. a prescription photo. */
export class OrderAttachmentDto {
  @IsString() @MaxLength(40)
  kind!: string;

  @IsString() @MaxLength(1000)
  url!: string;

  /** Only for this shop's order; empty = every shop in the cart. */
  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

export class PlaceOrderDto {
  /** Needed for delivery; pickup and dine-in may leave it out. */
  @IsOptional() @IsString()
  addressId?: string;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsEnum(MarketplacePaymentMethod)
  paymentMethod!: MarketplacePaymentMethod;

  @IsOptional() @IsString()
  savedCardId?: string;

  @IsOptional() @IsString() @MaxLength(40)
  couponCode?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  loyaltyPointsToUse?: number = 0;

  @IsOptional() @Type(() => Number) @Min(0)
  walletAmountToUse?: number = 0;

  @IsOptional() @IsString() @MaxLength(500)
  customerNotes?: string;

  @IsOptional() @IsString()
  deliverySlotStart?: string; // ISO datetime

  @IsOptional() @IsString()
  deliverySlotEnd?: string;

  /** Kept for older clients; tips are not taken yet. */
  @IsOptional() @Type(() => Number) @Min(0)
  tipAmount?: number = 0;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => OrderAttachmentDto)
  attachments?: OrderAttachmentDto[];

  /** Total the customer saw; a different server total returns 409 PRICE_CHANGED. */
  @IsOptional() @Type(() => Number) @IsNumber()
  expectedTotal?: number;
}
