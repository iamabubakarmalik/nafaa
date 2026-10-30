import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export const MONEY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

/* ───────────── links ───────────── */

export class FindSellerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class DirectoryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?: string;
}

export class LinkRequestDto {
  @ApiPropertyOptional({ description: 'Invite code or invite link' }) @IsOptional() @IsString() @MaxLength(200) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional({ description: 'Directory profile id' }) @IsOptional() @IsString() profileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class LinkTermsDto {
  @ApiPropertyOptional({ description: 'Match the buyer to this existing customer' }) @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceListId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(365) creditDays?: number | null;
  @ApiPropertyOptional({ description: 'Seller user named as booker on network orders' }) @IsOptional() @IsString() bookedById?: string;
}

export class RejectDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class BuyerSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoReceive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() receiveShopId?: string | null;
}

export class ProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() acceptRequests?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() listed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) area?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(40, { each: true }) categories?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(40, { each: true }) brands?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) about?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderValue?: number | null;
  @ApiPropertyOptional({ enum: ['ALL', 'LISTED'] }) @IsOptional() @IsIn(['ALL', 'LISTED']) catalogScope?: string;
}

/* ───────────── catalog and orders ───────────── */

export class CatalogQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class CartLineDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiPropertyOptional({ description: 'Pack (ProductUnit) id; empty = base unit' }) @IsOptional() @IsString() unitId?: string | null;
  @ApiProperty() @IsNumber() @IsPositive() qty!: number;
}

export class CartDto {
  @ApiProperty({ type: [CartLineDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => CartLineDto) items!: CartLineDto[];
}

export class PlaceOrderDto extends CartDto {
  @ApiProperty() @IsString() linkId!: string;
  @ApiPropertyOptional({ description: 'Idempotency key' }) @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() deliveryDate?: string;
}

export class ListTradeOrdersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class ProductMapLineDto {
  @ApiProperty() @IsString() sellerProductId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerVariantId?: string | null;
  @ApiPropertyOptional({ description: 'Own product; empty with create=true makes a new one' }) @IsOptional() @IsString() buyerProductId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() buyerVariantId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() create?: boolean;
}

export class ProductMapDto {
  @ApiProperty({ type: [ProductMapLineDto] }) @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ProductMapLineDto) maps!: ProductMapLineDto[];
}

export class ReceiveDto {
  @ApiPropertyOptional({ type: [ProductMapLineDto] }) @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ProductMapLineDto) maps?: ProductMapLineDto[];
}

/* ───────────── payments ───────────── */

export class RecordPaymentDto {
  @ApiProperty() @IsNumber() @IsPositive() amount!: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS }) @IsOptional() @IsIn(MONEY_METHODS as unknown as string[]) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paidAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tradeOrderId?: string;
}

export class DisputeDto {
  @ApiProperty() @IsString() @MaxLength(300) reason!: string;
}

export class PaymentsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkId?: string;
}
