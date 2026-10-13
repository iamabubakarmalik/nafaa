/**
 * Renders a bill as one self-contained HTML document: a thermal receipt
 * (58 / 80 mm) or an A4 invoice, in the shop's design. Everything is inline,
 * so the app's theme (dark mode, accent) never reaches paper. The same
 * document is used for the on-screen preview, printing and PDF.
 *
 * Both kinds can carry the shop's payment accounts (for bills not fully
 * paid) and a "back": a second A4 page, or a section after a thermal bill,
 * with the shop's own conditions and branding.
 */

import JsBarcode from 'jsbarcode';
import { formatPKR } from '@core/lib/format';
import { billQr } from '@core/payments/payQr';
import { qrSvg } from '@core/payments/qrSvg';
import { billReviewUrl } from '@integrations/google/google.api';
import { fiscalFor } from '@integrations/tax-authority/taxAuthority.api';
import { NAFAA } from './setup';
import type { PayAccount, ReceiptDesign, ReceiptDoc, ReceiptPaper, ReceiptRowDoc, ReceiptSetup } from './types';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Real CODE128, drawn here because the print document has no scripts. */
export function barcodeSvg(value: string, wide: boolean): string {
  if (!value || typeof document === 'undefined') return '';
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, { format: 'CODE128', width: wide ? 1.6 : 1.3, height: 42, margin: 0, displayValue: false, lineColor: '#000', background: '#fff' });
    return new XMLSerializer().serializeToString(svg);
  } catch { return ''; }
}

export function amountInWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
    'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const w = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : '');
    if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${w(n % 100)}` : ''}`;
    if (n < 100000) return `${w(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${w(n % 1000)}` : ''}`;
    if (n < 10000000) return `${w(Math.floor(n / 100000))} Lac${n % 100000 ? ` ${w(n % 100000)}` : ''}`;
    return `${w(Math.floor(n / 10000000))} Crore${n % 10000000 ? ` ${w(n % 10000000)}` : ''}`;
  };
  const rupees = Math.floor(Math.abs(num));
  const paisa = Math.round((Math.abs(num) - rupees) * 100);
  return `${rupees ? w(rupees) : 'Zero'} Rupees${paisa ? ` and ${w(paisa)} Paisa` : ''} Only`;
}

export const PAY_KIND_LABEL: Record<PayAccount['kind'], string> = {
  JAZZCASH: 'JazzCash', EASYPAISA: 'EasyPaisa', BANK: 'Bank', RAAST: 'Raast', NAYAPAY: 'NayaPay', SADAPAY: 'SadaPay', OTHER: 'Account',
};

const when = (d: Date) => d.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = (d: Date) => d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
const money = (n: number) => formatPKR(n);
const lines = (text: string) => text.split('\n').map((t) => t.trim()).filter(Boolean);

/** Faint repeating name for the page background. */
function patternCss(names: string, color: string, opacity: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="260"><text x="20" y="150" transform="rotate(-22 310 130)" font-family="Arial" font-size="30" font-weight="700" fill="${color}" fill-opacity="${opacity}">${esc(names)}</text></svg>`;
  return `background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}");background-repeat:repeat;`;
}

function watermarkNames(d: ReceiptDesign, shopName: string) {
  if (d.watermark === 'none') return '';
  return [d.watermark !== 'nafaa' ? shopName : '', d.watermark !== 'shop' ? NAFAA.name : ''].filter(Boolean).join('   •   ');
}

interface Ctx {
  doc: ReceiptDoc;
  setup: ReceiptSetup;
  paper: ReceiptPaper;
}

const dueOf = (doc: ReceiptDoc) => Math.max(doc.total - doc.paid, 0);

