import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber,
  IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';
import { PRICE_TIERS } from '../../../../common/helpers/price-tier.helper';

/** BANK is the short form some screens send. */
const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

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

  @ApiPropertyOptional({
    description: 'Batch to sell from first. Without it the earliest-expiry batch in the branch is used.',
  })
  @IsOptional()
  @IsString()
  batchId?: string;

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
    enum: PRICE_TIERS,
    description: 'Price tier of this line: RETAIL, WHOLESALE or CREDIT. Without priceOverride the tier price is used (empty tier prices fall back to retail). Takes the place of useWholesale.',
  })
  @IsOptional()
  @IsIn(PRICE_TIERS)
  priceTier?: string;

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

  /**
   * Pack the line was sold in, for the bill and history only. `quantity` and
   * `priceOverride` stay per base unit; these say it was e.g. 2 cartons of 24.
   */
  @ApiPropertyOptional({ description: 'Pack name, e.g. "Carton". quantity stays in base units.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unitName?: string;

  @ApiPropertyOptional({ description: 'Packs sold (quantity / conversionRate).' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitQty?: number;

  @ApiPropertyOptional({ description: 'Base units in one pack.' })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  conversionRate?: number;

  @ApiPropertyOptional({ description: 'Trade scheme that priced this line or made it free.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  schemeId?: string;
}

/** One part of a split payment: what the customer handed over by this method. */
export class SalePaymentPartDto {
  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @Transform(bankAlias)
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 2000, description: 'Cash may be more than the bill; the change comes off the cash.' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Card slip, wallet transaction id, or the used phone code of a trade-in' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @ApiPropertyOptional({ description: 'What was taken in on a trade-in' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
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
      'warna delivery charge poora profit gina jata tha.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: 'Bahar ka rider ye charge khud customer se leta hai — bill par likha, lekin sale / drawer / profit me shamil nahi',
  })
  @IsOptional()
  @IsBoolean()
  passThrough?: boolean;

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

  /**
   * Bikri kis ke naam jaye.
   *
   * Counter par aksar ek hi cashier bill banata hai, magar becha
   * kisi aur ne hota hai — commission usi ko milni chahiye. POS par
   * wo naam chun leta hai aur wohi yahan aata hai. Khali ho to bill
   * banane wala hi becha hua mana jata hai.
   */
  @ApiPropertyOptional({ description: 'Salesperson — khali to bill banane wala' })
  @IsOptional()
  @IsString()
  soldById?: string;

  @ApiProperty({ enum: MONEY_METHODS, example: 'CASH' })
  @Transform(bankAlias)
  @IsIn(MONEY_METHODS)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 5000, description: 'Ignored when `payments` is sent; the parts add up to it.' })
  @IsNumber()
  @Min(0)
  paidAmount!: number;

  /**
   * Split payment: one part per method (cash + card …). Left out, the bill is
   * paid by `paymentMethod` alone, as before.
   */
  @ApiPropertyOptional({ type: [SalePaymentPartDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentPartDto)
  payments?: SalePaymentPartDto[];

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

  /** Owner's PIN, when the shop's settings ask for it (discount, credit limit). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12)
  managerPin?: string;

  @ApiPropertyOptional({
    description: 'Optional sale-level note (e.g. delivery address)',
  })
  @IsOptional()
  @IsString()
  note?: string;

  /**
   * Maal lene kaun aaya tha — jab khud khate wala na aaya ho.
   *
   * Udhaar khata mahine bhar chalta hai aur maal aksar mulazim ya ghar
   * ka koi fard le jata hai. Ye naam bill par aur khate me chala jata
   * hai, taake mahine ke aakhir me hisaab par koi jhagra na ho.
   *
   * Khali chhora ja sakta hai: cash walk-in par koi receiver nahi hota.
   */
  @ApiPropertyOptional({
    description: 'Jo banda maal lene aaya (khate wale ka mulazim/ghar ka fard)',
    example: 'Bilal (driver)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  receivedByName?: string;

  @ApiPropertyOptional({ description: 'Receiver ka phone', example: '03001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  receivedByPhone?: string;

  @ApiPropertyOptional({ description: 'Receiver ka CNIC', example: '35202-1234567-1' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  receivedByCnic?: string;

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
