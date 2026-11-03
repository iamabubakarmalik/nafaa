/**
 * Printing and sharing bills.
 *
 * Printing goes through a `ReceiptPrinter`. The built-in one uses the
 * system print dialog (AirPrint on iOS, the print service on Android) with
 * the shared receipt design. A direct thermal printer (Bluetooth / network
 * ESC/POS) needs a native module; when one is added it registers itself with
 * `setReceiptPrinter`, and every screen prints through it without changes.
 *
 * Sharing makes a PDF of the same design and opens the share sheet
 * (WhatsApp, email, Files); `whatsappText` sends the bill as text.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { formatPKR } from '@/core/format';
import { renderReceipt } from './html';
import { getReceiptSetup, printPaper, NAFAA } from './setup';
import { methodWord, rw, type ReceiptLang } from './words';
import { PAY_KIND_LABEL } from './html';
import type { ReceiptDoc, ReceiptPaper, ReceiptSetup } from './types';

export interface PrintJob {
  doc: ReceiptDoc;
  setup: ReceiptSetup;
  paper: ReceiptPaper;
  copies: number;
  lang: ReceiptLang;
}

export interface ReceiptPrinter {
  /** Shown in settings, e.g. "System printer" or the paired printer's name. */
  name: string;
  print(job: PrintJob): Promise<void>;
}

/** Thermal paper widths in points (1 mm ≈ 2.835 pt) for the print and PDF size. */
const PAPER_PT: Record<ReceiptPaper, number> = { '58': 164, '80': 227, A4: 595 };

export const systemPrinter: ReceiptPrinter = {
  name: 'System printer',
  async print({ doc, setup, paper, copies, lang }) {
    const html = renderReceipt(doc, setup, { paper, copies, lang });
    await Print.printAsync(paper === 'A4' ? { html } : { html, width: PAPER_PT[paper] });
  },
};

let printer: ReceiptPrinter = systemPrinter;

/** Registers a direct printer (a native ESC/POS adapter); null goes back to the system dialog. */
export function setReceiptPrinter(p: ReceiptPrinter | null) {
  printer = p ?? systemPrinter;
}

export const currentPrinter = () => printer;

export interface PrintOptions {
  paper?: ReceiptPaper;
  copies?: number;
  setup?: ReceiptSetup;
  lang?: ReceiptLang;
}

/** Prints one bill in the shop's design. Throws when the dialog fails (cancelling is not an error). */
export async function printReceipt(doc: ReceiptDoc, o: PrintOptions = {}): Promise<void> {
  const setup = o.setup ?? getReceiptSetup();
  try {
    await printer.print({ doc, setup, paper: o.paper ?? printPaper(setup), copies: o.copies ?? setup.design.copies, lang: o.lang ?? 'roman' });
  } catch (e) {
    // iOS reports a dismissed print dialog as an error; that is the cashier's choice.
    if (/cancel|dismiss/i.test(String((e as Error)?.message ?? ''))) return;
    throw e;
  }
}

/** Makes a PDF of the bill and opens the share sheet. */
export async function shareReceiptPdf(doc: ReceiptDoc, o: PrintOptions = {}): Promise<void> {
  const setup = o.setup ?? getReceiptSetup();
  const paper = o.paper ?? printPaper(setup);
  const html = renderReceipt(doc, setup, { paper, copies: 1, lang: o.lang ?? 'roman' });
  const file = await Print.printToFileAsync(paper === 'A4' ? { html } : { html, width: PAPER_PT[paper], height: Math.max(600, 260 + doc.lines.length * 46) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.saleNumber });
  }
}

/** The bill as a WhatsApp message in the shop's bill language. */
export function receiptText(doc: ReceiptDoc, lang: ReceiptLang, setup: ReceiptSetup = getReceiptSetup()): string {
  const due = Math.max(doc.total - doc.paid, 0);
  const owed = due + (doc.previousDue ?? 0);
  const accounts = (setup.design.payAccounts ?? []).filter((a) => a.number?.trim());
  const pay = owed > 0 && accounts.length
    ? ['', `*${rw(lang, 'payDue', { amount: formatPKR(owed) })}*`, ...accounts.map((a) => `${PAY_KIND_LABEL[a.kind] ?? 'Account'}${a.bank ? ` (${a.bank})` : ''}: ${a.number}${a.title ? ` — ${a.title}` : ''}${a.iban ? `\nIBAN ${a.iban}` : ''}`), rw(lang, 'payRef', { number: doc.saleNumber })]
    : [];
  return [
    `*${setup.shop.name}*`,
    `${rw(lang, 'bill')} ${doc.saleNumber} · ${doc.date.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' })}`,
    '',
    ...doc.lines.map((l) => `${l.qty} ${l.unit} ${l.name} — ${formatPKR(l.total)}`),
    '',
    doc.discount > 0 ? `${rw(lang, 'discount')}: −${formatPKR(doc.discount)}` : '',
    `*${rw(lang, 'total')}: ${formatPKR(doc.total)}*`,
    ...(doc.payments?.length ? doc.payments.map((p) => `${p.label}: ${formatPKR(p.amount)}`) : [`${doc.paymentLabel}: ${formatPKR(doc.paid)}`]),
    due > 0 ? `${rw(lang, 'due')}: ${formatPKR(due)}` : '',
    ...pay,
    '',
    rw(lang, 'thanks'),
    `_${NAFAA.name} · ${NAFAA.phone}_`,
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}

/** Pakistani number → WhatsApp international digits (0300… → 92300…). */
export const waNumber = (phone?: string | null) => (phone ?? '').replace(/\D/g, '').replace(/^0/, '92');

/** Opens WhatsApp with the bill text, to the customer's number when known. */
export async function sendReceiptWhatsApp(doc: ReceiptDoc, lang: ReceiptLang, phone?: string | null): Promise<boolean> {
  const text = encodeURIComponent(receiptText(doc, lang));
  const to = waNumber(phone);
  const app = `whatsapp://send?text=${text}${to ? `&phone=${to}` : ''}`;
  try {
    if (await Linking.canOpenURL(app)) { await Linking.openURL(app); return true; }
  } catch { /* fall back to the web link */ }
  try {
    await Linking.openURL(`https://wa.me/${to}?text=${text}`);
    return true;
  } catch {
    return false;
  }
}

export { methodWord };
