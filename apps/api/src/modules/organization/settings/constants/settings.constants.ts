export const RECEIPT_SIZES = ['THERMAL_58MM', 'THERMAL_80MM', 'A4_BASIC', 'A4_DETAILED'] as const;
export const PAYMENT_METHODS = ['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'RAAST', 'SADAPAY', 'NAYAPAY'] as const;
export const STOCK_METHODS = ['FIFO', 'LIFO', 'AVERAGE'] as const;
export const LANGUAGES = ['ur', 'en', 'roman_ur'] as const;
export const THEMES = ['light', 'dark', 'auto'] as const;
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR'] as const;

export const SETTINGS_SECTIONS = [
  'business', 'localization', 'tax', 'receipt', 'pos',
  'inventory', 'customer', 'notifications', 'security',
  'appearance', 'integrations', 'backup', 'team',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const INTEGRATION_TYPES = [
  'FBR_POS',        // FBR PRAL POS integration
  'FBR_SANDBOX',
  'DARAZ',
  'FOODPANDA',
  'CHEETAY',
  'CAREEM',
  'WHATSAPP_BUSINESS',
  'META_PIXEL',
  'GOOGLE_ANALYTICS',
  'MAILCHIMP',
  'STRIPE',
  'JAZZCASH_MERCHANT',
  'EASYPAISA_MERCHANT',
  'BANK_ACCOUNT',
  'SMS_GATEWAY',
  'PRINTER_NODE',
  'ZAPIER',
  'CUSTOM_WEBHOOK',
] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const DEFAULT_SETTINGS: Record<string, any> = {
  receipt: {
    receiptSize: 'THERMAL_58MM',
    receiptHeader: null,
    receiptFooter: null,
    receiptShowLogo: true,
    receiptShowTax: true,
    receiptShowCustomer: true,
    receiptShowBarcode: false,
    receiptShowQrCode: false,
    invoicePrefix: 'INV-',
    invoiceStartNumber: 1,
    autoPrintReceipt: false,
    printCopiesCount: 1,
  },
  tax: {
    enableTax: false,
    taxRate: 0,
    taxInclusive: false,
    taxNumber: null,
    taxLabel: 'GST',
    defaultMarkup: 0,
    roundPriceTo: 1,
  },
  pos: {
    defaultPaymentMethod: 'CASH',
    allowNegativeStock: false,
    confirmBeforeCheckout: true,
    requireCustomerForSale: false,
    allowDiscount: true,
    maxDiscountPercent: 50,
    roundTotal: true,
    showProductImages: true,
    enableBarcodeScanner: true,
    enableQuickKeys: true,
    serviceChargePct: 0,
    exchangeDays: 0,
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    pushNotifications: true,
    notifyLowStock: true,
    notifyOutOfStock: true,
    notifyNewSale: false,
    notifyDailySummary: true,
    dailySummaryTime: '21:00',
    notifyNewCustomer: false,
  },
  security: {
    requirePinForVoid: false,
    requirePinForDiscount: false,
    requirePinForRefund: true,
    autoLogoutMinutes: 60,
    enableTwoFactor: false,
    maxLoginAttempts: 5,
  },
  appearance: {
    theme: 'light',
    brandColor: '#16a34a',
    compactMode: false,
  },
  inventory: {
    defaultLowStockAlert: 10,
    trackExpiry: false,
    expiryWarningDays: 30,
    stockMethod: 'AVERAGE',
    autoReorder: false,
    reorderPoint: 5,
  },
  customer: {
    allowCredit: true,
    defaultCreditLimit: 0,
    creditOverdueDays: 30,
    enableLoyalty: false,
    loyaltyPointsPerRupee: 0.01,
    loyaltyRedemptionRate: 1,
    loyaltyMinRedeem: 0,
    loyaltyMaxRedeemPercent: 100,
    loyaltyExpiryDays: 0,
    autoCreateCustomer: false,
  },
};

/**
 * POS counter screen: layout and which parts the counter shows. Stored as
 * `posCounter` inside TenantSettings.receiptConfig (JSON), so no column is
 * needed. Each user may pick their own layout and density on their counter.
 */
export const POS_LAYOUTS = ['classic', 'express', 'cartfocus', 'touch'] as const;
export const POS_DENSITIES = ['compact', 'comfortable'] as const;

export const POS_COUNTER_DEFAULTS = {
  layout: 'classic' as (typeof POS_LAYOUTS)[number],
  density: 'compact' as (typeof POS_DENSITIES)[number],
  showImages: true,
  showCategories: true,
  showQuickKeys: true,
  showReceiver: true,
  showDelivery: true,
  showDiscount: true,
  lineNotes: false,
  priceEdit: true,
  sounds: false,
  autoPrint: true,
  showStock: true,
  recentItems: true,
  changeDue: true,
  /** Discount % buttons a cashier can tap; only those within their limit are shown. */
  quickDiscounts: [5, 10] as number[],
};

export type PosCounterConfig = typeof POS_COUNTER_DEFAULTS;

const POS_BOOL_KEYS = Object.entries(POS_COUNTER_DEFAULTS).filter(([, v]) => typeof v === 'boolean').map(([k]) => k);

/** Stored value with defaults filled in; unknown or broken values fall back to the default. */
export function normalizePosCounter(raw: unknown): PosCounterConfig {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...POS_COUNTER_DEFAULTS };
  for (const k of POS_BOOL_KEYS) if (typeof s[k] === 'boolean') out[k] = s[k];
  if (POS_LAYOUTS.includes(s.layout as never)) out.layout = s.layout;
  if (POS_DENSITIES.includes(s.density as never)) out.density = s.density;
  if (Array.isArray(s.quickDiscounts)) {
    out.quickDiscounts = [...new Set(s.quickDiscounts.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 100))].sort((a, b) => a - b).slice(0, 6);
  }
  return out as PosCounterConfig;
}
