/**
 * The shop's receipt design and details (Settings → Receipt, GET
 * /settings/receipt), kept on the phone so bills print offline, plus this
 * phone's own paper choice. Same defaults as the web (core/receipt/setup).
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { on } from '@/core/events';
import { kv } from '@/core/storage/kv';
import type { ReceiptDesign, ReceiptPaper, ReceiptSetup } from './types';

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
  payAccounts: [], payWhen: 'due', payNote: '',
  a4Title: 'INVOICE', a4Layout: 'band', showStatus: true, showSku: false, showCustomerDetails: true, dueDays: 0,
  backText: '', backPrint: 'none', thermalPattern: false,
};

const STORE = 'nafaa.receipt.setup';
const PAPER_KEY = 'nafaa.receipt.paper';
export const RECEIPT_SETUP_KEY = ['receipt-setup'];

let current: ReceiptSetup | null = kv.get<ReceiptSetup | null>(STORE, null);

// The saved setup belongs to one account and branch: never show it to the next one.
function forgetSetup() {
  current = null;
  kv.remove(STORE);
}
on('session:expired', forgetSetup);
on('shop:changed', forgetSetup);

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
  const res = await apiClient.get<ReceiptSetup>('/settings/receipt');
  const s = normalizeSetup(res.data);
  current = s;
  kv.set(STORE, s);
  return s;
}

/** The setup, refreshed from the server when online; the saved copy otherwise. */
export function useReceiptSetup() {
  return useQuery({
    queryKey: RECEIPT_SETUP_KEY,
    queryFn: () => fetchReceiptSetup().catch(() => getReceiptSetup()),
    placeholderData: current ? normalizeSetup(current) : undefined,
    staleTime: 5 * 60_000,
  });
}

/** This phone's paper when someone picked one; null follows the shop. */
export function devicePaper(): ReceiptPaper | null {
  const v = kv.get<string | null>(PAPER_KEY, null);
  return v === '58' || v === '80' || v === 'A4' ? v : null;
}

export function setDevicePaper(p: ReceiptPaper | null) {
  if (p) kv.set(PAPER_KEY, p);
  else kv.remove(PAPER_KEY);
}

export function printPaper(setup: ReceiptSetup): ReceiptPaper {
  return devicePaper() ?? setup.design.paper;
}
