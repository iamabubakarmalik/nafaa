/**
 * The one receipt every part of the app prints: the bill itself (ReceiptDoc),
 * the shop's look for it (ReceiptDesign, saved in settings) and the shop's
 * details (ReceiptShop).
 */

export type ReceiptPaper = '58' | '80' | 'A4';
export type ReceiptStyle = 'classic' | 'modern' | 'bold';
export type ReceiptFont = 'small' | 'normal' | 'large';
export type ReceiptWatermark = 'none' | 'shop' | 'nafaa' | 'both';
export type A4Layout = 'band' | 'split' | 'minimal';
export type PayKind = 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'RAAST' | 'NAYAPAY' | 'SADAPAY' | 'OTHER';

/** Where customers can send money; printed on bills that are not fully paid. */
export interface PayAccount {
  kind: PayKind;
  /** Account title, e.g. "Malik General Store". */
  title: string;
  /** Mobile number, account number or Raast ID. */
  number: string;
  bank?: string;
  iban?: string;
}

/** Owner's choices for every bill (Settings → Raseed). */
export interface ReceiptDesign {
  paper: ReceiptPaper;
  style: ReceiptStyle;
  font: ReceiptFont;
  /** A4 / PDF colour; thermal paper is always black. */
  accent: string;
  /** Faint name across the A4 background. */
  watermark: ReceiptWatermark;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTaxNumber: boolean;
  showCustomer: boolean;
  showCashier: boolean;
  showItemNumbers: boolean;
  showItemDetails: boolean;
  showSavings: boolean;
  showKhata: boolean;
  showBarcode: boolean;
  showPayQr: boolean;
  showReviewQr: boolean;
  showAmountInWords: boolean;
  showSignature: boolean;
  /** Line under the shop name, e.g. "Taaza aur asli maal". */
  tagline: string;
  /** Shop's own message at the bottom. */
  footer: string;
  /** Return / exchange rules, one per line. */
  terms: string;
  /** Social or website line, e.g. "fb.com/meridukaan". */
  social: string;
  thanks: string;
  copies: number;
  autoPrint: boolean;

  /* Payment details */
  payAccounts: PayAccount[];
  /** When to print them: unpaid bills only, every bill, or never. */
  payWhen: 'due' | 'always' | 'never';
  /** E.g. "Paise bhej kar screenshot WhatsApp karein". */
  payNote: string;

  /* A4 invoice */
  a4Title: string;
  a4Layout: A4Layout;
  showStatus: boolean;
  showSku: boolean;
  showCustomerDetails: boolean;
  /** Days to pay an unpaid bill; 0 = no due date. */
  dueDays: number;

  /* The back: a second page (A4) or a section after the bill (thermal). */
  backText: string;
  backPrint: 'none' | 'a4' | 'all';
  /** Faint repeating name behind thermal bills (some printers show dots). */
  thermalPattern: boolean;
}

export interface ReceiptShop {
  name: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  taxLabel?: string | null;
  logoUrl?: string | null;
}

export interface ReceiptSetup {
  design: ReceiptDesign;
  shop: ReceiptShop;
}

export interface ReceiptLineDoc {
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  /** Printed savings on the line (e.g. line discount). */
  discount?: number;
  /** Customer-facing note, e.g. "1 piece damage tha". */
  note?: string;
  /** IMEI, serial, warranty, size and similar, one per entry. */
  details?: string[];
  sku?: string;
}

export interface ReceiptRowDoc {
  label: string;
  value: string;
  bold?: boolean;
}

/** One bill, ready to print, from any screen. */
export interface ReceiptDoc {
  saleNumber: string;
  date: Date;
  /** "Asli bill", "Copy", "VOIDED" and similar. */
  stamp?: string;
  branchName?: string | null;
  branchAddress?: string | null;
  branchPhone?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  receivedByName?: string;
  receivedByPhone?: string;
  cashierName?: string;
  /** Rows under the header: table, room, order type, doctor… */
  infoRows?: ReceiptRowDoc[];
  lines: ReceiptLineDoc[];
  subtotal: number;
  discount: number;
  deliveryCharge?: number;
  riderDelivery?: number;
  deliveryAddress?: string;
  /** Rows between items and total (service charge, tax, making…). */
  extraRows?: ReceiptRowDoc[];
  total: number;
  paid: number;
  paymentLabel: string;
  previousDue?: number;
  /** Industry message above the shop's own footer. */
  footerNote?: string;
}
