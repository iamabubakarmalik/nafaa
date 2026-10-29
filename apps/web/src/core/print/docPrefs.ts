/**
 * Paper and copies per kind of printed document, on this computer. Each
 * print dialog (purchase, transfer, voucher…) remembers its own choices
 * under the storage key listed here; Settings → Printing reads and edits the
 * same entries, so a default set there is what the dialog opens with, and a
 * change made in the dialog shows up there.
 *
 * Bills themselves are not listed: their paper is the device paper from
 * core/receipt/setup and the POS counter width (see PrintSettingsPage).
 */

import type { ReceiptPaper } from '@core/receipt/types';

export interface DocKind {
  id: string;
  label: string;
  /** Where in the app it is printed. */
  where: string;
  store: string;
  /** Dialog default; undefined = the shop's bill paper. */
  paper?: ReceiptPaper;
  copies: number;
  /** Heading on the A4 test print. */
  title: string;
  /** Written with the first saved choice, for dialogs that need these keys. */
  seed?: Record<string, unknown>;
  /** Papers this document can print on; all when not set. */
  papers?: ReceiptPaper[];
}

export const DOC_KINDS: DocKind[] = [
  { id: 'return', label: 'Return ki parchi', where: 'Sale → Return', store: 'nafaa-return-slip', copies: 1, title: 'RETURN SLIP' },
  { id: 'booking', label: 'Booking / order ki raseed', where: 'Bookings', store: 'nafaa-booking-print', paper: '80', copies: 1, title: 'BOOKING' },
  { id: 'purchase', label: 'Khareed ka bill / order', where: 'Khareed', store: 'nafaa-purchase-print', paper: 'A4', copies: 1, title: 'PURCHASE BILL', seed: { kind: 'bill' } },
  { id: 'transfer', label: 'Maal bhejne ka challan', where: 'Stock → Transfer', store: 'nafaa-transfer-print', paper: 'A4', copies: 2, title: 'TRANSFER CHALLAN' },
  { id: 'voucher', label: 'Expenses ka voucher', where: 'Expenses', store: 'nafaa-expense-voucher-print', paper: '80', copies: 1, title: 'EXPENSE VOUCHER' },
  { id: 'payslip', label: 'Salary slip', where: 'Staff → Tankhwah', store: 'nafaa-payslip-print', paper: 'A4', copies: 1, title: 'PAYSLIP' },
  { id: 'commission', label: 'Commission ki parchi', where: 'Staff → Commission', store: 'nafaa-commission-slip-print', paper: '80', copies: 1, title: 'COMMISSION' },
  { id: 'invoice-a4', label: 'Distribution Invoice', where: 'Distribution → Orders', store: 'nafaa-dist-invoice-print', paper: 'A4', copies: 1, title: 'INVOICE', papers: ['A4'] },
  { id: 'load-sheet', label: 'Load sheet', where: 'Distribution → Load sheets', store: 'nafaa-dist-load-sheet-print', paper: 'A4', copies: 1, title: 'LOAD SHEET', papers: ['A4'] },
  { id: 'recovery-sheet', label: 'Recovery sheet', where: 'Distribution → Recoveries', store: 'nafaa-dist-recovery-sheet-print', paper: 'A4', copies: 1, title: 'RECOVERY SHEET', papers: ['A4'] },
];

export interface DocPref { paper: ReceiptPaper; copies: number }

const PAPERS: ReceiptPaper[] = ['58', '80', 'A4'];

function readRaw(store: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(localStorage.getItem(store) || 'null');
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}

export function readDocPref(k: DocKind, shopPaper: ReceiptPaper): DocPref {
  const s = readRaw(k.store);
  const allowed = k.papers ?? PAPERS;
  const paper = allowed.includes(s?.paper as ReceiptPaper) ? (s!.paper as ReceiptPaper) : k.paper ?? (allowed.includes(shopPaper) ? shopPaper : allowed[0]);
  const copies = Number(s?.copies);
  return { paper, copies: copies >= 1 && copies <= 3 ? copies : k.copies };
}

/** Merges the change into the dialog's saved choices; its other options stay as they were. */
export function writeDocPref(k: DocKind, patch: Partial<DocPref>) {
  const cur = readRaw(k.store);
  try { localStorage.setItem(k.store, JSON.stringify({ ...(cur ?? k.seed ?? {}), ...patch })); } catch { /* storage blocked */ }
}
