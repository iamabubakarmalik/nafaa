import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique, IsArray, IsBoolean, IsEmail, IsHexColor, IsIn,
  IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min,
} from 'class-validator';

const RECEIPT_SIZES = ['THERMAL_58MM', 'THERMAL_80MM', 'A4_BASIC', 'A4_DETAILED'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'];
const STOCK_METHODS = ['FIFO', 'LIFO', 'AVERAGE'];
const LANGUAGES = ['ur', 'en', 'roman_ur'];
const THEMES = ['light', 'dark', 'auto'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateSettingsDto {
  // ===== 1. BUSINESS PROFILE =====
  @ApiPropertyOptional() @IsOptional() @IsString() shopName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopProvince?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopPostalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopWhatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() shopEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopWebsite?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bannerUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) establishedDate?: Date;

  // ===== 2. LOCALIZATION =====
  @ApiPropertyOptional({ enum: LANGUAGES }) @IsOptional() @IsIn(LANGUAGES) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencySymbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstDayOfWeek?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME_REGEX) openTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME_REGEX) closeTime?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(DAYS, { each: true })
  workingDays?: string[];

  // ===== 3. TAX & PRICING =====
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableTax?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() taxInclusive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) defaultMarkup?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsIn([1, 5, 10]) roundPriceTo?: number;

  // ===== 4. RECEIPT =====
  @ApiPropertyOptional({ enum: RECEIPT_SIZES }) @IsOptional() @IsIn(RECEIPT_SIZES) receiptSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptHeader?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptFooter?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowLogo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowTax?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowCustomer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowBarcode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receiptShowQrCode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) invoiceStartNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPrintReceipt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) printCopiesCount?: number;

  // ===== 5. POS =====
  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional() @IsIn(PAYMENT_METHODS) defaultPaymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegativeStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() confirmBeforeCheckout?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireCustomerForSale?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) maxDiscountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() roundTotal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showProductImages?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableBarcodeScanner?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableQuickKeys?: boolean;

  // ===== 6. INVENTORY =====
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) defaultLowStockAlert?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) expiryWarningDays?: number;
  @ApiPropertyOptional({ enum: STOCK_METHODS }) @IsOptional() @IsIn(STOCK_METHODS) stockMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoReorder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reorderPoint?: number;

  // ===== 7. CUSTOMER & UDHAAR =====
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowCredit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) defaultCreditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) creditOverdueDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableLoyalty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyPointsPerRupee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyRedemptionRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoCreateCustomer?: boolean;

  // ===== 8. NOTIFICATIONS =====
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

  // ===== 9. SECURITY =====
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePinForVoid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePinForDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePinForRefund?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[0-9]{4,6}$/, { message: 'PIN should be 4-6 digits' })
  managerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(480) autoLogoutMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableTwoFactor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(3) @Max(10) maxLoginAttempts?: number;

  // ===== 10. APPEARANCE =====
  @ApiPropertyOptional({ enum: THEMES }) @IsOptional() @IsIn(THEMES) theme?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() brandColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() compactMode?: boolean;
}
