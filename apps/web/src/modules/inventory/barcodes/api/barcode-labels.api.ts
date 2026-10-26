/**
 * Barcode label design saved for the whole shop, and giving products and
 * variants without a code a scanner-safe EAN-13 in one call.
 */

import { apiClient } from '@core/api/client';

export type LabelSheet = 'thermal' | 'a4-65' | 'a4-40' | 'a4-24' | 'a4-21' | 'a4-14' | 'custom';
export type LabelFormat = 'CODE128' | 'EAN13' | 'QR';

export interface LabelConfig {
  sheet: LabelSheet;
  widthMm: number;
  heightMm: number;
  cols: number;
  gapMm: number;
  marginMm: number;
  format: LabelFormat;
  showShop: boolean;
  showName: boolean;
  showVariant: boolean;
  showPrice: boolean;
  showOldPrice: boolean;
  showSku: boolean;
  showUnit: boolean;
  showCode: boolean;
  showExpiry: boolean;
  border: boolean;
  priceSource: 'retail' | 'wholesale' | 'credit' | 'cost-code';
  align: 'left' | 'center';
  fontScale: number;
  barHeight: number;
  shopText: string;
  footerText: string;
  copies: 'one' | 'stock';
}

/** Same values the server falls back to, used until the saved design loads. */
export const LABEL_DEFAULTS: LabelConfig = {
  sheet: 'thermal', widthMm: 50, heightMm: 30, cols: 1, gapMm: 2, marginMm: 0, format: 'CODE128',
  showShop: true, showName: true, showVariant: true, showPrice: true, showOldPrice: false, showSku: false,
  showUnit: false, showCode: true, showExpiry: false, border: false, priceSource: 'retail', align: 'center',
  fontScale: 1, barHeight: 0.7, shopText: '', footerText: '', copies: 'one',
};

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const barcodeLabelsApi = {
  settings: () =>
    apiClient.get<{ data: { config: LabelConfig; missingBarcodes: number } }>('/barcode-labels/settings').then(unwrap),
  save: (patch: Partial<LabelConfig>) =>
    apiClient.patch<{ data: LabelConfig }>('/barcode-labels/settings', patch).then(unwrap),
  assign: (productIds: string[], variants = true) =>
    apiClient.post<{ data: { products: number; variants: number } }>('/barcode-labels/assign', { productIds, variants }).then(unwrap),
};
