/**
 * Receipt preferences shared with the receipt pages (same storage key):
 * paper width, short or full bill, auto-print, logo.
 */

export interface ReceiptPrefs {
  paperWidth: '58' | '80';
  mode: 'short' | 'full';
  autoPrint: boolean;
  showLogo: boolean;
}

const KEY = 'nafaa.receipt.prefs';
const DEFAULTS: ReceiptPrefs = { paperWidth: '80', mode: 'short', autoPrint: true, showLogo: true };

export function getReceiptPrefs(): ReceiptPrefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
}

export function saveReceiptPrefs(p: ReceiptPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent('receipt-prefs-changed', { detail: p }));
  } catch { /* storage unavailable */ }
}

/** Link to the receipt page with the saved paper settings. */
export const receiptLink = (saleId: string, autoprint = false) => {
  const p = getReceiptPrefs();
  return `/sales/${saleId}/receipt?paper=${p.paperWidth}&mode=${p.mode}${autoprint ? '&autoprint=1' : ''}`;
};
