/**
 * Renders a bill as one self-contained HTML document: a thermal receipt
 * (58 / 80 mm) or an A4 invoice, in the shop's design. The same renderer as
 * the web (core/receipt/html.ts) so a bill looks the same from either app;
 * words follow the shop's bill language. Every print carries the Nafaa line.
 *
 * Used for printing (system print dialog), PDF sharing and the on-screen
 * preview.
 */

import { formatDateTime, formatPKR } from '@/core/format';
import { barcodeSvg } from './barcode';
import { NAFAA } from './setup';
import { rw, type ReceiptLang } from './words';
import type { PayAccount, ReceiptDesign, ReceiptDoc, ReceiptPaper, ReceiptRowDoc, ReceiptSetup } from './types';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

const when = (d: Date) => formatDateTime(d);
const money = (n: number) => formatPKR(n);
const lines = (text: string) => text.split('\n').map((t) => t.trim()).filter(Boolean);

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
  lang: ReceiptLang;
}

const dueOf = (doc: ReceiptDoc) => Math.max(doc.total - doc.paid, 0);

function rowsHtml(rows: ReceiptRowDoc[] | undefined) {
  return (rows ?? []).map((r) => `<div class="row${r.bold ? ' strong' : ''}"><span>${esc(r.label)}</span><span class="num">${esc(r.value)}</span></div>`).join('');
}

/* ───────────── Payment details ───────────── */

function payBlock({ doc, setup, lang }: Ctx): string {
  const d = setup.design;
  const owed = dueOf(doc) + (doc.previousDue ?? 0);
  const show = d.payWhen === 'always' || (d.payWhen === 'due' && owed > 0);
  const accounts = (d.payAccounts ?? []).filter((a) => a.number?.trim());
  if (!show || !accounts.length) return '';
  const items = accounts.map((a) => `
    <div class="acct">
      <div class="acct-k">${esc(PAY_KIND_LABEL[a.kind] ?? 'Account')}${a.bank ? ` · ${esc(a.bank)}` : ''}</div>
      <div class="acct-n num">${esc(a.number)}</div>
      ${a.title ? `<div class="acct-t">${esc(a.title)}</div>` : ''}
      ${a.iban ? `<div class="acct-t mono">IBAN ${esc(a.iban)}</div>` : ''}
    </div>`).join('');
  return `
  <section class="pay">
    <div class="pay-h">${owed > 0 ? esc(rw(lang, 'payDue', { amount: money(owed) })) : esc(rw(lang, 'payWays'))}</div>
    <div class="accts">${items}</div>
    <div class="small c">${esc(rw(lang, 'payRef', { number: doc.saleNumber }))}${d.payNote ? ` · ${esc(d.payNote)}` : ''}</div>
  </section>`;
}

/* ───────────── The back ───────────── */

