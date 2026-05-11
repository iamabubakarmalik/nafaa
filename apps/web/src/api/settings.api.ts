import { apiClient } from './client';

export interface TenantSettings {
  id: string;
  tenantId: string;

  // Business
  shopName?: string | null;
  legalName?: string | null;
  shopAddress?: string | null;
  shopCity?: string | null;
  shopProvince?: string | null;
  shopPostalCode?: string | null;
  shopPhone?: string | null;
  shopWhatsapp?: string | null;
  shopEmail?: string | null;
  shopWebsite?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  businessType?: string | null;
  establishedDate?: string | null;

  // Localization
  language: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  firstDayOfWeek: string;
  openTime?: string | null;
  closeTime?: string | null;
  workingDays: string[];

  // Tax
  enableTax: boolean;
  taxRate: number;
  taxInclusive: boolean;
  taxNumber?: string | null;
  taxLabel: string;
  defaultMarkup: number;
  roundPriceTo: number;

  // Receipt
  receiptSize: string;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  receiptShowLogo: boolean;
  receiptShowTax: boolean;
  receiptShowCustomer: boolean;
  receiptShowBarcode: boolean;
  receiptShowQrCode: boolean;
  invoicePrefix: string;
  invoiceStartNumber: number;
  autoPrintReceipt: boolean;
  printCopiesCount: number;

  // POS
  defaultPaymentMethod: string;
  allowNegativeStock: boolean;
  confirmBeforeCheckout: boolean;
  requireCustomerForSale: boolean;
  allowDiscount: boolean;
  maxDiscountPercent: number;
  roundTotal: boolean;
  showProductImages: boolean;
  enableBarcodeScanner: boolean;
  enableQuickKeys: boolean;

  // Inventory
  defaultLowStockAlert: number;
  trackExpiry: boolean;
  expiryWarningDays: number;
  stockMethod: string;
  autoReorder: boolean;
  reorderPoint: number;

  // Customer
  allowCredit: boolean;
  defaultCreditLimit: number;
  creditOverdueDays: number;
  enableLoyalty: boolean;
  loyaltyPointsPerRupee: number;
  loyaltyRedemptionRate: number;
  autoCreateCustomer: boolean;

  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  notifyLowStock: boolean;
  notifyOutOfStock: boolean;
  notifyNewSale: boolean;
  notifyDailySummary: boolean;
  dailySummaryTime: string;
  notifyNewCustomer: boolean;

  // Security
  requirePinForVoid: boolean;
  requirePinForDiscount: boolean;
  requirePinForRefund: boolean;
  hasManagerPin: boolean;
  autoLogoutMinutes: number;
  enableTwoFactor: boolean;
  maxLoginAttempts: number;

  // Appearance
  theme: string;
  brandColor: string;
  compactMode: boolean;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const settingsApi = {
  get: () =>
    apiClient.get('/settings').then((r) => unwrap<{ settings: TenantSettings; tenant: any }>(r)),
  update: (data: Partial<TenantSettings> & { managerPin?: string }) =>
    apiClient.patch('/settings', data).then((r) => unwrap<TenantSettings>(r)),
  reset: (section: 'receipt' | 'tax' | 'pos' | 'notifications' | 'appearance') =>
    apiClient.post(`/settings/reset/${section}`).then((r) => unwrap<{ settings: TenantSettings; tenant: any }>(r)),
  verifyPin: (pin: string) =>
    apiClient.post('/settings/verify-pin', { pin }).then((r) => r.data),
};
