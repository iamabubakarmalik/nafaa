import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { MarketplacePaymentMethod, SubscriptionFrequency } from '@prisma/client';

class SubItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class CreateSubscriptionDto {
  @IsString() shopId!: string;
  @IsOptional() @IsString() addressId?: string;
  @IsEnum(SubscriptionFrequency) frequency!: SubscriptionFrequency;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) customDays?: number;
  @IsEnum(MarketplacePaymentMethod) paymentMethod!: MarketplacePaymentMethod;
  @IsDateString() startDate!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SubItemDto) items!: SubItemDto[];
}
