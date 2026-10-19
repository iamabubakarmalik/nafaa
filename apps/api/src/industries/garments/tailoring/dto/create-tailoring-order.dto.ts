import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { GarmentCategoryType, GarmentOrderStatus, GarmentPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

/** Statuses an order may start in. */
const START_STATUSES = ['DRAFT', 'QUOTED', 'CONFIRMED'];

class OrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() @MaxLength(120) garmentName!: string;
  @ApiPropertyOptional({ enum: GarmentCategoryType }) @IsOptional() @IsEnum(GarmentCategoryType) categoryType?: GarmentCategoryType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(500) quantity?: number;
  /** Fabric taken from the shop's own stock; it leaves stock when the order is delivered. */
  @ApiPropertyOptional() @IsOptional() @IsString() fabricProductId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fabricVariantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10000) fabricMeters?: number;
  /** Fabric charge for the whole line (not per piece). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fabricCost?: number;
  /** Per piece. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) stitchingCost?: number;
  /** Per piece. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) embroideryCost?: number;
  /** Per piece. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) accessoryCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) designNotes?: string;
  @ApiPropertyOptional() @IsOptional() measurementSnapshot?: any;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) referenceImageUrls?: string[];
}

export class CreateTailoringOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() measurementProfileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) customerNotes?: string;
  @ApiPropertyOptional({ enum: GarmentPriority }) @IsOptional() @IsEnum(GarmentPriority) priority?: GarmentPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tailorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() promisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) designReferenceUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) designInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) internalNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  /** DRAFT, QUOTED or CONFIRMED; left out, the order is confirmed. */
  @ApiPropertyOptional() @IsOptional() @IsIn(START_STATUSES) status?: GarmentOrderStatus;
  /** Advance taken while booking; held on the customer's khata until delivery. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advanceAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAYMENT_METHODS) advanceMethod?: string;
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

/** Changes to an open order; money already received is never edited here. */
export class UpdateTailoringOrderDto extends PartialType(
  OmitType(CreateTailoringOrderDto, ['status', 'advanceAmount', 'advanceMethod', 'shopId'] as const),
) {}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: GarmentOrderStatus }) @IsEnum(GarmentOrderStatus) status!: GarmentOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) cancellationReason?: string;
  /** Money taken at delivery. Left out, the full remaining amount is taken as collected. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiProperty() @IsIn(PAYMENT_METHODS) paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
