import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class CreateSaleItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: 'Variant ID if product has variants' })
  @IsOptional()
  @IsString()
  variantId?: string;

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
    description: 'Optional note for this line (e.g. "12ft × 12ft = 144 sqft")',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSaleDto {
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

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];
}
