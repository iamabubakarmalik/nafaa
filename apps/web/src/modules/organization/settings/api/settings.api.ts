import { apiClient } from '@core/api/client';

export interface TenantSettings {
  id: string;
  tenantId: string;
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
  language: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  firstDayOfWeek: string;
  openTime?: string | null;
  closeTime?: string | null;
  workingDays: string[];
  enableTax: boolean;
  taxRate: number;
  taxInclusive: boolean;
  taxNumber?: string | null;
  taxLabel: string;
  defaultMarkup: number;
  roundPriceTo: number;
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
  defaultLowStockAlert: number;
  trackExpiry: boolean;
  expiryWarningDays: number;
  stockMethod: string;
  autoReorder: boolean;
  reorderPoint: number;
  allowCredit: boolean;
  defaultCreditLimit: number;
  creditOverdueDays: number;
  enableLoyalty: boolean;
  loyaltyPointsPerRupee: number;
  loyaltyRedemptionRate: number;
  autoCreateCustomer: boolean;
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
  requirePinForVoid: boolean;
  requirePinForDiscount: boolean;
  requirePinForRefund: boolean;
  hasManagerPin: boolean;
  autoLogoutMinutes: number;
  enableTwoFactor: boolean;
  maxLoginAttempts: number;
  theme: string;
  brandColor: string;
  compactMode: boolean;
}

export interface SecurityScore {
  score: number;
  level: 'STRONG' | 'MEDIUM' | 'WEAK';
  checks: Array<{ key: string; label: string; done: boolean; weight: number }>;
  activeSessions: number;
  recommendations: string[];
}

export interface Integration {
  type: string;
  isEnabled: boolean;
  displayName: string;
  hasCredentials: boolean;
  config: Record<string, any>;
  webhookUrl?: string;
  notes?: string;
  updatedAt?: string;
  lastTestedAt?: string;
  lastTestResult?: { success: boolean; message: string };
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const settingsApi = {
  get: () => apiClient.get('/settings').then((r) => unwrap<{ settings: TenantSettings; tenant: any; subscription?: any; plan?: any; notificationPref?: any }>(r)),
  update: (data: Partial<TenantSettings> & { managerPin?: string }) =>
    apiClient.patch('/settings', data).then((r) => unwrap<TenantSettings>(r)),
  reset: (section: string) =>
    apiClient.post(`/settings/reset/${section}`).then((r) => unwrap<any>(r)),

  // Receipt
  getReceiptConfig: () => apiClient.get('/settings/receipt-config').then((r) => unwrap<any>(r)),
  updateReceiptConfig: (dto: any) => apiClient.patch('/settings/receipt-config', dto).then((r) => unwrap<any>(r)),

  // Security
  verifyPin: (pin: string) => apiClient.post('/settings/security/verify-pin', { pin }).then((r) => r.data),
  setPin: (pin: string) => apiClient.post('/settings/security/set-pin', { pin }).then((r) => r.data),
  removePin: (currentPin: string) => apiClient.post('/settings/security/remove-pin', { currentPin }).then((r) => r.data),
  securityScore: () => apiClient.get('/settings/security/score').then((r) => unwrap<SecurityScore>(r)),
  listSessions: () => apiClient.get('/settings/security/sessions').then((r) => unwrap<any[]>(r)),
  revokeSession: (id: string) => apiClient.delete(`/settings/security/sessions/${id}`).then((r) => r.data),
  loginHistory: (limit = 50) => apiClient.get(`/settings/security/login-history?limit=${limit}`).then((r) => unwrap<any[]>(r)),
  activityLog: (params: { limit?: number; action?: string; userId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.action) q.set('action', params.action);
    if (params.userId) q.set('userId', params.userId);
    return apiClient.get(`/settings/security/activity-log?${q}`).then((r) => unwrap<any[]>(r));
  },

  // Integrations
  listIntegrations: () => apiClient.get('/settings/integrations').then((r) => unwrap<Integration[]>(r)),
  getIntegration: (type: string) => apiClient.get(`/settings/integrations/${type}`).then((r) => unwrap<any>(r)),
  upsertIntegration: (dto: any) => apiClient.patch('/settings/integrations', dto).then((r) => unwrap<any>(r)),
  disableIntegration: (type: string) => apiClient.post(`/settings/integrations/${type}/disable`).then((r) => r.data),
  removeIntegration: (type: string) => apiClient.delete(`/settings/integrations/${type}`).then((r) => r.data),
  testIntegration: (type: string) => apiClient.post('/settings/integrations/test', { type }).then((r) => r.data),

  // Notifications
  getNotifPref: () => apiClient.get('/settings/notifications/preferences').then((r) => unwrap<any>(r)),
  updateNotifPref: (dto: any) => apiClient.patch('/settings/notifications/preferences', dto).then((r) => unwrap<any>(r)),
  testNotif: (channel: 'email' | 'sms' | 'push') => apiClient.post('/settings/notifications/test', { channel }).then((r) => r.data),

  // Backup
  backupStats: () => apiClient.get('/settings/backup/stats').then((r) => unwrap<any>(r)),
  exportData: (entities: string[], format: 'json' | 'csv' | 'excel' = 'json') =>
    apiClient.post('/settings/backup/export', { entities, format }).then((r) => unwrap<any>(r)),

  // Danger
  transferOwnership: (newOwnerUserId: string, currentPassword: string) =>
    apiClient.post('/settings/danger/transfer-ownership', { newOwnerUserId, currentPassword }).then((r) => r.data),
  deleteTenant: (confirmation: string, currentPassword: string) =>
    apiClient.post('/settings/danger/delete-tenant', { confirmation, currentPassword }).then((r) => r.data),
  cancelDeletion: () => apiClient.post('/settings/danger/cancel-deletion').then((r) => r.data),
};