function rowsHtml(rows: ReceiptRowDoc[] | undefined) {
  return (rows ?? []).map((r) => `<div class="row${r.bold ? ' strong' : ''}"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('');
}

/* ───────────────────────── Payment details ───────────────────────── */

/** Accounts to pay into, when the shop wants them on this bill. */
function payBlock({ doc, setup, paper }: Ctx): string {
  const d = setup.design;
  const owed = dueOf(doc) + (doc.previousDue ?? 0);
  const show = d.payWhen === 'always' || (d.payWhen === 'due' && owed > 0);
  const accounts = (d.payAccounts ?? []).filter((a) => a.number?.trim());
  const qr = d.showPayQr && owed > 0 ? billQr(owed, doc.saleNumber) : null;
  if (!show || (!accounts.length && !qr)) return '';
  const a4 = paper === 'A4';
  const items = accounts.map((a) => `
    <div class="acct">
      <div class="acct-k">${esc(PAY_KIND_LABEL[a.kind] ?? 'Account')}${a.bank ? ` · ${esc(a.bank)}` : ''}</div>
      <div class="acct-n">${esc(a.number)}</div>
      ${a.title ? `<div class="acct-t">${esc(a.title)}</div>` : ''}
      ${a.iban ? `<div class="acct-t mono">IBAN ${esc(a.iban)}</div>` : ''}
    </div>`).join('');
  return `
  <section class="pay">
    <div class="pay-h">${owed > 0 ? `Baqi ${money(owed)} — paise yahan bhejein` : 'Paise bhejne ke tareeqe'}</div>
    <div class="accts">${items}</div>
    ${qr ? `<div class="qr">${qrSvg(qr.text, a4 ? 110 : paper === '58' ? 112 : 136)}</div><div class="small c">${esc(qr.label)} — app se scan karein</div>` : ''}
    <div class="small c">Reference me bill # <b>${esc(doc.saleNumber)}</b> likhein${d.payNote ? ` · ${esc(d.payNote)}` : ''}</div>
  </section>`;
}

/* ───────────────────────── The back ───────────────────────── */

function backContent({ setup }: Ctx): string {
  const d = setup.design;
  const items = lines(d.backText);
  return `
    <div class="back-title">${esc(setup.shop.name)} — shartein aur hidayat</div>
    ${items.length ? `<ol class="back-list">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
    <div class="promo">
      <div class="promo-b">${esc(NAFAA.name)}</div>
      <div>Yeh bill ${esc(NAFAA.name)} se bana. Apni dukaan ka hisaab, stock, udhaar aur bills — sab mobile par.</div>
      <div class="promo-c">${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</div>
    </div>`;
}

function wantsBack(ctx: Ctx) {
  const d = ctx.setup.design;
  return !!d.backText.trim() && (d.backPrint === 'all' || (d.backPrint === 'a4' && ctx.paper === 'A4'));
}

/* ───────────────────────── Thermal ───────────────────────── */

function tHeader({ doc, setup }: Ctx) {
  const { shop, design: d } = setup;
  const address = doc.branchAddress || shop.address;
  const phone = doc.branchPhone || shop.phone;
  return `
  <header class="head">
    ${d.showLogo && shop.logoUrl ? `<img class="logo" src="${esc(shop.logoUrl)}" alt="">` : ''}
    <div class="shop">${esc(shop.name)}</div>
    ${shop.legalName && shop.legalName !== shop.name ? `<div class="sub">${esc(shop.legalName)}</div>` : ''}
    ${d.tagline ? `<div class="tag">${esc(d.tagline)}</div>` : ''}
    ${doc.branchName ? `<div class="sub">Branch: ${esc(doc.branchName)}</div>` : ''}
    ${d.showAddress && address ? `<div class="sub">${esc(address)}</div>` : ''}
    ${d.showPhone && (phone || shop.whatsapp) ? `<div class="sub">${phone ? `Ph: ${esc(phone)}` : ''}${shop.whatsapp && shop.whatsapp !== phone ? `${phone ? ' · ' : ''}WA: ${esc(shop.whatsapp)}` : ''}</div>` : ''}
    ${d.showTaxNumber && shop.taxNumber ? `<div class="sub">${esc(shop.taxLabel || 'NTN')}: ${esc(shop.taxNumber)}</div>` : ''}
  </header>`;
}

function tMeta({ doc, setup }: Ctx) {
  const d = setup.design;
  const rows: ReceiptRowDoc[] = [
    { label: 'Bill #', value: doc.saleNumber, bold: true },
    { label: 'Date', value: when(doc.date) },
    ...(d.showCustomer && doc.customerName ? [{ label: 'Customer', value: doc.customerPhone ? `${doc.customerName} (${doc.customerPhone})` : doc.customerName }] : []),
    ...(d.showCashier && doc.cashierName ? [{ label: 'Cashier', value: doc.cashierName }] : []),
    ...(doc.infoRows ?? []),
  ];
  return `<section class="meta">${rowsHtml(rows)}</section>`;
}

function tItems({ doc, setup }: Ctx) {
  const d = setup.design;
  return `<section class="lines">${doc.lines.map((l, i) => `
    <div class="item">
      <div class="iname">${d.showItemNumbers ? `${i + 1}. ` : ''}${esc(l.name)}</div>
      <div class="row"><span class="iq">${esc(l.qty)} ${esc(l.unit)}${doc.hidePrices ? '' : ` × ${money(l.price)}`}</span>${doc.hidePrices ? '' : `<span class="b">${money(l.total)}</span>`}</div>
      ${l.discount ? `<div class="row small"><span>Discount</span><span>−${money(l.discount)}</span></div>` : ''}
      ${l.note ? `<div class="inote">↳ ${esc(l.note)}</div>` : ''}
      ${d.showItemDetails && l.details?.length ? l.details.map((x) => `<div class="idet">${esc(x)}</div>`).join('') : ''}
    </div>`).join('')}</section>`;
}

function totalRows(doc: ReceiptDoc): ReceiptRowDoc[] {
  const qty = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  return [
    { label: `Items ${doc.lines.length}${qty !== doc.lines.length ? ` · Quantity ${Number(qty.toFixed(2))}` : ''}`, value: money(doc.subtotal) },
    ...(doc.discount > 0 ? [{ label: 'Discount', value: `−${money(doc.discount)}` }] : []),
    ...((doc.deliveryCharge ?? 0) > 0 ? [{ label: 'Delivery', value: `+${money(doc.deliveryCharge!)}` }] : []),
    ...(doc.extraRows ?? []),
  ];
}

function paidRows(doc: ReceiptDoc): ReceiptRowDoc[] {
  const due = dueOf(doc);
  const parts = doc.payments?.length ? doc.payments.map((p) => ({ label: p.label, value: money(p.amount) })) : [{ label: doc.paymentLabel, value: money(doc.paid) }];
  return [
    ...parts,
    ...(doc.paid > doc.total ? [{ label: 'Wapis (change)', value: money(doc.paid - doc.total), bold: true }] : []),
    ...((doc.riderDelivery ?? 0) > 0 ? [{ label: 'Rider ko dein (delivery)', value: money(doc.riderDelivery!) }, { label: 'Customer dega kul', value: money(doc.total + doc.riderDelivery!), bold: true }] : []),
    ...(due > 0 ? [{ label: 'Udhaar (baqi)', value: money(due), bold: true }] : []),
  ];
}

function khataBox({ doc, setup }: Ctx) {
  const prev = doc.previousDue ?? 0;
  const due = dueOf(doc);
  if (!setup.design.showKhata || prev <= 0) return '';
  return `
    <section class="box">
      <div class="boxt">Khata — ${esc(doc.customerName || 'Customer')}</div>
      <div class="row"><span>Pichla udhaar</span><span>${money(prev)}</span></div>
      ${due > 0 ? `<div class="row"><span>Is bill ka</span><span>+${money(due)}</span></div>` : ''}
      <div class="row strong big2"><span>Kul udhaar</span><span>${money(prev + due)}</span></div>
    </section>`;
}

function tTotals(ctx: Ctx) {
  const { doc, setup } = ctx;
  if (doc.hidePrices) {
    const qty = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    return `<section class="sum">${rowsHtml([{ label: 'Kul cheezein', value: String(doc.lines.length), bold: true }, { label: 'Kul quantity', value: String(Number(qty.toFixed(2))) }])}</section>`;
  }
  return `
  <section class="sum">
    ${rowsHtml(totalRows(doc))}
    ${doc.deliveryAddress ? `<div class="small">📍 ${esc(doc.deliveryAddress)}</div>` : ''}
    <div class="total"><span>TOTAL</span><span>${money(doc.total)}</span></div>
    ${rowsHtml(paidRows(doc))}
    ${setup.design.showSavings && doc.discount > 0 ? `<div class="saved">Aap ne ${money(doc.discount)} bachaye</div>` : ''}
  </section>
  ${khataBox(ctx)}`;
}

function fiscalHtml(doc: ReceiptDoc, wide: boolean) {
  const f = fiscalFor(doc.saleNumber);
  if (f === 'pending') return '<div class="c small">Tax invoice number: network ki wajah se baad me</div>';
  if (!f) return '';
  return `<section class="c"><div class="b">${esc(f.label)}</div><div class="mono">${esc(f.fiscalNumber ?? '')}</div>
    <div class="small">Tax ${f.taxRate}% · ${money(f.taxAmount)}</div>${f.qrText ? `<div class="qr">${qrSvg(f.qrText, wide ? 120 : 100)}</div>` : ''}</section>`;
}

function tExtras(ctx: Ctx) {
  const { doc, setup, paper } = ctx;
  const d = setup.design;
  const parts: string[] = [];
  if (doc.receivedByName) {
    parts.push(`<section class="box"><div class="boxt">Maal le jane wala</div><div class="b">${esc(doc.receivedByName)}</div>
      ${doc.receivedByPhone ? `<div class="small">Ph: ${esc(doc.receivedByPhone)}</div>` : ''}<div class="sign">Dastkhat</div></section>`);
  }
  const fiscal = fiscalHtml(doc, paper !== '58');
  if (fiscal) parts.push(fiscal);
  const pay = payBlock(ctx);
  if (pay) parts.push(pay);
  if (d.showBarcode) parts.push(`<div class="code">${barcodeSvg(doc.saleNumber, paper !== '58')}<div class="mono">${esc(doc.saleNumber)}</div></div>`);
  return parts.join('<div class="rule"></div>');
}

function shopWords({ doc, setup }: Ctx, small: boolean) {
  const d = setup.design;
  const review = d.showReviewQr ? billReviewUrl() : null;
  const terms = lines(d.terms);
  return `
    ${doc.footerNote ? `<div class="msg">${esc(doc.footerNote)}</div>` : ''}
    ${d.footer ? `<div class="msg">${esc(d.footer)}</div>` : ''}
    ${terms.length ? `<ul class="terms">${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${d.thanks ? `<div class="thanks">${esc(d.thanks)}</div>` : ''}
    ${d.social ? `<div class="small">${esc(d.social)}</div>` : ''}
    ${review ? `<div class="qr">${qrSvg(review, small ? 72 : 86)}</div><div class="small">Google par review dein ★</div>` : ''}`;
}

const nafaaLine = () => `
  <div class="nafaa">
    <div class="nb">${esc(NAFAA.name)}</div>
    <div>${esc(NAFAA.pitch)} · ${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</div>
  </div>`;

function thermalBody(ctx: Ctx) {
  const tail = tExtras(ctx);
  return `
  <div class="paper">
    ${ctx.doc.stamp ? `<div class="stamp">${esc(ctx.doc.stamp)}</div>` : ''}
    ${tHeader(ctx)}
    ${tMeta(ctx)}
    <div class="rule"></div>
    ${tItems(ctx)}
    <div class="rule"></div>
    ${tTotals(ctx)}
    ${tail ? `<div class="rule"></div>${tail}` : ''}
    ${(ctx.doc.boxes ?? []).map((b) => `<div class="rule"></div><section class="box"><div class="boxt">${esc(b.title)}</div>${b.lines.map((x) => `<div class="small">${esc(x)}</div>`).join('')}</section>`).join('')}
    <footer class="foot">${shopWords(ctx, ctx.paper === '58')}</footer>
    ${nafaaLine()}
    ${wantsBack(ctx) ? `<div class="cut">✂ - - - - - - - - - - - - - - -</div><section class="back">${backContent(ctx)}</section>` : ''}
  </div>`;
}

function thermalCss({ paper, setup }: Ctx) {
  const d = setup.design;
  const w = paper === '58' ? 58 : 80;
  const scale = d.font === 'small' ? 0.92 : d.font === 'large' ? 1.12 : 1;
  const base = (paper === '58' ? 11.5 : 13) * scale;
  const modern = d.style === 'modern';
  const bold = d.style === 'bold';
  const names = watermarkNames(d, setup.shop.name) || setup.shop.name;
  return `
  @page { size: ${w}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; color: #000; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: ${base}px; line-height: 1.4; font-weight: 700; -webkit-font-smoothing: none; }
  .paper { width: ${w}mm; margin: 0 auto; padding: ${paper === '58' ? '3mm 2mm' : '4mm 3mm'}; position: relative;
    ${d.thermalPattern ? patternCss(names, '#000', 0.07) : ''} }
  .c { text-align: center; } .b, .strong { font-weight: 900; } .mono { font-family: monospace; letter-spacing: 1px; word-break: break-all; }
  .small { font-size: ${base * 0.84}px; } .sub { font-size: ${base * 0.86}px; }
  .rule { border-top: 1.5px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .row span:last-child { text-align: right; font-weight: 800; white-space: nowrap; }
  .row.strong span { font-weight: 900; }
  .meta .row span:last-child { white-space: normal; word-break: break-word; }
  .head { text-align: center; ${modern ? 'background:#000;color:#fff;padding:6px 4px;border-radius:6px;' : ''} }
  .logo { display: block; margin: 0 auto 4px; height: 44px; max-width: 70%; object-fit: contain; filter: grayscale(1) contrast(1.4); }
  .shop { font-size: ${base * (bold ? 1.7 : 1.5)}px; font-weight: 900; letter-spacing: .2px; }
  .tag { font-style: italic; font-size: ${base * 0.9}px; margin-top: 1px; }
  .meta { margin-top: 6px; }
  .lines .item { margin: 4px 0; } .iname { font-weight: 900; word-break: break-word; } .iq { font-weight: 700; }
  .inote, .idet { font-size: ${base * 0.84}px; padding-left: 8px; }
  .total { display: flex; justify-content: space-between; font-weight: 900; font-size: ${base * (bold ? 1.7 : 1.45)}px; margin: 6px 0;
    ${bold ? 'background:#000;color:#fff;padding:4px 6px;border-radius:4px;' : 'border-top:2.5px solid #000;border-bottom:2.5px solid #000;padding:3px 0;'} }
  .saved { text-align: center; font-weight: 900; margin-top: 6px; border: 1.5px dashed #000; padding: 3px; }
  .box { border: 2px solid #000; padding: 6px 8px; margin: 8px 0; }
  .boxt { font-size: ${base * 0.8}px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
  .big2 { font-size: ${base * 1.12}px; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 3px; }
  .sign { border-top: 1.5px dotted #000; margin-top: 22px; padding-top: 2px; font-size: ${base * 0.8}px; text-align: center; }
  .qr, .code { text-align: center; margin: 6px 0 2px; } .qr svg, .code svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  .pay { border: 2px solid #000; border-radius: 6px; padding: 6px; }
  .pay-h { text-align: center; font-weight: 900; background: #000; color: #fff; margin: -6px -6px 6px; padding: 3px; border-radius: 4px 4px 0 0; }
  .acct { border-bottom: 1px dashed #000; padding: 3px 0; } .acct:last-child { border-bottom: 0; }
  .acct-k { font-size: ${base * 0.8}px; text-transform: uppercase; letter-spacing: .5px; }
  .acct-n { font-size: ${base * 1.15}px; font-weight: 900; letter-spacing: .5px; } .acct-t { font-size: ${base * 0.84}px; }
  .foot { text-align: center; margin-top: 6px; } .msg { font-weight: 800; margin: 3px 0; white-space: pre-line; }
  .terms { list-style: none; font-size: ${base * 0.8}px; margin: 4px 0; text-align: center; } .terms li::before { content: '• '; }
  .thanks { font-weight: 900; margin-top: 4px; font-size: ${base * 1.02}px; }
  .nafaa { text-align: center; margin-top: 8px; padding-top: 4px; font-size: ${base * 0.74}px; line-height: 1.3; border-top: 1.5px dashed #000; }
  .nafaa .nb { display: inline-block; font-weight: 900; font-size: ${base * 0.86}px; letter-spacing: 1px; margin-bottom: 2px; background: #000; color: #fff; padding: 1px 8px; border-radius: 3px; }
  .cut { text-align: center; margin: 10px 0 6px; letter-spacing: 1px; }
  .back-title { text-align: center; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
  .back-list { padding-left: 16px; font-size: ${base * 0.86}px; } .back-list li { margin: 2px 0; }
  .promo { margin-top: 8px; border: 2px solid #000; padding: 5px; text-align: center; font-size: ${base * 0.8}px; }
  .promo-b { font-weight: 900; font-size: ${base}px; letter-spacing: 1px; } .promo-c { font-weight: 900; margin-top: 2px; }
  .stamp { position: absolute; top: 18%; left: 50%; transform: translateX(-50%) rotate(-18deg); border: 3px solid #000;
    font-weight: 900; font-size: ${base * 2}px; padding: 2px 14px; border-radius: 8px; opacity: .5; letter-spacing: 3px; }
  @media screen { body { padding: 12px 0; } }`;
}

/* ───────────────────────── A4 invoice ───────────────────────── */

function a4Status(doc: ReceiptDoc): { text: string; tone: string } {
  if (doc.stamp === 'CANCEL') return { text: 'CANCELLED', tone: '#b91c1c' };
  if (doc.stamp === 'WAPAS') return { text: 'RETURNED', tone: '#b45309' };
  const due = dueOf(doc);
  if (due <= 0) return { text: 'PAID', tone: '#15803d' };
  if (doc.paid > 0) return { text: 'PARTLY PAID', tone: '#b45309' };
  return { text: 'UNPAID', tone: '#b91c1c' };
}

function a4Body(ctx: Ctx) {
  const { doc, setup } = ctx;
  const { shop, design: d } = setup;
  const address = doc.branchAddress || shop.address;
  const phone = doc.branchPhone || shop.phone;
  const due = dueOf(doc);
  const status = a4Status(doc);
  const dueDate = d.dueDays > 0 && due > 0 ? dateOnly(new Date(doc.date.getTime() + d.dueDays * 86_400_000)) : '';
  const lineDisc = doc.lines.some((l) => l.discount);
  const contact = [
    d.showAddress && address ? esc(address) : '',
    d.showPhone && phone ? `Ph ${esc(phone)}` : '', d.showPhone && shop.whatsapp && shop.whatsapp !== phone ? `WA ${esc(shop.whatsapp)}` : '',
    shop.email ? esc(shop.email) : '', d.showTaxNumber && shop.taxNumber ? `${esc(shop.taxLabel || 'NTN')} ${esc(shop.taxNumber)}` : '',
  ].filter(Boolean);

  const brand = `
    <div class="brand">
      ${d.showLogo && shop.logoUrl ? `<img class="logo" src="${esc(shop.logoUrl)}" alt="">` : `<div class="mark">${esc(shop.name.trim().charAt(0).toUpperCase())}</div>`}
      <div>
        <div class="shop">${esc(shop.name)}</div>
        ${shop.legalName && shop.legalName !== shop.name ? `<div class="legal">${esc(shop.legalName)}</div>` : ''}
        ${d.tagline ? `<div class="tag">${esc(d.tagline)}</div>` : ''}
      </div>
    </div>`;
  const title = `
    <div class="title">
      <div class="doc">${esc(d.a4Title || 'INVOICE')}</div>
      <div class="num"># ${esc(doc.saleNumber)}</div>
      ${d.showStatus ? `<div class="status" style="color:${status.tone};border-color:${status.tone}">${status.text}</div>` : ''}
    </div>`;

  const head = d.a4Layout === 'minimal'
    ? `<header class="h-min">${brand.replace('class="brand"', 'class="brand center"')}<div class="contact center">${contact.join(' · ')}</div>${title.replace('class="title"', 'class="title center"')}</header>`
    : `<header class="${d.a4Layout === 'band' ? 'h-band' : 'h-split'}"><div class="h-left">${brand}<div class="contact">${contact.join('<br>')}</div></div>${title}</header>`;

  const billTo = `
    <div class="card">
      <div class="card-k">${esc(doc.partyLabel ?? 'Bill to')}</div>
      <div class="card-name">${esc(d.showCustomer && doc.customerName ? doc.customerName : 'Walk-in customer')}</div>
      ${d.showCustomer && doc.customerPhone ? `<div>${esc(doc.customerPhone)}</div>` : ''}
      ${d.showCustomerDetails && doc.customerAddress ? `<div>${esc(doc.customerAddress)}</div>` : ''}
      ${d.showCustomerDetails && doc.customerTaxId ? `<div>NTN / CNIC: ${esc(doc.customerTaxId)}</div>` : ''}
      ${doc.receivedByName ? `<div class="muted">Le gaya: ${esc(doc.receivedByName)}${doc.receivedByPhone ? ` (${esc(doc.receivedByPhone)})` : ''}</div>` : ''}
    </div>`;
  const facts: ReceiptRowDoc[] = [
    { label: 'Date', value: when(doc.date) },
    ...(dueDate ? [{ label: 'Aakhri date', value: dueDate, bold: true }] : []),
    ...(doc.branchName ? [{ label: 'Branch', value: doc.branchName }] : []),
    ...(d.showCashier && doc.cashierName ? [{ label: 'Cashier', value: doc.cashierName }] : []),
    { label: 'Payment', value: doc.paymentLabel.replace(/^Paid \(|\)$/g, '') },
    ...(doc.infoRows ?? []),
  ];
  const info = `<div class="card"><div class="card-k">Invoice</div>${rowsHtml(facts)}</div>`;

  const table = `
    <table class="items">
      <thead><tr>
        ${d.showItemNumbers ? '<th class="n">#</th>' : ''}<th>Cheez</th>${d.showSku ? '<th>SKU</th>' : ''}
        <th class="r">Quantity</th>${doc.hidePrices ? '' : `<th class="r">Rate</th>${lineDisc ? '<th class="r">Discount</th>' : ''}<th class="r">Amount</th>`}
      </tr></thead>
      <tbody>${doc.lines.map((l, i) => `
        <tr>
          ${d.showItemNumbers ? `<td class="n">${i + 1}</td>` : ''}
          <td><div class="iname">${esc(l.name)}</div>
            ${l.note ? `<div class="inote">${esc(l.note)}</div>` : ''}
            ${d.showItemDetails && l.details?.length ? `<div class="idet">${l.details.map(esc).join(' · ')}</div>` : ''}</td>
          ${d.showSku ? `<td class="mono sm">${esc(l.sku ?? '')}</td>` : ''}
          <td class="r">${esc(l.qty)} ${esc(l.unit)}</td>
          ${doc.hidePrices ? '' : `<td class="r">${money(l.price)}</td>
          ${lineDisc ? `<td class="r">${l.discount ? `−${money(l.discount)}` : '—'}</td>` : ''}
          <td class="r b">${money(l.total)}</td>`}
        </tr>`).join('')}
      </tbody>
    </table>`;

  const terms = lines(d.terms);
  const left = `
    <div class="left">
      ${(doc.boxes ?? []).map((b) => `<div class="card" style="margin-bottom:10px"><div class="card-k">${esc(b.title)}</div>${b.lines.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`).join('')}
      ${d.showAmountInWords && !doc.hidePrices ? `<div class="words"><span class="card-k">Amount in words</span><br>${esc(amountInWords(doc.total))}</div>` : ''}
      ${payBlock(ctx)}
      ${d.footer || doc.footerNote ? `<div class="note">${[doc.footerNote, d.footer].filter(Boolean).map((x) => esc(x)).join('<br>')}</div>` : ''}
      ${terms.length ? `<div class="card-k" style="margin-top:12px">Shartein</div><ul class="terms">${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    </div>`;
  const qtyAll = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const right = doc.hidePrices ? `
    <div class="right">${rowsHtml([{ label: 'Kul cheezein', value: String(doc.lines.length), bold: true }, { label: 'Kul quantity', value: String(Number(qtyAll.toFixed(2))) }])}</div>` : `
    <div class="right">
      ${rowsHtml(totalRows(doc))}
      <div class="total"><span>TOTAL</span><span>${money(doc.total)}</span></div>
      ${rowsHtml(paidRows(doc))}
      ${d.showSavings && doc.discount > 0 ? `<div class="saved">Aap ne ${money(doc.discount)} bachaye</div>` : ''}
      ${khataBox(ctx)}
    </div>`;

  const fiscal = fiscalHtml(doc, true);
  const review = d.showReviewQr ? billReviewUrl() : null;
  const bottom = `
    <div class="bottom">
      ${d.showSignature ? `<div class="signs"><div class="sign">${esc(doc.signLabels?.[0] ?? 'Customer ke dastkhat')}</div><div class="sign">${esc(doc.signLabels?.[1] ?? 'Dukaan ki mohar / dastkhat')}</div></div>` : ''}
      <div class="codes">
        ${fiscal ? `<div>${fiscal}</div>` : ''}
        ${d.showBarcode ? `<div class="code">${barcodeSvg(doc.saleNumber, true)}<div class="mono sm">${esc(doc.saleNumber)}</div></div>` : ''}
        ${review ? `<div class="code">${qrSvg(review, 76)}<div class="sm">Google review ★</div></div>` : ''}
      </div>
      ${d.thanks || d.social ? `<div class="thanks">${esc(d.thanks)}${d.social ? `<span class="sm"> · ${esc(d.social)}</span>` : ''}</div>` : ''}
    </div>`;

  const foot = `
    <footer class="a4foot">
      <span><b>${esc(shop.name)}</b>${phone ? ` · ${esc(phone)}` : ''}</span>
      <span class="nf"><b>${esc(NAFAA.name)}</b> · ${esc(NAFAA.pitch)} · ${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</span>
    </footer>`;

  const page = `
  <div class="page">
    ${doc.stamp ? `<div class="stamp">${esc(doc.stamp)}</div>` : ''}
    ${head}
    <section class="cards">${billTo}${info}</section>
    ${table}
    <section class="sumgrid">${left}${right}</section>
    ${bottom}
    ${foot}
  </div>`;
  const back = wantsBack(ctx) ? `<div class="page back">${backContent(ctx)}${foot}</div>` : '';
  return page + back;
}

function a4Css({ setup }: Ctx) {
  const d = setup.design;
  const ink = d.accent;
  const scale = d.font === 'small' ? 0.93 : d.font === 'large' ? 1.1 : 1;
  const base = 12.5 * scale;
  const names = watermarkNames(d, setup.shop.name);
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; color: #0f172a; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: ${base}px; line-height: 1.45; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 14mm 26mm; position: relative; background: #fff;
    ${names ? patternCss(names, ink, 0.05) : ''} page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .b { font-weight: 700; } .mono { font-family: ui-monospace, Menlo, monospace; } .sm { font-size: ${base * 0.82}px; }
  .muted { color: #64748b; } .center { text-align: center; justify-content: center; }
  .row { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
  .row span:last-child { text-align: right; font-weight: 600; } .row.strong span { font-weight: 800; }
  .brand { display: flex; align-items: center; gap: 12px; } .brand.center { justify-content: center; text-align: left; }
  .logo { height: 58px; max-width: 150px; object-fit: contain; }
  .mark { height: 52px; width: 52px; border-radius: 14px; background: ${ink}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; }
  .shop { font-size: ${base * 1.9}px; font-weight: 800; letter-spacing: -.3px; line-height: 1.1; }
  .legal { color: #475569; } .tag { font-style: italic; color: #475569; margin-top: 2px; }
  .contact { margin-top: 10px; color: #475569; font-size: ${base * 0.9}px; line-height: 1.5; }
  .title { text-align: right; } .title.center { text-align: center; margin-top: 10px; }
  .doc { font-size: ${base * 2.3}px; font-weight: 800; letter-spacing: 4px; color: ${ink}; line-height: 1; }
  .num { font-weight: 700; margin-top: 6px; font-size: ${base * 1.05}px; }
  .status { display: inline-block; margin-top: 8px; border: 2px solid; border-radius: 6px; padding: 2px 10px; font-weight: 800; letter-spacing: 2px; font-size: ${base * 0.85}px; }
  .h-split { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid ${ink}; }
  .h-band { display: flex; justify-content: space-between; gap: 24px; margin: -14mm -14mm 0; padding: 12mm 14mm 10mm; background: ${ink}; color: #fff; }
  .h-band .legal, .h-band .tag, .h-band .contact { color: rgba(255,255,255,.85); } .h-band .doc { color: #fff; }
  .h-band .mark { background: #fff; color: ${ink}; } .h-band .logo { background: #fff; border-radius: 10px; padding: 4px; }
  .h-band .status { background: #fff; }
  .h-min { text-align: center; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0 14px; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: rgba(255,255,255,.85); }
  .card-k { font-size: ${base * 0.75}px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: ${ink}; margin-bottom: 4px; }
  .card-name { font-size: ${base * 1.2}px; font-weight: 700; }
  table.items { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  table.items th { text-align: left; font-size: ${base * 0.78}px; text-transform: uppercase; letter-spacing: .8px; color: #fff; background: ${ink}; padding: 9px 10px; }
  table.items td { padding: 9px 10px; border-top: 1px solid #eef2f7; vertical-align: top; background: rgba(255,255,255,.9); }
  table.items tbody tr:nth-child(even) td { background: rgba(241,245,249,.75); }
  .r { text-align: right; white-space: nowrap; } .n { width: 30px; color: #94a3b8; }
  .iname { font-weight: 600; } .inote, .idet { font-size: ${base * 0.85}px; color: #64748b; margin-top: 2px; }
  .sumgrid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 20px; margin-top: 16px; align-items: start; }
  .right { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: rgba(255,255,255,.9); }
  .total { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: ${base * 1.45}px;
    background: ${ink}; color: #fff; border-radius: 10px; padding: 9px 12px; margin: 8px -4px; }
  .words { font-style: italic; color: #334155; margin-bottom: 10px; }
  .note { margin-top: 10px; padding: 10px 12px; border-left: 3px solid ${ink}; background: rgba(241,245,249,.8); border-radius: 0 8px 8px 0; white-space: pre-line; }
  .terms { padding-left: 16px; color: #475569; font-size: ${base * 0.88}px; } .terms li { margin: 2px 0; }
  .saved { color: #15803d; font-weight: 700; text-align: right; margin-top: 4px; }
  .box { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 8px 10px; margin-top: 10px; }
  .boxt { font-size: ${base * 0.75}px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${ink}; }
  .big2 { border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px; font-size: ${base * 1.08}px; }
  .pay { border: 1.5px solid ${ink}; border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,.92); }
  .pay-h { font-weight: 800; color: ${ink}; margin-bottom: 6px; }
  .accts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .acct { border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; }
  .acct-k { font-size: ${base * 0.72}px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; }
  .acct-n { font-size: ${base * 1.12}px; font-weight: 800; letter-spacing: .3px; } .acct-t { font-size: ${base * 0.82}px; color: #475569; word-break: break-all; }
  .qr { margin-top: 8px; } .qr svg { display: block; } .c { text-align: center; } .small { font-size: ${base * 0.82}px; color: #475569; margin-top: 4px; }
  .bottom { margin-top: 22px; }
  .signs { display: flex; gap: 48px; margin: 26px 0 6px; } .sign { flex: 1; border-top: 1px solid #94a3b8; padding-top: 4px; text-align: center; color: #64748b; font-size: ${base * 0.82}px; }
  .codes { display: flex; gap: 22px; align-items: flex-end; justify-content: flex-end; margin-top: 12px; }
  .code { text-align: center; } .code svg { max-width: 210px; height: auto; display: block; margin: 0 auto; }
  .thanks { text-align: center; font-weight: 700; color: ${ink}; margin-top: 12px; font-size: ${base * 1.1}px; }
  .a4foot { position: absolute; left: 14mm; right: 14mm; bottom: 9mm; display: flex; justify-content: space-between; gap: 12px;
    border-top: 2px solid ${ink}; padding-top: 6px; font-size: ${base * 0.78}px; color: #475569; }
  .a4foot .nf b { color: ${ink}; }
  .stamp { position: absolute; top: 42%; left: 50%; transform: translate(-50%,-50%) rotate(-18deg); border: 4px solid #b91c1c; color: #b91c1c;
    font-weight: 900; font-size: 54px; padding: 4px 24px; border-radius: 12px; opacity: .35; letter-spacing: 6px; }
  .back-title { font-size: ${base * 1.6}px; font-weight: 800; color: ${ink}; border-bottom: 3px solid ${ink}; padding-bottom: 8px; margin-bottom: 14px; }
  .back-list { padding-left: 22px; font-size: ${base * 1.05}px; line-height: 1.7; } .back-list li { margin: 4px 0; }
  .promo { margin-top: 28px; border: 1.5px solid ${ink}; border-radius: 14px; padding: 16px; text-align: center; color: #334155; background: rgba(255,255,255,.9); }
  .promo-b { font-size: ${base * 1.5}px; font-weight: 800; color: ${ink}; letter-spacing: 1px; } .promo-c { font-weight: 800; margin-top: 6px; color: ${ink}; }
  @media screen { body { background: #fff; } }`;
}

/** The whole bill as a document. */
export function renderReceipt(doc: ReceiptDoc, setup: ReceiptSetup, opts: { paper?: ReceiptPaper; copies?: number } = {}): string {
  const paper = opts.paper ?? setup.design.paper;
  const ctx: Ctx = { doc, setup, paper };
  const a4 = paper === 'A4';
  const body = a4 ? a4Body(ctx) : thermalBody(ctx);
  const copies = Math.max(1, Math.min(3, opts.copies ?? 1));
  const pages = Array.from({ length: copies }, (_, i) => (i ? `<div style="page-break-before:always"></div>${body}` : body)).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.saleNumber)}</title><style>${a4 ? a4Css(ctx) : thermalCss(ctx)}</style></head><body>${pages}</body></html>`;
}
