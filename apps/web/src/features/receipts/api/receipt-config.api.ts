import { apiClient } from '@/api/client';

export type ReceiptTemplate = 'STANDARD' | 'RESTAURANT' | 'CARPET' | 'MOBILE';

export interface ReceiptConfig {
  template: ReceiptTemplate;
  showLogo: boolean;
  showShopName: boolean;
  showShopAddress: boolean;
  showShopPhone: boolean;
  showCustomer: boolean;

  // Restaurant-specific
  showTableNumber?: boolean;
  showOrderMode?: boolean;
  showWaiterName?: boolean;
  showModifiers?: boolean;
  showSpecialInstructions?: boolean;
  showServiceCharge?: boolean;
  showTaxBreakdown?: boolean;
  showTip?: boolean;
  showKot?: boolean;

  // Carpet-specific
  showDimensions?: boolean;
  showSqft?: boolean;
  showRollNumber?: boolean;
  showCutDetails?: boolean;
  showWholesalePrice?: boolean;

  // Mobile-specific
  showImei?: boolean;
  showWarranty?: boolean;
  showSerialNumber?: boolean;
  showPtaStatus?: boolean;

  // Retail-specific
  showUnit?: boolean;
  showMrp?: boolean;
  showBarcode?: boolean;

  // Common
  showFooter: boolean;
  footerText: string;
  paperWidth: 58 | 80;
  fontSize: 'small' | 'normal' | 'large';
  showQRCode?: boolean;
  copies: 1 | 2;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const receiptConfigApi = {
  get: () => apiClient.get('/settings/receipt-config').then(unwrap<ReceiptConfig>),

  update: (data: Partial<ReceiptConfig>) =>
    apiClient.patch('/settings/receipt-config', data).then(unwrap<ReceiptConfig>),
};
