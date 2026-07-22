import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min,
} from 'class-validator';
import { PromoType, PromoDiscountType, PromoScope, PromoStatus } from '@prisma/client';

export class CreatePromotionDto {
  @IsEnum(PromoType) type!: PromoType;
  @IsOptional() @IsEnum(PromoStatus) status?: PromoStatus;
  @IsEnum(PromoScope) scope!: PromoScope;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() bannerUrl?: string;

  @IsEnum(PromoDiscountType) discountType!: PromoDiscountType;
  @Type(() => Number) @Min(0) discountValue!: number;
  @IsOptional() @Type(() => Number) @Min(0) maxDiscount?: number;
  @IsOptional() @Type(() => Number) @Min(0) minOrderAmount?: number;

  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsBoolean() requiresLogin?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perCustomerLimit?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) targetProductIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetCategoryIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) excludedProductIds?: string[];

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) buyQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) getQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) getDiscountPercent?: number;

  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsBoolean() isFlashSale?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() displayOrder?: number;

  @IsOptional() @IsString() shopId?: string;
}
