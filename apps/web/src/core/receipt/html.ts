/**
 * Renders a bill as one self-contained HTML document: thermal 58/80 mm or
 * A4, in the shop's chosen style. Everything is inline and black-on-white
 * for thermal, so the app's theme (dark mode, accent) never reaches paper.
 * The same document is used for the on-screen preview, printing and PDF.
 */

import JsBarcode from 'jsbarcode';
import { formatPKR } from '@core/lib/format';
import { billQr } from '@core/payments/payQr';
import { qrSvg } from '@core/payments/qrSvg';
import { billReviewUrl } from '@integrations/google/google.api';
import { fiscalFor } from '@integrations/tax-authority/taxAuthority.api';
import { NAFAA } from './setup';
import type { ReceiptDesign, ReceiptDoc, ReceiptPaper, ReceiptRowDoc, ReceiptSetup } from './types';

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

const when = (d: Date) => d.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Faint repeating text for the A4 background. */
function watermarkCss(design: ReceiptDesign, shopName: string): string {
  if (design.watermark === 'none') return '';
  const words = [design.watermark !== 'nafaa' ? shopName : '', design.watermark !== 'shop' ? NAFAA.name : ''].filter(Boolean).join('   •   ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="260"><text x="20" y="150" transform="rotate(-22 310 130)" font-family="Arial" font-size="30" font-weight="700" fill="${design.accent}" fill-opacity="0.06">${esc(words)}</text></svg>`;
  return `background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}");background-repeat:repeat;`;
}

interface Ctx {
  doc: ReceiptDoc;
  setup: ReceiptSetup;
  paper: ReceiptPaper;
}

function money(n: number) { return formatPKR(n); }

function rowsHtml(rows: ReceiptRowDoc[] | undefined) {
  return (rows ?? []).map((r) => `<div class="row${r.bold ? ' strong' : ''}"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('');
}

function header({ doc, setup }: Ctx) {
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

function meta({ doc, setup }: Ctx) {
  const d = setup.design;
  const rows: ReceiptRowDoc[] = [
    { label: 'Bill #', value: doc.saleNumber, bold: true },
    { label: 'Tareekh', value: when(doc.date) },
    ...(d.showCustomer && doc.customerName ? [{ label: 'Customer', value: doc.customerPhone ? `${doc.customerName} (${doc.customerPhone})` : doc.customerName }] : []),
    ...(d.showCashier && doc.cashierName ? [{ label: 'Cashier', value: doc.cashierName }] : []),
    ...(doc.infoRows ?? []),
  ];
  return `<section class="meta">${rowsHtml(rows)}</section>`;
}

function items({ doc, setup, paper }: Ctx) {
  const d = setup.design;
  if (paper === 'A4') {
    return `
    <table class="items">
      <thead><tr>${d.showItemNumbers ? '<th class="n">#</th>' : ''}<th>Cheez</th><th class="r">Miqdar</th><th class="r">Rate</th><th class="r">Raqam</th></tr></thead>
      <tbody>${doc.lines.map((l, i) => `
        <tr>
          ${d.showItemNumbers ? `<td class="n">${i + 1}</td>` : ''}
          <td><div class="iname">${esc(l.name)}</div>
            ${l.note ? `<div class="inote">${esc(l.note)}</div>` : ''}
            ${d.showItemDetails && l.details?.length ? `<div class="idet">${l.details.map(esc).join(' · ')}</div>` : ''}</td>
          <td class="r">${esc(l.qty)} ${esc(l.unit)}</td>
          <td class="r">${money(l.price)}</td>
          <td class="r b">${money(l.total)}${l.discount ? `<div class="save">−${money(l.discount)}</div>` : ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }
  return `<section class="lines">${doc.lines.map((l, i) => `
    <div class="item">
      <div class="iname">${d.showItemNumbers ? `${i + 1}. ` : ''}${esc(l.name)}</div>
      <div class="row"><span class="iq">${esc(l.qty)} ${esc(l.unit)} × ${money(l.price)}</span><span class="b">${money(l.total)}</span></div>
      ${l.discount ? `<div class="row small"><span>Chhoot</span><span>−${money(l.discount)}</span></div>` : ''}
      ${l.note ? `<div class="inote">↳ ${esc(l.note)}</div>` : ''}
      ${d.showItemDetails && l.details?.length ? l.details.map((x) => `<div class="idet">${esc(x)}</div>`).join('') : ''}
    </div>`).join('')}</section>`;
}

function totals({ doc, setup, paper }: Ctx) {
  const d = setup.design;
  const due = Math.max(doc.total - doc.paid, 0);
  const prev = doc.previousDue ?? 0;
  const qty = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const rows: ReceiptRowDoc[] = [
    { label: `Items ${doc.lines.length}${qty !== doc.lines.length ? ` · Miqdar ${Number(qty.toFixed(2))}` : ''}`, value: money(doc.subtotal) },
    ...(doc.discount > 0 ? [{ label: 'Chhoot', value: `−${money(doc.discount)}` }] : []),
    ...((doc.deliveryCharge ?? 0) > 0 ? [{ label: 'Delivery', value: `+${money(doc.deliveryCharge!)}` }] : []),
    ...(doc.extraRows ?? []),
  ];
  const pay: ReceiptRowDoc[] = [
    { label: doc.paymentLabel, value: money(doc.paid) },
    ...(doc.paid > doc.total ? [{ label: 'Wapis (change)', value: money(doc.paid - doc.total), bold: true }] : []),
    ...((doc.riderDelivery ?? 0) > 0 ? [{ label: 'Rider ko dein (delivery)', value: money(doc.riderDelivery!) }, { label: 'Customer dega kul', value: money(doc.total + doc.riderDelivery!), bold: true }] : []),
    ...(due > 0 ? [{ label: 'Udhaar (baqi)', value: money(due), bold: true }] : []),
  ];
  const savings = d.showSavings && doc.discount > 0
    ? `<div class="saved">Aap ne ${money(doc.discount)} bachaye</div>` : '';
  const khata = d.showKhata && prev > 0 ? `
    <section class="box">
      <div class="boxt">Khata — ${esc(doc.customerName || 'Customer')}</div>
      <div class="row"><span>Pichla udhaar</span><span>${money(prev)}</span></div>
      ${due > 0 ? `<div class="row"><span>Is bill ka</span><span>+${money(due)}</span></div>` : ''}
      <div class="row strong big2"><span>Kul udhaar</span><span>${money(prev + due)}</span></div>
    </section>` : '';
  return `
  <section class="sum">
    ${rowsHtml(rows)}
    ${doc.deliveryAddress ? `<div class="small">📍 ${esc(doc.deliveryAddress)}</div>` : ''}
    <div class="total"><span>TOTAL</span><span>${money(doc.total)}</span></div>
    ${paper === 'A4' && d.showAmountInWords ? `<div class="words">${esc(amountInWords(doc.total))}</div>` : ''}
    ${rowsHtml(pay)}
    ${savings}
  </section>
  ${khata}`;
}

function extras({ doc, setup, paper }: Ctx) {
  const d = setup.design;
  const wide = paper !== '58';
  const due = Math.max(doc.total - doc.paid, 0) + (doc.previousDue ?? 0);
  const parts: string[] = [];
  if (doc.receivedByName) {
    parts.push(`<section class="box"><div class="boxt">Maal le jane wala</div><div class="b">${esc(doc.receivedByName)}</div>
      ${doc.receivedByPhone ? `<div class="small">Ph: ${esc(doc.receivedByPhone)}</div>` : ''}<div class="sign">Dastkhat</div></section>`);
  } else if (d.showSignature && paper === 'A4') {
    parts.push('<section class="signs"><div class="sign">Customer ke dastkhat</div><div class="sign">Dukaan ki mohar / dastkhat</div></section>');
  }
  const f = fiscalFor(doc.saleNumber);
  if (f === 'pending') parts.push('<div class="c small">Tax invoice number: network ki wajah se baad me</div>');
  else if (f) {
    parts.push(`<section class="c"><div class="b">${esc(f.label)}</div><div class="mono">${esc(f.fiscalNumber ?? '')}</div>
      <div class="small">Tax ${f.taxRate}% · ${money(f.taxAmount)}</div>${f.qrText ? `<div class="qr">${qrSvg(f.qrText, wide ? 120 : 100)}</div>` : ''}</section>`);
  }
  const q = d.showPayQr && due > 0 ? billQr(due, doc.saleNumber) : null;
  if (q) parts.push(`<section class="c"><div class="b">Baqi ${money(due)} QR se bhejein</div><div class="small">${esc(q.label)} — bank / JazzCash / Easypaisa app</div><div class="qr">${qrSvg(q.text, wide ? 140 : 116)}</div></section>`);
  if (d.showBarcode) parts.push(`<div class="code">${barcodeSvg(doc.saleNumber, wide)}<div class="mono">${esc(doc.saleNumber)}</div></div>`);
  return parts.join('<div class="rule"></div>');
}

function footer({ doc, setup, paper }: Ctx) {
  const d = setup.design;
  const review = d.showReviewQr ? billReviewUrl() : null;
  const terms = d.terms.split('\n').map((t) => t.trim()).filter(Boolean);
  return `
  <footer class="foot">
    ${doc.footerNote ? `<div class="msg">${esc(doc.footerNote)}</div>` : ''}
    ${d.footer ? `<div class="msg">${esc(d.footer)}</div>` : ''}
    ${terms.length ? `<ul class="terms">${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${d.thanks ? `<div class="thanks">${esc(d.thanks)}</div>` : ''}
    ${d.social ? `<div class="small">${esc(d.social)}</div>` : ''}
    ${review ? `<div class="qr">${qrSvg(review, paper === '58' ? 72 : 86)}</div><div class="small">Google par review dein ★</div>` : ''}
  </footer>
  <div class="nafaa">
    <div class="nb">${esc(NAFAA.name)}</div>
    <div>${esc(NAFAA.pitch)} · ${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</div>
  </div>`;
}

function css(ctx: Ctx) {
  const { paper, setup } = ctx;
  const d = setup.design;
  const a4 = paper === 'A4';
  const w = paper === '58' ? 58 : 80;
  const scale = d.font === 'small' ? 0.92 : d.font === 'large' ? 1.12 : 1;
  const base = (a4 ? 13 : paper === '58' ? 11.5 : 13) * scale;
  const ink = a4 ? d.accent : '#000';
  const modern = d.style === 'modern';
  const bold = d.style === 'bold';
  return `
  @page { size: ${a4 ? 'A4' : `${w}mm auto`}; margin: ${a4 ? '10mm' : '0'}; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; color: #000; }
  body { font-family: ${a4 ? "'Inter','Segoe UI',Arial,sans-serif" : 'Arial,Helvetica,sans-serif'}; font-size: ${base}px; line-height: 1.4;
    font-weight: ${a4 ? 400 : 700}; ${a4 ? '' : '-webkit-font-smoothing: none;'} }
  .paper { width: ${a4 ? '100%' : `${w}mm`}; margin: 0 auto; padding: ${a4 ? '0' : paper === '58' ? '3mm 2mm' : '4mm 3mm'}; position: relative;
    ${a4 ? watermarkCss(d, setup.shop.name) : ''} }
  .c { text-align: center; } .b, .strong { font-weight: ${a4 ? 700 : 900}; } .mono { font-family: monospace; letter-spacing: 1px; word-break: break-all; }
  .small { font-size: ${base * 0.84}px; } .sub { font-size: ${base * 0.86}px; ${a4 ? 'color:#475569;' : ''} }
  .rule { border-top: ${a4 ? '1px solid #e2e8f0' : '1.5px dashed #000'}; margin: ${a4 ? '14px 0' : '6px 0'}; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .row span:last-child { text-align: right; font-weight: ${a4 ? 600 : 800}; white-space: nowrap; }
  .row.strong span { font-weight: 900; }
  .meta .row span:last-child { white-space: normal; word-break: break-word; }
  .head { text-align: center; ${modern && !a4 ? 'background:#000;color:#fff;padding:6px 4px;border-radius:6px;' : ''}
    ${a4 ? `display:block;text-align:left;border-bottom:3px solid ${ink};padding-bottom:12px;` : ''} }
  .head .sub, .head .tag { ${modern && !a4 ? 'color:#fff;' : ''} }
  .logo { display: block; ${a4 ? 'float:right;height:64px;max-width:160px;' : 'margin:0 auto 4px;height:44px;max-width:70%;filter:grayscale(1) contrast(1.4);'} object-fit: contain; }
  .shop { font-size: ${base * (a4 ? 2 : bold ? 1.7 : 1.5)}px; font-weight: 900; letter-spacing: .2px; ${a4 ? `color:${ink};` : ''} }
  .tag { font-style: italic; font-size: ${base * 0.9}px; margin-top: 1px; }
  .meta { margin-top: ${a4 ? '14px' : '6px'}; ${a4 ? 'display:grid;grid-template-columns:1fr 1fr;column-gap:32px;' : ''} }
  .lines .item { margin: 4px 0; } .iname { font-weight: 900; word-break: break-word; } .iq { font-weight: 700; }
  .inote, .idet { font-size: ${base * 0.84}px; padding-left: ${a4 ? 0 : 8}px; ${a4 ? 'color:#475569;' : ''} }
  table.items { width: 100%; border-collapse: collapse; margin-top: 12px; }
  table.items th { text-align: left; font-size: ${base * 0.8}px; text-transform: uppercase; letter-spacing: .5px; color: #fff; background: ${ink}; padding: 7px 8px; }
  table.items td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.items tr:nth-child(even) td { background: rgba(15,23,42,.025); }
  .r { text-align: right; white-space: nowrap; } .n { width: 28px; color: #64748b; } .save { font-size: ${base * 0.8}px; color: #16a34a; }
  .sum { ${a4 ? 'margin:12px 0 0 auto;width:46%;' : ''} }
  .total { display: flex; justify-content: space-between; font-weight: 900; font-size: ${base * (bold ? 1.7 : 1.45)}px; margin: 6px 0;
    ${bold || a4 ? `background:${ink};color:#fff;padding:${a4 ? '8px 12px' : '4px 6px'};border-radius:${a4 ? 8 : 4}px;` : `border-top:2.5px solid #000;border-bottom:2.5px solid #000;padding:3px 0;`} }
  .words { font-size: ${base * 0.82}px; font-style: italic; color: #475569; margin-bottom: 6px; text-align: right; }
  .saved { text-align: center; font-weight: 900; margin-top: 6px; ${a4 ? 'color:#16a34a;' : 'border:1.5px dashed #000;padding:3px;'} }
  .box { border: ${a4 ? '1px solid #e2e8f0' : '2px solid #000'}; border-radius: ${a4 ? 8 : 0}px; padding: 6px 8px; margin: 8px 0; }
  .boxt { font-size: ${base * 0.8}px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
  .big2 { font-size: ${base * 1.12}px; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 3px; }
  .sign { border-top: 1.5px dotted #000; margin-top: 22px; padding-top: 2px; font-size: ${base * 0.8}px; text-align: center; }
  .signs { display: flex; gap: 40px; margin-top: 30px; } .signs .sign { flex: 1; }
  .qr, .code { text-align: center; margin: 6px 0 2px; } .qr svg, .code svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  .foot { text-align: center; margin-top: 6px; } .msg { font-weight: 800; margin: 3px 0; white-space: pre-line; }
  .terms { list-style: none; font-size: ${base * 0.8}px; margin: 4px 0; text-align: center; } .terms li::before { content: '• '; }
  .thanks { font-weight: 900; margin-top: 4px; font-size: ${base * 1.02}px; }
  .nafaa { text-align: center; margin-top: 8px; padding: ${a4 ? '8px' : '4px'}; font-size: ${base * 0.74}px; line-height: 1.3;
    ${a4 ? `border-top:1px solid #e2e8f0;color:#475569;` : 'border-top:1.5px dashed #000;'} }
  .nafaa .nb { display: inline-block; font-weight: 900; font-size: ${base * 0.86}px; letter-spacing: 1px; margin-bottom: 2px;
    ${a4 ? `color:${ink};` : 'background:#000;color:#fff;padding:1px 8px;border-radius:3px;'} }
  .stamp { position: absolute; top: ${a4 ? '30%' : '18%'}; left: 50%; transform: translateX(-50%) rotate(-18deg); border: 3px solid #b91c1c;
    color: #b91c1c; font-weight: 900; font-size: ${base * 2}px; padding: 2px 14px; border-radius: 8px; opacity: .55; letter-spacing: 3px; }
  @media screen { body { padding: ${a4 ? '24px' : '12px 0'}; } }`;
}

/** The whole bill as a document. `autoPrint` adds a print call for popups. */
export function renderReceipt(doc: ReceiptDoc, setup: ReceiptSetup, opts: { paper?: ReceiptPaper; copies?: number } = {}): string {
  const paper = opts.paper ?? setup.design.paper;
  const ctx: Ctx = { doc, setup, paper };
  const tail = extras(ctx);
  const body = `
  <div class="paper">
    ${doc.stamp ? `<div class="stamp">${esc(doc.stamp)}</div>` : ''}
    ${header(ctx)}
    ${meta(ctx)}
    <div class="rule"></div>
    ${items(ctx)}
    ${paper === 'A4' ? '' : '<div class="rule"></div>'}
    ${totals(ctx)}
    ${tail ? `<div class="rule"></div>${tail}` : ''}
    ${footer(ctx)}
  </div>`;
  const copies = Math.max(1, Math.min(3, opts.copies ?? 1));
  const pages = Array.from({ length: copies }, (_, i) => (i ? `<div style="page-break-before:always"></div>${body}` : body)).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.saleNumber)}</title><style>${css(ctx)}</style></head><body>${pages}</body></html>`;
}
