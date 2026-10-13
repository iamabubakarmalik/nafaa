import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { OrderItemDto } from './create-order.dto';

/** Methods a restaurant bill can be paid with (BANK is the short form of BANK_TRANSFER). */
export const ORDER_PAYMENT_METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: RestaurantOrderStatus }) @IsEnum(RestaurantOrderStatus) status!: RestaurantOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiProperty({ enum: ORDER_PAYMENT_METHODS }) @IsIn(ORDER_PAYMENT_METHODS as unknown as string[]) paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paidBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  /** Close the bill now and put what is still unpaid on the customer's khata. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() closeOnCredit?: boolean;
  /** Khata customer, when the order was not opened for one. */
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  /** Owner PIN when shop rules ask for it (large discount, credit limit). */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

class SplitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() paidBy?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiProperty({ enum: ORDER_PAYMENT_METHODS }) @IsIn(ORDER_PAYMENT_METHODS as unknown as string[]) paymentMethod!: string;
}

export class SplitBillDto {
  @ApiProperty({ type: [SplitDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SplitDto)
  splits!: SplitDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

export class AddItemsDto {
  @ApiProperty({ type: [OrderItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
