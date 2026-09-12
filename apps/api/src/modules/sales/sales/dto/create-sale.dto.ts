import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class CreateSaleItemDto {
  @ApiPropertyOptional({
    description: 'Regular product ID. Omit this ONLY when usedPhoneId is set.',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Variant ID if product has variants' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'For mobile industry: specific new-phone IMEI being sold',
  })
  @IsOptional()
  @IsString()
  imeiId?: string;

  @ApiPropertyOptional({
    description: 'For mobile industry: specific used/trade-in phone being sold. Do NOT set productId when this is set.',
  })
  @IsOptional()
  @IsString()
  usedPhoneId?: string;

  @ApiPropertyOptional({
    description: 'For electronics: specific serial/IMEI-tracked unit being sold (laptop, TV, camera...).',
  })
  @IsOptional()
  @IsString()
  serialId?: string;

  @ApiProperty({ example: 1.5, description: 'Decimal quantity (e.g. 12.5 sqft)' })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Manual price override per unit. If not set, uses product/variant price.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({
    description: 'Item-level discount amount (PKR)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lineDiscount?: number;

  @ApiPropertyOptional({
    description: 'Use wholesale price for this line',
  })
  @IsOptional()
  @IsBoolean()
  useWholesale?: boolean;

  @ApiPropertyOptional({
    description: 'Customer-visible note (prints on receipt & WhatsApp). e.g. "1 piece damage tha"',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Team-only internal note (never shown to customer). e.g. "customer regular hai"',
  })
  @IsOptional()
  @IsString()
  internalNote?: string;
}

class ServiceChargeItemDto {
  @ApiProperty({
    example: 'GLUE',
    description: 'Type identifier: GLUE, INSTALLATION, CUTTING, DELIVERY, UNDERLAY, CUSTOM, OTHER',
  })
  @IsString()
  type!: string;

  @ApiProperty({ example: 'Adhesive / Glue', description: 'Display label' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 2000, description: 'Charge amount in PKR' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({
    example: 200,
    description:
      'Is service par dukan ka apna kharcha (jaise rider ko diya gaya paisa). ' +
      'Ye costOfGoods me jurta hai taake profit har report me sahi aaye — ' +
      'warna delivery charge poora munafa gina jata tha.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Optional note for this charge' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSaleDto {
  /**
   * Branch the sale was rung up at. Optional because the active shop already
   * travels on the `x-shop-id` header — the body only needs it when it differs,
   * as with an offline sale replaying after the user switched branches.
   */
  @ApiPropertyOptional({ description: 'Shop ID where sale happened' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @Transform(({ value }) => (value === 'BANK' ? 'BANK_TRANSFER' : value))
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  paidAmount!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  loyaltyPointsToUse?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowCredit?: boolean;

  @ApiPropertyOptional({
    description: 'Optional sale-level note (e.g. delivery address)',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    type: [ServiceChargeItemDto],
    description: 'Extra service charges (glue, installation, cutting, delivery, etc.)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceChargeItemDto)
  serviceCharges?: ServiceChargeItemDto[];

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];
}
