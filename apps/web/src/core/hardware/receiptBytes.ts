import { formatPKR } from '@core/lib/format';
import type { PrinterWidth, ReceiptPayload } from '@modules/pos/lib/thermalReceipt';
import { EscPos } from './escpos';
import { billQr } from '@core/payments/payQr';
import { billReviewUrl } from '@integrations/google/google.api';
import { fiscalFor } from '@integrations/tax-authority/taxAuthority.api';

/**
 * Wahi bill jo browser print karta hai (thermalReceipt.buildReceiptHtml),
 * bas seedha printer ki zabaan me — popup nahi, "Print" dialog nahi,
 * aur ek second se kam me. Tarteeb dono me same rakhi hai.
 */
export function receiptBytes(
  p: ReceiptPayload,
  width: PrinterWidth,
  o: { barcode?: boolean; drawer?: boolean } = {},
): Uint8Array {
  const e = new EscPos(width === '80' ? 48 : 32);
  const due = Math.max(p.total - p.paid, 0);
  const prevDue = p.previousDue ?? 0;

  if (o.drawer) e.drawer(); // pehle drawer — cashier ko intezar na karna pare

  e.align('center').bold(true).size(2).wrap(p.shopName).size(1).bold(false);
  if (p.shopAddress) e.wrap(p.shopAddress);
  if (p.shopPhone) e.line(`Ph: ${p.shopPhone}`);
  e.align('left').rule();
  e.row('RECEIPT', p.saleNumber);
  e.row('DATE', p.date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }));
  if (p.customerName) e.row('CUSTOMER', p.customerName);
  if (p.cashierName) e.row('CASHIER', p.cashierName);
  e.rule();

  p.lines.forEach((l, i) => {
    e.bold(true).wrap(`${i + 1}. ${l.name}`).bold(false);
    e.row(`   ${l.qty} ${l.unit} x ${formatPKR(l.price)}`, formatPKR(l.total));
    if (l.note) e.wrap(`-> ${l.note}`, '   ');
  });
  e.rule();
  e.row('Items', String(p.lines.length));
  const showSub = p.discount > 0 || (p.deliveryCharge ?? 0) > 0;
  if (showSub) e.row('Subtotal', formatPKR(p.subtotal));
  if (p.discount > 0) e.row('Discount', `-${formatPKR(p.discount)}`);
  if ((p.deliveryCharge ?? 0) > 0) {
    e.row('Delivery', `+${formatPKR(p.deliveryCharge)}`);
    if (p.deliveryAddress) e.wrap(p.deliveryAddress, '  ');
  }
  for (const r of p.extraRows ?? []) { e.bold(!!r.bold).row(r.label, r.value).bold(false); }
  e.rule('=');
  // TOTAL bara — double width me aadhi jagah milti hai
  e.bold(true).size(2).row('TOTAL', formatPKR(p.total), e.cols / 2).size(1);
  e.bold(false).row(p.paymentLabel, formatPKR(p.paid));
  if (p.paid > p.total) e.bold(true).row('CHANGE (wapis dein)', formatPKR(p.paid - p.total)).bold(false);
  if (due > 0) e.bold(true).row('UDHAAR (baqi)', formatPKR(due)).bold(false);

  if (prevDue > 0) {
    e.rule();
    e.bold(true).line(`KHATA - ${p.customerName || 'Customer'}`).bold(false);
    e.row('Pichla udhaar', formatPKR(prevDue));
    if (due > 0) e.row('Is bill ka', `+${formatPKR(due)}`);
    e.bold(true).row('KUL UDHAAR', formatPKR(prevDue + due)).bold(false);
  }
  if (p.receivedByName) {
    e.rule();
    e.bold(true).line('MAAL LE JANE WALA').line(p.receivedByName).bold(false);
    if (p.receivedByPhone) e.line(`Ph: ${p.receivedByPhone}`);
    e.feed(2).line('_'.repeat(Math.min(24, e.cols))).line('Dastkhat / Signature');
  }
  const f = fiscalFor(p.saleNumber);
  if (f === 'pending') e.rule().align('center').line('Tax invoice number: baad me').align('left');
  else if (f) {
    e.rule().align('center').bold(true).line(f.label).line(f.fiscalNumber ?? '').bold(false);
    e.line(`Tax ${f.taxRate}% - ${formatPKR(f.taxAmount)}`);
    if (f.qrText) e.qr(f.qrText, width === '80' ? 5 : 4).feed(1);
    e.align('left');
  }
  const q = billQr(prevDue + due, p.saleNumber);
  if (q) {
    e.rule().align('center').bold(true).line(`BAQI ${formatPKR(prevDue + due)} QR SE BHEJEIN`).bold(false);
    e.line(q.label).qr(q.text, width === '80' ? 6 : 4).feed(1).align('left');
  }
  e.rule();
  if (o.barcode !== false) e.align('center').barcode(p.saleNumber).line(p.saleNumber);
  e.align('center');
  if (p.footerNote) e.wrap(p.footerNote);
  e.line('Shukriya! Phir tashreef laiye.');
  const review = billReviewUrl();
  if (review) e.qr(review, width === '80' ? 4 : 3).line('Google par review dein *');
  e.line('Powered by Nafaa POS');
  e.align('left').cut();
  return e.bytes();
}

/** "Test print" — printer sahi jura hai ya nahi */
export function testPageBytes(width: PrinterWidth, drawer = false): Uint8Array {
  const e = new EscPos(width === '80' ? 48 : 32);
  if (drawer) e.drawer();
  e.align('center').bold(true).size(2).line('NAFAA POS').size(1).line('Test print theek hai').bold(false);
  e.line(new Date().toLocaleString('en-PK')).rule();
  e.align('left').row('Kaghaz', `${width}mm (${e.cols} harf)`).row('Item', 'Rs 1,250.00');
  e.rule().align('center').barcode('NAFAA-TEST').line('NAFAA-TEST').align('left').cut();
  return e.bytes();
}
