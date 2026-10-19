import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { OrderChargesDto, OrderItemDto } from './create-order.dto';

/** Methods a restaurant bill can be paid with (BANK is the short form of BANK_TRANSFER). */
export const ORDER_PAYMENT_METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: RestaurantOrderStatus }) @IsEnum(RestaurantOrderStatus) status!: RestaurantOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cancellationReason?: string;
  /** Approval when dishes already went to the kitchen. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiProperty({ enum: ORDER_PAYMENT_METHODS }) @IsIn(ORDER_PAYMENT_METHODS as unknown as string[]) paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) paidBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;

  /** Close the bill now and put what is still unpaid on the customer's khata. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() closeOnCredit?: boolean;
  /** Khata customer, when the order was not opened for one. */
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  /** Owner PIN when shop rules ask for it (large discount, credit limit). */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

class SplitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) paidBy?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiProperty({ enum: ORDER_PAYMENT_METHODS }) @IsIn(ORDER_PAYMENT_METHODS as unknown as string[]) paymentMethod!: string;
}

export class SplitBillDto {
  @ApiProperty({ type: [SplitDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SplitDto)
  splits!: SplitDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

class CheckoutPartDto {
  @ApiProperty({ enum: ORDER_PAYMENT_METHODS }) @IsIn(ORDER_PAYMENT_METHODS as unknown as string[]) method!: string;
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) paidBy?: string;
}

/** One payment step: what was handed over by each method; the order becomes a bill. */
export class CheckoutDto {
  @ApiProperty({ type: [CheckoutPartDto] }) @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => CheckoutPartDto)
  payments!: CheckoutPartDto[];
  /** Whatever is not paid goes on the customer's khata. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() closeOnCredit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

export class AddItemsDto {
  @ApiProperty({ type: [OrderItemDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[];
  /** Send only these new lines to the kitchen. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sendToKitchen?: boolean;
}

export class VoidItemDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) reason!: string;
  /** Part of the line; the whole line when left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

/** Open-order details that can change while guests sit (charges, guests, waiter, customer, delivery). */
export class UpdateOrderDto extends OrderChargesDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) numberOfGuests?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() waiterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) specialRequests?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) deliveryNotes?: string;
}

export class MoveTableDto {
  @ApiProperty() @IsString() tableId!: string;
}

export class MergeOrderDto {
  /** The order whose dishes and payments move into this one. */
  @ApiProperty() @IsString() fromOrderId!: string;
}

class SplitLineDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) quantity?: number;
}

/** Lines that move to a new bill of their own (guests paying for what they ate). */
export class SplitItemsDto {
  @ApiProperty({ type: [SplitLineDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => SplitLineDto)
  lines!: SplitLineDto[];
}

export class OrderPageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  /** open | completed | cancelled | unpaid | all, or one exact status. */
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waiterId?: string;
  /** Business days, YYYY-MM-DD in the shop's clock. */
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['new', 'old', 'high', 'low']) sort?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
