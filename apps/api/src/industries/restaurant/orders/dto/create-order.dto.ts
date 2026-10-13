import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderMode, SpiceLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class OrderItemModifierDto {
  @ApiProperty() @IsString() modifierOptionId!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class OrderItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) basePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) itemDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() specialInstructions?: string;
  @ApiPropertyOptional({ enum: SpiceLevel }) @IsOptional() @IsEnum(SpiceLevel) spiceLevel?: SpiceLevel;
  @ApiPropertyOptional() @IsOptional() @IsString() cookingNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() courseNumber?: number;
  @ApiPropertyOptional({ type: [OrderItemModifierDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];
}

export class CreateOrderDto {
  @ApiProperty({ enum: RestaurantOrderMode }) @IsEnum(RestaurantOrderMode) mode!: RestaurantOrderMode;
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfGuests?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() specialRequests?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waiterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) serviceChargePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) packagingFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tip?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryLat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryLng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryNotes?: string;

  @ApiProperty({ type: [OrderItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