function backContent({ setup, lang }: Ctx): string {
  const items = lines(setup.design.backText);
  return `
    <div class="back-title">${esc(setup.shop.name)} — ${esc(rw(lang, 'terms'))}</div>
    ${items.length ? `<ol class="back-list">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
    <div class="promo">
      <div class="promo-b">${esc(NAFAA.name)}</div>
      <div>${esc(rw(lang, 'madeWith', { app: NAFAA.name }))}</div>
      <div class="promo-c">${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</div>
    </div>`;
}

function wantsBack(ctx: Ctx) {
  const d = ctx.setup.design;
  return !!d.backText.trim() && (d.backPrint === 'all' || (d.backPrint === 'a4' && ctx.paper === 'A4'));
}

/* ───────────── Thermal ───────────── */

function tHeader({ doc, setup, lang }: Ctx) {
  const { shop, design: d } = setup;
  const address = doc.branchAddress || shop.address;
  const phone = doc.branchPhone || shop.phone;
  return `
  <header class="head">
    ${d.showLogo && shop.logoUrl ? `<img class="logo" src="${esc(shop.logoUrl)}" alt="">` : ''}
    <div class="shop">${esc(shop.name)}</div>
    ${shop.legalName && shop.legalName !== shop.name ? `<div class="sub">${esc(shop.legalName)}</div>` : ''}
    ${d.tagline ? `<div class="tag">${esc(d.tagline)}</div>` : ''}
    ${doc.branchName ? `<div class="sub">${esc(rw(lang, 'branch'))}: ${esc(doc.branchName)}</div>` : ''}
    ${d.showAddress && address ? `<div class="sub">${esc(address)}</div>` : ''}
    ${d.showPhone && (phone || shop.whatsapp) ? `<div class="sub num">${phone ? `${esc(rw(lang, 'phone'))}: ${esc(phone)}` : ''}${shop.whatsapp && shop.whatsapp !== phone ? `${phone ? ' · ' : ''}WA: ${esc(shop.whatsapp)}` : ''}</div>` : ''}
    ${d.showTaxNumber && shop.taxNumber ? `<div class="sub">${esc(shop.taxLabel || 'NTN')}: ${esc(shop.taxNumber)}</div>` : ''}
  </header>`;
}

function tMeta({ doc, setup, lang }: Ctx) {
  const d = setup.design;
  const rows: ReceiptRowDoc[] = [
    { label: rw(lang, 'bill'), value: doc.saleNumber, bold: true },
    { label: rw(lang, 'date'), value: when(doc.date) },
    ...(d.showCustomer && doc.customerName ? [{ label: rw(lang, 'customer'), value: doc.customerPhone ? `${doc.customerName} (${doc.customerPhone})` : doc.customerName }] : []),
    ...(d.showCashier && doc.cashierName ? [{ label: rw(lang, 'cashier'), value: doc.cashierName }] : []),
    ...(doc.infoRows ?? []),
  ];
  return `<section class="meta">${rowsHtml(rows)}</section>`;
}

function tItems({ doc, setup, lang }: Ctx) {
  const d = setup.design;
  return `<section class="lines">${doc.lines.map((l, i) => `
    <div class="item">
      <div class="iname">${d.showItemNumbers ? `${i + 1}. ` : ''}${esc(l.name)}</div>
      <div class="row"><span class="iq num">${esc(l.qty)} ${esc(l.unit)}${doc.hidePrices ? '' : ` × ${money(l.price)}`}</span>${doc.hidePrices ? '' : `<span class="b num">${money(l.total)}</span>`}</div>
      ${l.discount ? `<div class="row small"><span>${esc(rw(lang, 'discount'))}</span><span class="num">−${money(l.discount)}</span></div>` : ''}
      ${l.note ? `<div class="inote">↳ ${esc(l.note)}</div>` : ''}
      ${d.showItemDetails && l.details?.length ? l.details.map((x) => `<div class="idet">${esc(x)}</div>`).join('') : ''}
    </div>`).join('')}</section>`;
}

function totalRows(doc: ReceiptDoc, lang: ReceiptLang): ReceiptRowDoc[] {
  const qty = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  return [
    { label: `${rw(lang, 'items')} ${doc.lines.length}${qty !== doc.lines.length ? ` · ${rw(lang, 'quantity')} ${Number(qty.toFixed(2))}` : ''}`, value: money(doc.subtotal) },
    ...(doc.discount > 0 ? [{ label: rw(lang, 'discount'), value: `−${money(doc.discount)}` }] : []),
    ...((doc.deliveryCharge ?? 0) > 0 ? [{ label: rw(lang, 'delivery'), value: `+${money(doc.deliveryCharge!)}` }] : []),
    ...(doc.extraRows ?? []),
  ];
}

function paidRows(doc: ReceiptDoc, lang: ReceiptLang): ReceiptRowDoc[] {
  const due = dueOf(doc);
  const parts = doc.payments?.length ? doc.payments.map((p) => ({ label: p.label, value: money(p.amount) })) : [{ label: doc.paymentLabel, value: money(doc.paid) }];
  return [
    ...parts,
    ...(doc.paid > doc.total ? [{ label: rw(lang, 'change'), value: money(doc.paid - doc.total), bold: true }] : []),
    ...((doc.riderDelivery ?? 0) > 0 ? [{ label: rw(lang, 'riderPay'), value: money(doc.riderDelivery!) }, { label: rw(lang, 'customerPays'), value: money(doc.total + doc.riderDelivery!), bold: true }] : []),
    ...(due > 0 ? [{ label: rw(lang, 'due'), value: money(due), bold: true }] : []),
  ];
}

function khataBox({ doc, setup, lang }: Ctx) {
  const prev = doc.previousDue ?? 0;
  const due = dueOf(doc);
  if (!setup.design.showKhata || prev <= 0) return '';
  return `
    <section class="box">
      <div class="boxt">${esc(rw(lang, 'khata'))} — ${esc(doc.customerName || rw(lang, 'customer'))}</div>
      <div class="row"><span>${esc(rw(lang, 'previousDue'))}</span><span class="num">${money(prev)}</span></div>
      ${due > 0 ? `<div class="row"><span>${esc(rw(lang, 'thisBill'))}</span><span class="num">+${money(due)}</span></div>` : ''}
      <div class="row strong big2"><span>${esc(rw(lang, 'totalDue'))}</span><span class="num">${money(prev + due)}</span></div>
    </section>`;
}

function tTotals(ctx: Ctx) {
  const { doc, setup, lang } = ctx;
  if (doc.hidePrices) {
    const qty = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    return `<section class="sum">${rowsHtml([{ label: rw(lang, 'allItems'), value: String(doc.lines.length), bold: true }, { label: rw(lang, 'allQty'), value: String(Number(qty.toFixed(2))) }])}</section>`;
  }
  return `
  <section class="sum">
    ${rowsHtml(totalRows(doc, lang))}
    ${doc.deliveryAddress ? `<div class="small">📍 ${esc(doc.deliveryAddress)}</div>` : ''}
    <div class="total"><span>${esc(rw(lang, 'total'))}</span><span class="num">${money(doc.total)}</span></div>
    ${rowsHtml(paidRows(doc, lang))}
    ${setup.design.showSavings && doc.discount > 0 ? `<div class="saved">${esc(rw(lang, 'saved', { amount: money(doc.discount) }))}</div>` : ''}
  </section>
  ${khataBox(ctx)}`;
}

function tExtras(ctx: Ctx) {
  const { doc, setup, paper, lang } = ctx;
  const parts: string[] = [];
  if (doc.receivedByName) {
    parts.push(`<section class="box"><div class="boxt">${esc(rw(lang, 'receiver'))}</div><div class="b">${esc(doc.receivedByName)}</div>
      ${doc.receivedByPhone ? `<div class="small num">${esc(rw(lang, 'phone'))}: ${esc(doc.receivedByPhone)}</div>` : ''}<div class="sign">${esc(rw(lang, 'signature'))}</div></section>`);
  }
  const pay = payBlock(ctx);
  if (pay) parts.push(pay);
  if (setup.design.showBarcode) parts.push(`<div class="code">${barcodeSvg(doc.saleNumber, paper !== '58')}<div class="mono">${esc(doc.saleNumber)}</div></div>`);
  return parts.join('<div class="rule"></div>');
}

function shopWords({ doc, setup }: Ctx) {
  const d = setup.design;
  const terms = lines(d.terms);
  return `
    ${doc.footerNote ? `<div class="msg">${esc(doc.footerNote)}</div>` : ''}
    ${d.footer ? `<div class="msg">${esc(d.footer)}</div>` : ''}
    ${terms.length ? `<ul class="terms">${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${d.thanks ? `<div class="thanks">${esc(d.thanks)}</div>` : ''}
    ${d.social ? `<div class="small">${esc(d.social)}</div>` : ''}`;
}

const nafaaLine = (lang: ReceiptLang) => `
  <div class="nafaa">
    <div class="nb">${esc(NAFAA.name)}</div>
    <div>${esc(rw(lang, 'pitch'))} · ${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</div>
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
    <footer class="foot">${shopWords(ctx)}</footer>
    ${nafaaLine(ctx.lang)}
    ${wantsBack(ctx) ? `<div class="cut">✂ - - - - - - - - - - - - - - -</div><section class="back">${backContent(ctx)}</section>` : ''}
  </div>`;
}

function thermalCss({ paper, setup, lang }: Ctx) {
  const d = setup.design;
  const w = paper === '58' ? 58 : 80;
  const scale = d.font === 'small' ? 0.92 : d.font === 'large' ? 1.12 : 1;
  const base = (paper === '58' ? 11.5 : 13) * scale;
  const modern = d.style === 'modern';
  const bold = d.style === 'bold';
  const names = watermarkNames(d, setup.shop.name) || setup.shop.name;
  const urdu = lang === 'ur';
  return `
  @page { size: ${w}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; color: #000; }
  body { font-family: ${urdu ? "'Noto Nastaliq Urdu', 'Geeza Pro', " : ''}Arial, Helvetica, sans-serif; font-size: ${base}px; line-height: ${urdu ? 1.7 : 1.4}; font-weight: 700; -webkit-font-smoothing: none; }
  .paper { width: ${w}mm; margin: 0 auto; padding: ${paper === '58' ? '3mm 2mm' : '4mm 3mm'}; position: relative;
    ${d.thermalPattern ? patternCss(names, '#000', 0.07) : ''} }
  .num, .mono { direction: ltr; unicode-bidi: isolate; }
  .c { text-align: center; } .b, .strong { font-weight: 900; } .mono { font-family: monospace; letter-spacing: 1px; word-break: break-all; }
  .small { font-size: ${base * 0.84}px; } .sub { font-size: ${base * 0.86}px; }
  .rule { border-top: 1.5px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .row span:last-child { text-align: end; font-weight: 800; white-space: nowrap; }
  .row.strong span { font-weight: 900; }
  .meta .row span:last-child { white-space: normal; word-break: break-word; }
  .head { text-align: center; ${modern ? 'background:#000;color:#fff;padding:6px 4px;border-radius:6px;' : ''} }
  .logo { display: block; margin: 0 auto 4px; height: 44px; max-width: 70%; object-fit: contain; filter: grayscale(1) contrast(1.4); }
  .shop { font-size: ${base * (bold ? 1.7 : 1.5)}px; font-weight: 900; letter-spacing: .2px; }
  .tag { font-style: italic; font-size: ${base * 0.9}px; margin-top: 1px; }
  .meta { margin-top: 6px; }
  .lines .item { margin: 4px 0; } .iname { font-weight: 900; word-break: break-word; } .iq { font-weight: 700; }
  .inote, .idet { font-size: ${base * 0.84}px; padding-inline-start: 8px; }
  .total { display: flex; justify-content: space-between; font-weight: 900; font-size: ${base * (bold ? 1.7 : 1.45)}px; margin: 6px 0;
    ${bold ? 'background:#000;color:#fff;padding:4px 6px;border-radius:4px;' : 'border-top:2.5px solid #000;border-bottom:2.5px solid #000;padding:3px 0;'} }
  .saved { text-align: center; font-weight: 900; margin-top: 6px; border: 1.5px dashed #000; padding: 3px; }
  .box { border: 2px solid #000; padding: 6px 8px; margin: 8px 0; }
  .boxt { font-size: ${base * 0.8}px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
  .big2 { font-size: ${base * 1.12}px; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 3px; }
  .sign { border-top: 1.5px dotted #000; margin-top: 22px; padding-top: 2px; font-size: ${base * 0.8}px; text-align: center; }
  .code { text-align: center; margin: 6px 0 2px; } .code svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
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
  .back-list { padding-inline-start: 16px; font-size: ${base * 0.86}px; } .back-list li { margin: 2px 0; }
  .promo { margin-top: 8px; border: 2px solid #000; padding: 5px; text-align: center; font-size: ${base * 0.8}px; }
  .promo-b { font-weight: 900; font-size: ${base}px; letter-spacing: 1px; } .promo-c { font-weight: 900; margin-top: 2px; }
  .stamp { position: absolute; top: 18%; left: 50%; transform: translateX(-50%) rotate(-18deg); border: 3px solid #000;
    font-weight: 900; font-size: ${base * 2}px; padding: 2px 14px; border-radius: 8px; opacity: .5; letter-spacing: 3px; }
  @media screen { body { padding: 12px 0; } }`;
}

/* ───────────── A4 invoice ───────────── */

function a4Status(doc: ReceiptDoc, lang: ReceiptLang): { text: string; tone: string } {
  if (doc.stamp === rw(lang, 'stampCancel')) return { text: rw(lang, 'cancelled'), tone: '#b91c1c' };
  if (doc.stamp === rw(lang, 'stampReturn')) return { text: rw(lang, 'returned'), tone: '#b45309' };
  const due = dueOf(doc);
  if (due <= 0) return { text: rw(lang, 'paid'), tone: '#15803d' };
  if (doc.paid > 0) return { text: rw(lang, 'partPaid'), tone: '#b45309' };
  return { text: rw(lang, 'unpaid'), tone: '#b91c1c' };
}

function a4Head(setup: ReceiptSetup, lang: ReceiptLang, o: { address?: string | null; phone?: string | null; title: string; number: string; status?: string }) {
  const { shop, design: d } = setup;
  const { address, phone } = o;
  const contact = [
    d.showAddress && address ? esc(address) : '',
    d.showPhone && phone ? `<span class="num">${esc(rw(lang, 'phone'))} ${esc(phone)}</span>` : '', d.showPhone && shop.whatsapp && shop.whatsapp !== phone ? `<span class="num">WA ${esc(shop.whatsapp)}</span>` : '',
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
      <div class="doc">${esc(o.title)}</div>
      <div class="num"># ${esc(o.number)}</div>
      ${o.status ?? ''}
    </div>`;
  return d.a4Layout === 'minimal'
    ? `<header class="h-min">${brand.replace('class="brand"', 'class="brand center"')}<div class="contact center">${contact.join(' · ')}</div>${title.replace('class="title"', 'class="title center"')}</header>`
    : `<header class="${d.a4Layout === 'band' ? 'h-band' : 'h-split'}"><div class="h-left">${brand}<div class="contact">${contact.join('<br>')}</div></div>${title}</header>`;
}

function a4Foot(setup: ReceiptSetup, lang: ReceiptLang, phone?: string | null) {
  return `
    <footer class="a4foot">
      <span><b>${esc(setup.shop.name)}</b>${phone ? ` · <span class="num">${esc(phone)}</span>` : ''}</span>
      <span class="nf"><b>${esc(NAFAA.name)}</b> · ${esc(rw(lang, 'pitch'))} · ${esc(NAFAA.phone)} · ${esc(NAFAA.web)}</span>
    </footer>`;
}

function a4Body(ctx: Ctx) {
  const { doc, setup, lang } = ctx;
  const { shop, design: d } = setup;
  const address = doc.branchAddress || shop.address;
  const phone = doc.branchPhone || shop.phone;
  const due = dueOf(doc);
  const status = a4Status(doc, lang);
  const dueDate = d.dueDays > 0 && due > 0 ? formatDateTime(new Date(doc.date.getTime() + d.dueDays * 86_400_000)).split(',')[0] : '';
  const lineDisc = doc.lines.some((l) => l.discount);
  const head = a4Head(setup, lang, {
    address, phone, title: d.a4Title || 'INVOICE', number: doc.saleNumber,
    status: d.showStatus ? `<div class="status" style="color:${status.tone};border-color:${status.tone}">${esc(status.text)}</div>` : '',
  });
  const billTo = `
    <div class="card">
      <div class="card-k">${esc(doc.partyLabel ?? rw(lang, 'billTo'))}</div>
      <div class="card-name">${esc(d.showCustomer && doc.customerName ? doc.customerName : rw(lang, 'walkIn'))}</div>
      ${d.showCustomer && doc.customerPhone ? `<div class="num">${esc(doc.customerPhone)}</div>` : ''}
      ${d.showCustomerDetails && doc.customerAddress ? `<div>${esc(doc.customerAddress)}</div>` : ''}
      ${d.showCustomerDetails && doc.customerTaxId ? `<div>NTN / CNIC: ${esc(doc.customerTaxId)}</div>` : ''}
      ${doc.receivedByName ? `<div class="muted">${esc(rw(lang, 'takenBy'))}: ${esc(doc.receivedByName)}${doc.receivedByPhone ? ` (${esc(doc.receivedByPhone)})` : ''}</div>` : ''}
    </div>`;
  const facts: ReceiptRowDoc[] = [
    { label: rw(lang, 'date'), value: when(doc.date) },
    ...(dueDate ? [{ label: rw(lang, 'lastDate'), value: dueDate, bold: true }] : []),
    ...(doc.branchName ? [{ label: rw(lang, 'branch'), value: doc.branchName }] : []),
    ...(d.showCashier && doc.cashierName ? [{ label: rw(lang, 'cashier'), value: doc.cashierName }] : []),
    { label: rw(lang, 'payment'), value: doc.paymentLabel },
    ...(doc.infoRows ?? []),
  ];
  const info = `<div class="card"><div class="card-k">${esc(rw(lang, 'invoice'))}</div>${rowsHtml(facts)}</div>`;
  const table = `
    <table class="items">
      <thead><tr>
        ${d.showItemNumbers ? '<th class="n">#</th>' : ''}<th>${esc(rw(lang, 'item'))}</th>${d.showSku ? '<th>SKU</th>' : ''}
        <th class="r">${esc(rw(lang, 'quantity'))}</th>${doc.hidePrices ? '' : `<th class="r">${esc(rw(lang, 'rate'))}</th>${lineDisc ? `<th class="r">${esc(rw(lang, 'discount'))}</th>` : ''}<th class="r">${esc(rw(lang, 'amount'))}</th>`}
      </tr></thead>
      <tbody>${doc.lines.map((l, i) => `
        <tr>
          ${d.showItemNumbers ? `<td class="n">${i + 1}</td>` : ''}
          <td><div class="iname">${esc(l.name)}</div>
            ${l.note ? `<div class="inote">${esc(l.note)}</div>` : ''}
            ${d.showItemDetails && l.details?.length ? `<div class="idet">${l.details.map(esc).join(' · ')}</div>` : ''}</td>
          ${d.showSku ? `<td class="mono sm">${esc(l.sku ?? '')}</td>` : ''}
          <td class="r num">${esc(l.qty)} ${esc(l.unit)}</td>
          ${doc.hidePrices ? '' : `<td class="r num">${money(l.price)}</td>
          ${lineDisc ? `<td class="r num">${l.discount ? `−${money(l.discount)}` : '—'}</td>` : ''}
          <td class="r b num">${money(l.total)}</td>`}
        </tr>`).join('')}
      </tbody>
    </table>`;
  const terms = lines(d.terms);
  const left = `
    <div class="left">
      ${(doc.boxes ?? []).map((b) => `<div class="card" style="margin-bottom:10px"><div class="card-k">${esc(b.title)}</div>${b.lines.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`).join('')}
      ${d.showAmountInWords && !doc.hidePrices ? `<div class="words"><span class="card-k">${esc(rw(lang, 'inWords'))}</span><br>${esc(amountInWords(doc.total))}</div>` : ''}
      ${payBlock(ctx)}
      ${d.footer || doc.footerNote ? `<div class="note">${[doc.footerNote, d.footer].filter(Boolean).map((x) => esc(x)).join('<br>')}</div>` : ''}
      ${terms.length ? `<div class="card-k" style="margin-top:12px">${esc(rw(lang, 'conditions'))}</div><ul class="terms">${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    </div>`;
  const qtyAll = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const right = doc.hidePrices ? `
    <div class="right">${rowsHtml([{ label: rw(lang, 'allItems'), value: String(doc.lines.length), bold: true }, { label: rw(lang, 'allQty'), value: String(Number(qtyAll.toFixed(2))) }])}</div>` : `
    <div class="right">
      ${rowsHtml(totalRows(doc, lang))}
      <div class="total"><span>${esc(rw(lang, 'total'))}</span><span class="num">${money(doc.total)}</span></div>
      ${rowsHtml(paidRows(doc, lang))}
      ${d.showSavings && doc.discount > 0 ? `<div class="saved">${esc(rw(lang, 'saved', { amount: money(doc.discount) }))}</div>` : ''}
      ${khataBox(ctx)}
    </div>`;
  const bottom = `
    <div class="bottom">
      ${d.showSignature ? `<div class="signs"><div class="sign">${esc(doc.signLabels?.[0] ?? rw(lang, 'customerSign'))}</div><div class="sign">${esc(doc.signLabels?.[1] ?? rw(lang, 'shopSign'))}</div></div>` : ''}
      <div class="codes">
        ${d.showBarcode ? `<div class="code">${barcodeSvg(doc.saleNumber, true)}<div class="mono sm">${esc(doc.saleNumber)}</div></div>` : ''}
      </div>
      ${d.thanks || d.social ? `<div class="thanks">${esc(d.thanks)}${d.social ? `<span class="sm"> · ${esc(d.social)}</span>` : ''}</div>` : ''}
    </div>`;
  const foot = a4Foot(setup, lang, phone);
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

function a4Css({ setup, lang }: Ctx) {
  const d = setup.design;
  const ink = d.accent;
  const scale = d.font === 'small' ? 0.93 : d.font === 'large' ? 1.1 : 1;
  const base = 12.5 * scale;
  const names = watermarkNames(d, setup.shop.name);
  const urdu = lang === 'ur';
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; color: #0f172a; }
  body { font-family: ${urdu ? "'Noto Nastaliq Urdu', 'Geeza Pro', " : ''}'Inter', 'Segoe UI', Arial, sans-serif; font-size: ${base}px; line-height: ${urdu ? 1.75 : 1.45}; }
  .num, .mono { direction: ltr; unicode-bidi: isolate; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 14mm 26mm; position: relative; background: #fff;
    ${names ? patternCss(names, ink, 0.05) : ''} page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .b { font-weight: 700; } .mono { font-family: ui-monospace, Menlo, monospace; } .sm { font-size: ${base * 0.82}px; }
  .muted { color: #64748b; } .center { text-align: center; justify-content: center; }
  .row { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
  .row span:last-child { text-align: end; font-weight: 600; } .row.strong span { font-weight: 800; }
  .brand { display: flex; align-items: center; gap: 12px; } .brand.center { justify-content: center; }
  .logo { height: 58px; max-width: 150px; object-fit: contain; }
  .mark { height: 52px; width: 52px; border-radius: 14px; background: ${ink}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; }
  .shop { font-size: ${base * 1.9}px; font-weight: 800; letter-spacing: -.3px; line-height: 1.1; }
  .legal { color: #475569; } .tag { font-style: italic; color: #475569; margin-top: 2px; }
  .contact { margin-top: 10px; color: #475569; font-size: ${base * 0.9}px; line-height: 1.5; }
  .title { text-align: end; } .title.center { text-align: center; margin-top: 10px; }
  .doc { font-size: ${base * 2.3}px; font-weight: 800; letter-spacing: 4px; color: ${ink}; line-height: 1; }
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
  table.items th { text-align: start; font-size: ${base * 0.78}px; text-transform: uppercase; letter-spacing: .8px; color: #fff; background: ${ink}; padding: 9px 10px; }
  table.items td { padding: 9px 10px; border-top: 1px solid #eef2f7; vertical-align: top; background: rgba(255,255,255,.9); }
  table.items tbody tr:nth-child(even) td { background: rgba(241,245,249,.75); }
  .r { text-align: end; white-space: nowrap; } .n { width: 30px; color: #94a3b8; }
  .iname { font-weight: 600; } .inote, .idet { font-size: ${base * 0.85}px; color: #64748b; margin-top: 2px; }
  .sumgrid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 20px; margin-top: 16px; align-items: start; }
  .right { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: rgba(255,255,255,.9); }
  .total { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: ${base * 1.45}px;
    background: ${ink}; color: #fff; border-radius: 10px; padding: 9px 12px; margin: 8px -4px; }
  .words { font-style: italic; color: #334155; margin-bottom: 10px; }
  .note { margin-top: 10px; padding: 10px 12px; border-inline-start: 3px solid ${ink}; background: rgba(241,245,249,.8); border-radius: 0 8px 8px 0; white-space: pre-line; }
  .terms { padding-inline-start: 16px; color: #475569; font-size: ${base * 0.88}px; } .terms li { margin: 2px 0; }
  .saved { color: #15803d; font-weight: 700; text-align: end; margin-top: 4px; }
  .box { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 8px 10px; margin-top: 10px; }
  .boxt { font-size: ${base * 0.75}px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${ink}; }
  .big2 { border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px; font-size: ${base * 1.08}px; }
  .pay { border: 1.5px solid ${ink}; border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,.92); }
  .pay-h { font-weight: 800; color: ${ink}; margin-bottom: 6px; }
  .accts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .acct { border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; }
  .acct-k { font-size: ${base * 0.72}px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; }
  .acct-n { font-size: ${base * 1.12}px; font-weight: 800; letter-spacing: .3px; } .acct-t { font-size: ${base * 0.82}px; color: #475569; word-break: break-all; }
  .c { text-align: center; } .small { font-size: ${base * 0.82}px; color: #475569; margin-top: 4px; }
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
  .back-list { padding-inline-start: 22px; font-size: ${base * 1.05}px; line-height: 1.7; } .back-list li { margin: 4px 0; }
  .promo { margin-top: 28px; border: 1.5px solid ${ink}; border-radius: 14px; padding: 16px; text-align: center; color: #334155; background: rgba(255,255,255,.9); }
  .promo-b { font-size: ${base * 1.5}px; font-weight: 800; color: ${ink}; letter-spacing: 1px; } .promo-c { font-weight: 800; margin-top: 6px; color: ${ink}; }`;
}

/** The whole bill as an HTML document in the shop's design and bill language. */
export function renderReceipt(doc: ReceiptDoc, setup: ReceiptSetup, opts: { paper?: ReceiptPaper; copies?: number; lang?: ReceiptLang } = {}): string {
  const paper = opts.paper ?? setup.design.paper;
  const lang = opts.lang ?? 'roman';
  const ctx: Ctx = { doc, setup, paper, lang };
  const a4 = paper === 'A4';
  const body = a4 ? a4Body(ctx) : thermalBody(ctx);
  const copies = Math.max(1, Math.min(3, opts.copies ?? 1));
  const pages = Array.from({ length: copies }, (_, i) => (i ? `<div style="page-break-before:always"></div>${body}` : body)).join('');
  return `<!doctype html><html lang="${lang === 'ur' ? 'ur' : 'en'}" dir="${lang === 'ur' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.saleNumber)}</title><style>${a4 ? a4Css(ctx) : thermalCss(ctx)}</style></head><body>${pages}</body></html>`;
}
