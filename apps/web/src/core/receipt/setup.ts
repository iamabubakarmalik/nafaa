/**
 * Loads the receipt design and shop details once, keeps them on the device
 * for offline printing, and hands the latest copy to code that prints outside
 * React (POS checkout, order slips).
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import type { ReceiptDesign, ReceiptSetup } from './types';

export const NAFAA = {
  name: 'Nafaa POS',
  phone: '0324-1772933',
  web: 'nafaa.pk',
  pitch: 'Apni dukaan ka hisaab asaan banayein',
};

export const DEFAULT_DESIGN: ReceiptDesign = {
  paper: '80', style: 'modern', font: 'normal', accent: '#0f766e', watermark: 'both',
  showLogo: true, showAddress: true, showPhone: true, showTaxNumber: true, showCustomer: true, showCashier: true,
  showItemNumbers: true, showItemDetails: true, showSavings: true, showKhata: true, showBarcode: true,
  showPayQr: true, showReviewQr: true, showAmountInWords: true, showSignature: true,
  tagline: '', footer: '', terms: '', social: '', thanks: 'Shukriya! Phir tashreef laiye.', copies: 1, autoPrint: false,
};

const STORE = 'nafaa-receipt-setup';
export const RECEIPT_SETUP_KEY = ['receipt-setup'];

let current: ReceiptSetup | null = (() => {
  try { const raw = localStorage.getItem(STORE); return raw ? (JSON.parse(raw) as ReceiptSetup) : null; } catch { return null; }
})();

function remember(s: ReceiptSetup) {
  current = s;
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage full or blocked */ }
}

/** Fills gaps so old saved copies and partial answers still print. */
export function normalizeSetup(raw: Partial<ReceiptSetup> | null | undefined, fallbackName = 'Dukaan'): ReceiptSetup {
  return {
    design: { ...DEFAULT_DESIGN, ...(raw?.design ?? {}) },
    shop: { ...(raw?.shop ?? {}), name: raw?.shop?.name || fallbackName },
  };
}

/** Last known setup, for printing outside React. */
export function getReceiptSetup(fallbackName?: string): ReceiptSetup {
  return normalizeSetup(current, fallbackName);
}

export async function fetchReceiptSetup(): Promise<ReceiptSetup> {
  const res = await apiClient.get<{ data: ReceiptSetup }>('/settings/receipt');
  const s = normalizeSetup(res.data.data);
  remember(s);
  return s;
}

export function useReceiptSetup() {
  return useQuery({
    queryKey: RECEIPT_SETUP_KEY,
    queryFn: () => fetchReceiptSetup().catch(() => getReceiptSetup()),
    placeholderData: current ? normalizeSetup(current) : undefined,
    staleTime: 5 * 60_000,
  });
}

export const receiptSetupApi = {
  save: (design: Partial<ReceiptDesign>) =>
    apiClient.patch<{ data: ReceiptDesign }>('/settings/receipt-config', design).then((r) => r.data.data),
};
