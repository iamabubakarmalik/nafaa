import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsNumber,
  IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BookingItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Reserve a specific IMEI' })
  @IsOptional()
  @IsString()
  imeiId?: string;

  @ApiPropertyOptional({ description: 'Reserve a carpet roll (partial cut)' })
  @IsOptional()
  @IsString()
  rollId?: string;

  @ApiPropertyOptional({ description: 'Reserve a specific carpet cut piece' })
  @IsOptional()
  @IsString()
  cutPieceId?: string;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lineDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  useWholesale?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() cutWidthFt?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cutLengthFt?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cutLengthInch?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cutSqft?: number;

  @ApiPropertyOptional({ description: 'Customer-visible note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Team-only note' })
  @IsOptional()
  @IsString()
  internalNote?: string;
}

class ServiceChargeItemDto {
  @IsString() type!: string;
  @IsString() label!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() note?: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  shopId!: string;

  @ApiProperty({ description: 'Customer is required for advance/booking' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ example: '2026-07-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  expectedPickupAt?: string;

  @ApiPropertyOptional({ description: 'Auto-cancel deadline' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: 'CASH' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Initial advance paid at time of booking' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialAdvance?: number;

  @ApiPropertyOptional({ type: [ServiceChargeItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceChargeItemDto)
  serviceCharges?: ServiceChargeItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;

  @ApiProperty({ type: [BookingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items!: BookingItemDto[];
}
