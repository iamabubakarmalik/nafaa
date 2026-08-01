import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FloristDeliveryTimeSlot, FloristOrderStatus, FloristOrderType } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @ApiProperty() @IsArray() items!: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    customization?: string;
  }>;

  @ApiPropertyOptional() @IsOptional() @IsNumber() discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() wrappingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advancePaid?: number;
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

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: FloristOrderStatus }) @IsEnum(FloristOrderStatus) status!: FloristOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class DeliveryConfirmDto {
  @ApiPropertyOptional() @IsOptional() @IsString() deliveredBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveredToName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryPhotoUrl?: string;
}
