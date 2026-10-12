import { formatPKR } from '@core/lib/format';
import type { PrinterWidth, ReceiptPayload } from '@modules/pos/lib/thermalReceipt';
import { EscPos } from './escpos';
import { billQr } from '@core/payments/payQr';
import { billReviewUrl } from '@integrations/google/google.api';
import { fiscalFor } from '@integrations/tax-authority/taxAuthority.api';
import { NAFAA, getReceiptSetup } from '@core/receipt/setup';

/**
 * The same bill the browser prints (core/receipt), in the printer's own
 * language: no popup and no print dialog. Order and toggles follow the
 * shop's receipt design.
 */
export function receiptBytes(
  p: ReceiptPayload,
  width: PrinterWidth,
  o: { barcode?: boolean; drawer?: boolean } = {},
): Uint8Array {
  const { design: d, shop } = getReceiptSetup(p.shopName);
  const e = new EscPos(width === '80' ? 48 : 32);
  const due = Math.max(p.total - p.paid, 0);
  const prevDue = p.previousDue ?? 0;

  if (o.drawer) e.drawer(); // drawer first, so the cashier does not wait

  e.align('center').bold(true).size(2).wrap(shop.name || p.shopName).size(1).bold(false);
  if (d.tagline) e.wrap(d.tagline);
  if (p.branchName) e.wrap(`Branch: ${p.branchName}`);
  if (p.shopAddress) e.wrap(p.shopAddress);
  if (p.shopPhone) e.line(`Ph: ${p.shopPhone}`);
  if (d.showTaxNumber && shop.taxNumber) e.line(`${shop.taxLabel || 'NTN'}: ${shop.taxNumber}`);
  e.align('left').rule();
  e.row('Bill #', p.saleNumber);
  e.row('Tareekh', p.date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }));
  if (d.showCustomer && p.customerName) e.row('Customer', p.customerName);
  if (d.showCashier && p.cashierName) e.row('Cashier', p.cashierName);
  for (const r of p.infoRows ?? []) e.row(r.label, r.value);
  e.rule();

  p.lines.forEach((l, i) => {
    e.bold(true).wrap(`${d.showItemNumbers ? `${i + 1}. ` : ''}${l.name}`).bold(false);
    e.row(`   ${l.qty} ${l.unit} x ${formatPKR(l.price)}`, formatPKR(l.total));
    if (l.discount) e.row('   Chhoot', `-${formatPKR(l.discount)}`);
    if (l.note) e.wrap(`-> ${l.note}`, '   ');
    if (d.showItemDetails) for (const x of l.details ?? []) e.wrap(x, '   ');
  });
  e.rule();
  e.row(`Items ${p.lines.length}`, formatPKR(p.subtotal));
  if (p.discount > 0) e.row('Chhoot', `-${formatPKR(p.discount)}`);
  if ((p.deliveryCharge ?? 0) > 0) {
    e.row('Delivery', `+${formatPKR(p.deliveryCharge)}`);
    if (p.deliveryAddress) e.wrap(p.deliveryAddress, '  ');
  }
  for (const r of p.extraRows ?? []) { e.bold(!!r.bold).row(r.label, r.value).bold(false); }
  e.rule('=');
  e.bold(true).size(2).row('TOTAL', formatPKR(p.total), e.cols / 2).size(1);
  e.bold(false).row(p.paymentLabel, formatPKR(p.paid));
  if (p.paid > p.total) e.bold(true).row('Wapis (change)', formatPKR(p.paid - p.total)).bold(false);
  if ((p.riderDelivery ?? 0) > 0) {
    e.row('Rider ko dein', formatPKR(p.riderDelivery!));
    e.bold(true).row('Customer dega kul', formatPKR(p.total + p.riderDelivery!)).bold(false);
  }
  if (due > 0) e.bold(true).row('Udhaar (baqi)', formatPKR(due)).bold(false);
  if (d.showSavings && p.discount > 0) e.align('center').bold(true).line(`Aap ne ${formatPKR(p.discount)} bachaye`).bold(false).align('left');

  if (d.showKhata && prevDue > 0) {
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
    e.feed(2).line('_'.repeat(Math.min(24, e.cols))).line('Dastkhat');
  }
  const f = fiscalFor(p.saleNumber);
  if (f === 'pending') e.rule().align('center').line('Tax invoice number: baad me').align('left');
  else if (f) {
    e.rule().align('center').bold(true).line(f.label).line(f.fiscalNumber ?? '').bold(false);
    e.line(`Tax ${f.taxRate}% - ${formatPKR(f.taxAmount)}`);
    if (f.qrText) e.qr(f.qrText, width === '80' ? 5 : 4).feed(1);
    e.align('left');
  }
  const q = d.showPayQr ? billQr(prevDue + due, p.saleNumber) : null;
  if (q) {
    e.rule().align('center').bold(true).line(`BAQI ${formatPKR(prevDue + due)} QR SE BHEJEIN`).bold(false);
    e.line(q.label).qr(q.text, width === '80' ? 6 : 4).feed(1).align('left');
  }
  e.rule();
  if (o.barcode !== false && d.showBarcode) e.align('center').barcode(p.saleNumber).line(p.saleNumber);
  e.align('center');
  if (p.footerNote) e.wrap(p.footerNote);
  if (d.footer) e.wrap(d.footer);
  for (const t of d.terms.split('\n').map((x) => x.trim()).filter(Boolean)) e.wrap(`* ${t}`);
  if (d.thanks) e.bold(true).wrap(d.thanks).bold(false);
  if (d.social) e.wrap(d.social);
  const review = d.showReviewQr ? billReviewUrl() : null;
  if (review) e.qr(review, width === '80' ? 4 : 3).line('Google par review dein *');
  e.rule('-').bold(true).line(NAFAA.name).bold(false).wrap(`${NAFAA.pitch} ${NAFAA.phone}`);
  e.align('left').cut();
  return e.bytes();
}

/** "Test print" — printer sahi jura hai ya nahi */
export function testPageBytes(width: PrinterWidth, drawer = false): Uint8Array {
  const e = new EscPos(width === '80' ? 48 : 32);
  if (drawer) e.drawer();
  e.align('center').bold(true).size(2).line('NAFAA POS').size(1).line('Test print theek hai').line(NAFAA.phone).bold(false);
  e.line(new Date().toLocaleString('en-PK')).rule();
  e.align('left').row('Kaghaz', `${width}mm (${e.cols} harf)`).row('Item', 'Rs 1,250.00');
  e.rule().align('center').barcode('NAFAA-TEST').line('NAFAA-TEST').align('left').cut();
  return e.bytes();
}
