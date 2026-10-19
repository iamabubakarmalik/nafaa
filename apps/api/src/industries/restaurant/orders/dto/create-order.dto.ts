import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderMode, SpiceLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

class OrderItemModifierDto {
  @ApiProperty() @IsString() modifierOptionId!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(50) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

export class OrderItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(0.01) @Max(10_000) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) unit?: string;
  /**
   * Price before add-ons. A price below the menu price is kept as a line
   * discount, so the shop's discount limit and PIN still apply at payment.
   */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) basePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) itemDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) specialInstructions?: string;
  @ApiPropertyOptional({ enum: SpiceLevel }) @IsOptional() @IsEnum(SpiceLevel) spiceLevel?: SpiceLevel;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) cookingNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10) courseNumber?: number;
  @ApiPropertyOptional({ type: [OrderItemModifierDto] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];
}

/** Bill charges an open order can carry. */
export class OrderChargesDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) serviceChargePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) taxPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) packagingFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tip?: number;
}

export class CreateOrderDto extends OrderChargesDto {
  @ApiProperty({ enum: RestaurantOrderMode }) @IsEnum(RestaurantOrderMode) mode!: RestaurantOrderMode;
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) numberOfGuests?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) specialRequests?: string;
  /** Staff member serving the order; the person taking it when left out. */
  @ApiPropertyOptional() @IsOptional() @IsString() waiterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) estimatedPrepTime?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryLat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryLng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) deliveryNotes?: string;

  /** Send the lines to the kitchen (one KOT per station) right away. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sendToKitchen?: boolean;

  @ApiProperty({ type: [OrderItemDto] }) @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
