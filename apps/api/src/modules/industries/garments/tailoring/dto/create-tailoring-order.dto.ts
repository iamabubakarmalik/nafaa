import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentCategoryType, GarmentOrderStatus, GarmentPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class OrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() garmentName!: string;
  @ApiPropertyOptional({ enum: GarmentCategoryType }) @IsOptional() @IsEnum(GarmentCategoryType) categoryType?: GarmentCategoryType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fabricProductId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fabricVariantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fabricMeters?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fabricCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() stitchingCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() embroideryCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() accessoryCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designNotes?: string;
  @ApiPropertyOptional() @IsOptional() measurementSnapshot?: any;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() referenceImageUrls?: string[];
}

export class CreateTailoringOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() measurementProfileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional({ enum: GarmentPriority }) @IsOptional() @IsEnum(GarmentPriority) priority?: GarmentPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tailorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() promisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() designReferenceUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() designInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiProperty({ type: [OrderItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: GarmentOrderStatus }) @IsEnum(GarmentOrderStatus) status!: GarmentOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
