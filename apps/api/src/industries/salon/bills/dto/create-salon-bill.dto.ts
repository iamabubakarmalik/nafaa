import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { SalePaymentPartDto } from '../../../../modules/sales/sales/dto/create-sale.dto';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

/** A product used up while doing a service (shampoo, colour, wax). Leaves stock at cost, not charged. */
export class UsedProductDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty({ example: 30 }) @IsNumber() @Min(0.001) quantity!: number;
}

export class BillServiceLineDto {
  @ApiProperty() @IsString() serviceId!: string;
  @ApiPropertyOptional({ description: 'Stylist who did the work; earns the commission' }) @IsOptional() @IsString() staffProfileId?: string;
  @ApiPropertyOptional({ description: 'Agreed price; left out, the list price (after membership discount)' })
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional({ description: 'Colour formula or work notes, kept in the customer history' })
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional({ description: 'Prepaid package that covers this service (line is not charged)' })
  @IsOptional() @IsString() packagePurchaseId?: string;
  @ApiPropertyOptional({ type: [UsedProductDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => UsedProductDto) used?: UsedProductDto[];
}

export class BillProductLineDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiProperty() @IsNumber() @Min(0.001) quantity!: number;
  @ApiPropertyOptional({ description: 'Price per unit; left out, the product price' }) @IsOptional() @IsNumber() @Min(0) price?: number;
}

/** One salon bill: services (with stylist and products used), retail products and a tip. */
export class CreateSalonBillDto {
  @ApiPropertyOptional({ description: 'Appointment being billed; left out, a walk-in record is made' })
  @IsOptional() @IsString() appointmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;

  @ApiProperty({ type: [BillServiceLineDto] })
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => BillServiceLineDto) services!: BillServiceLineDto[];
  @ApiPropertyOptional({ type: [BillProductLineDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(80) @ValidateNested({ each: true }) @Type(() => BillProductLineDto) products?: BillProductLineDto[];

  @ApiPropertyOptional({ description: 'Apply the customer\'s active membership discount to services' })
  @IsOptional() @IsBoolean() useMembership?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional({ description: 'Tip for the staff; passed on, so it is entered as its own cost' })
  @IsOptional() @IsNumber() @Min(0) tip?: number;
  @ApiPropertyOptional({ description: 'Gift voucher code that pays for part of the bill' })
  @IsOptional() @IsString() @MaxLength(20) voucherCode?: string;
  @ApiPropertyOptional({ description: 'How much of the voucher to use; left out, as much as the bill allows' })
  @IsOptional() @IsNumber() @Min(0.01) voucherAmount?: number;

  @ApiProperty({ enum: PaymentMethod }) @Transform(bankAlias) @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @ApiProperty() @IsNumber() @Min(0) paidAmount!: number;
  @ApiPropertyOptional({ type: [SalePaymentPartDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => SalePaymentPartDto) payments?: SalePaymentPartDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
