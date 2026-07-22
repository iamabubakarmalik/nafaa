import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique, IsArray, IsBoolean, IsEmail, IsHexColor, IsIn,
  IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min, MaxLength,
} from 'class-validator';
import {
  RECEIPT_SIZES, PAYMENT_METHODS, STOCK_METHODS, LANGUAGES,
  THEMES, DAYS, TIME_REGEX, CURRENCIES,
} from '../constants/settings.constants';

export class UpdateSettingsDto {
  // ═══ 1. BUSINESS PROFILE ═══
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) shopName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) shopAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) shopCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) shopProvince?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) shopPostalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) shopPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) shopWhatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() shopEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopWebsite?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bannerUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) establishedDate?: Date;

  // ═══ 2. LOCALIZATION ═══
  @ApiPropertyOptional({ enum: LANGUAGES }) @IsOptional() @IsIn(LANGUAGES as any) language?: string;
  @ApiPropertyOptional({ enum: CURRENCIES }) @IsOptional() @IsIn(CURRENCIES as any) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5) currencySymbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstDayOfWeek?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME_REGEX) openTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME_REGEX) closeTime?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(DAYS as any, { each: true })
  workingDays?: string[];

  // ═══ 3. TAX & PRICING ═══
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableTax?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() taxInclusive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) taxLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1000) defaultMarkup?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsIn([1, 5, 10, 50, 100]) roundPriceTo?: number;

  // ═══ 4. RECEIPT ═══
  @ApiPropertyOptional({ enum: RECEIPT_SIZES }) @IsOptional() @IsIn(RECEIPT_SIZES as any) receiptSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) receiptHeader?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) receiptFooter?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowLogo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowTax?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowCustomer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowBarcode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowQrCode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) invoiceStartNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPrintReceipt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) printCopiesCount?: number;

  // ═══ 5. POS ═══
  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional() @IsIn(PAYMENT_METHODS as any) defaultPaymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegativeStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() confirmBeforeCheckout?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireCustomerForSale?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) maxDiscountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() roundTotal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showProductImages?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableBarcodeScanner?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableQuickKeys?: boolean;

  // ═══ 6. INVENTORY ═══
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) defaultLowStockAlert?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(365) expiryWarningDays?: number;
  @ApiPropertyOptional({ enum: STOCK_METHODS }) @IsOptional() @IsIn(STOCK_METHODS as any) stockMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoReorder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reorderPoint?: number;

  // ═══ 7. CUSTOMER & UDHAAR ═══
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowCredit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) defaultCreditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) creditOverdueDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableLoyalty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyPointsPerRupee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyRedemptionRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoCreateCustomer?: boolean;

  // ═══ 8. NOTIFICATIONS ═══
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() whatsappNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pushNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyLowStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyOutOfStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyNewSale?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyDailySummary?: boolean;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME_REGEX) dailySummaryTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyNewCustomer?: boolean;

  // ═══ 9. SECURITY ═══
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePinForVoid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePinForDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePinForRefund?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[0-9]{4,6}$/, { message: 'PIN 4-6 digits ka hona chahiye' })
  managerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(480) autoLogoutMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableTwoFactor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(3) @Max(10) maxLoginAttempts?: number;

  // ═══ 10. APPEARANCE ═══
  @ApiPropertyOptional({ enum: THEMES }) @IsOptional() @IsIn(THEMES as any) theme?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() brandColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() compactMode?: boolean;
}
