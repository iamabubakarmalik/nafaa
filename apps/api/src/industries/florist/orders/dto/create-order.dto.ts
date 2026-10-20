import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FloristDeliveryTimeSlot, FloristOrderStatus, FloristOrderType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateFloristOrderDto {
  @ApiPropertyOptional({ enum: FloristOrderType }) @IsOptional() @IsEnum(FloristOrderType) orderType?: FloristOrderType;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() senderName?: string;

  // Recipient
  @ApiPropertyOptional() @IsOptional() @IsString() recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recipientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;

  // Message
  @ApiPropertyOptional() @IsOptional() @IsString() messageCard?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAnonymous?: boolean;

  // Items
  @ApiProperty() @IsArray() @Type(() => Object) items!: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    customization?: string;
  }>;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) wrappingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advancePaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;

  // Delivery
  @ApiPropertyOptional({ enum: FloristDeliveryTimeSlot }) @IsOptional() @IsEnum(FloristDeliveryTimeSlot) deliveryTimeSlot?: FloristDeliveryTimeSlot;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDeliveryTime?: string;

  // Event
  @ApiPropertyOptional() @IsOptional() @IsString() eventDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eventName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eventVenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() recurringFrequency?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateFloristOrderDto extends PartialType(CreateFloristOrderDto) {}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: FloristOrderStatus }) @IsEnum(FloristOrderStatus) status!: FloristOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class DeliveryConfirmDto {
  @ApiPropertyOptional() @IsOptional() @IsString() deliveredBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveredToName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryPhotoUrl?: string;
}

/** Delivery details for a bill rung up at the counter; money comes from the bill. */
export class OrderFromSaleDto {
  @ApiProperty() @IsUUID() saleId!: string;
  @ApiPropertyOptional({ enum: FloristOrderType }) @IsOptional() @IsEnum(FloristOrderType) orderType?: FloristOrderType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) senderName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) recipientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) messageCard?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAnonymous?: boolean;
  @ApiPropertyOptional({ enum: FloristDeliveryTimeSlot }) @IsOptional() @IsEnum(FloristDeliveryTimeSlot) deliveryTimeSlot?: FloristDeliveryTimeSlot;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) scheduledDeliveryTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) eventName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) eventVenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) specialInstructions?: string;
}
