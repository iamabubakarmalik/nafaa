/**
 * Printed and shared documents of the online store: the invoice / packing
 * slip that goes in the parcel (one page per order, in the shop's bill
 * language), courier labels (PDF from the courier, or its link), and CSV
 * files, and Nafaa airway bills (4x6 / A4). Printing uses the system print sheet (AirPrint / Android print);
 * sharing hands a PDF or CSV to WhatsApp, email or Files.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { orderNo, toCsv, type OnlineOrderDetail } from '@nafaa/core/online-store';
import { apiClient } from '@/core/api/client';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { toast } from '@/design';
import { openInApp } from './device';
import type { DocLang } from './messages';
import { apiErrorMessage } from '../api/online';
import { dispatchApi, type Label, type LabelsResult } from '../api/board';
import { barcodeSvg } from '@/core/receipt/barcode';

const rs = (n: number) => formatMoney(n);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const WORDS: Record<DocLang, Record<string, string>> = {
  roman: { invoice: 'INVOICE', ship: 'Bhejna hai', item: 'Cheez', qty: 'Qty', price: 'Qeemat', total: 'Total', items: 'Items', discount: 'Discount', delivery: 'Delivery', bill: 'Bill', cod: 'COD', paid: 'PAID — paisa nahi lena', note: 'Note', thanks: 'Shukriya! Parcel kholne se pehle video bana lein — koi masla ho to isi order # ke saath rabta karein.' },
  en: { invoice: 'INVOICE', ship: 'Ship to', item: 'Item', qty: 'Qty', price: 'Price', total: 'Total', items: 'Items', discount: 'Discount', delivery: 'Delivery', bill: 'Bill', cod: 'COD', paid: 'PAID — collect nothing', note: 'Note', thanks: 'Thank you! Please record a video while opening the parcel — for any issue, contact us with this order #.' },
  ur: { invoice: 'انوائس', ship: 'بھیجنا ہے', item: 'چیز', qty: 'تعداد', price: 'قیمت', total: 'ٹوٹل', items: 'اشیاء', discount: 'ڈسکاؤنٹ', delivery: 'ڈیلیوری', bill: 'بل', cod: 'COD', paid: 'ادا شدہ — رقم نہیں لینی', note: 'نوٹ', thanks: 'شکریہ! پارسل کھولنے سے پہلے ویڈیو بنا لیں — کوئی مسئلہ ہو تو اسی آرڈر # کے ساتھ رابطہ کریں۔' },
};

/** One page per order; fixed ink and px sizes (A4, A5 and 4x6 label printers). */
export function invoicesHtml(orders: OnlineOrderDetail[], shopName: string, lang: DocLang): string {
  const w = WORDS[lang] ?? WORDS.roman;
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const pages = orders.map((o) => {
    const codDue = o.isCod && o.paymentStatus !== 'PAID' ? (o.money?.codDue ?? o.total) : 0;
    const rows = o.lines.map((l) => `
      <tr><td><b>${esc(l.name)}</b>${l.variant || l.sku ? `<div class="m">${esc([l.variant, l.sku].filter(Boolean).join(' · '))}</div>` : ''}</td>
      <td class="c">${esc(l.quantity)}</td><td class="e n">${rs(l.price)}</td><td class="e n"><b>${rs(l.lineTotal)}</b></td></tr>`).join('');
    return `
    <section class="inv">
      <header><div><div class="shop">${esc(shopName || o.integration?.displayName)}</div>${o.integration?.displayName && shopName ? `<div class="m">${esc(o.integration.displayName)}</div>` : ''}</div>
        <div class="e"><div class="h">${w.invoice}</div><div class="num">#${esc(orderNo(o))}</div><div class="m n">${esc(formatDateTime(o.receivedAt))}</div>${o.sale?.saleNumber ? `<div class="m">${w.bill} ${esc(o.sale.saleNumber)}</div>` : ''}</div></header>
      <div class="grid"><div><div class="lbl">${w.ship}</div><div class="cust">${esc(o.customerName)}</div>${o.customerPhone ? `<div class="n"><b>${esc(o.customerPhone)}</b></div>` : ''}<div>${esc([o.customerAddress, o.customerCity].filter(Boolean).join(', '))}</div></div>
        <div class="e">${o.trackingNumber ? `<div class="lbl">${esc(o.courierLabel ?? o.courierName ?? 'Courier')}</div><div class="cn n">${esc(o.trackingNumber)}</div>` : ''}
        <div class="box ${codDue ? '' : 'ok'}">${codDue ? `${w.cod}: <span class="n">${rs(codDue)}</span>` : w.paid}</div></div></div>
      <table><thead><tr><th>${w.item}</th><th class="c">${w.qty}</th><th class="e">${w.price}</th><th class="e">${w.total}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot"><div><span>${w.items}</span><span class="n">${rs(o.subtotal)}</span></div>
        ${o.discount > 0 ? `<div><span>${w.discount}</span><span class="n">− ${rs(o.discount)}</span></div>` : ''}
        ${o.deliveryFee > 0 ? `<div><span>${w.delivery}</span><span class="n">${rs(o.deliveryFee)}</span></div>` : ''}
        <div class="g"><span>${w.total}</span><span class="n">${rs(o.total)}</span></div></div>
      ${o.notes ? `<div class="note"><b>${w.note}:</b> ${esc(o.notes)}</div>` : ''}
      <footer>${w.thanks}</footer>
    </section>`;
  }).join('');
  return `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @page { margin: 10mm; }
    body { font-family: -apple-system, Roboto, 'Noto Naskh Arabic', sans-serif; color: #0f172a; font-size: 13px; margin: 0; }
    .inv { page-break-after: always; padding: 8px 4px; } .inv:last-child { page-break-after: auto; }
    header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
    .shop { font-size: 20px; font-weight: 900; } .h { font-size: 18px; font-weight: 900; } .num { font-family: monospace; font-size: 16px; font-weight: 700; }
    .m { color: #475569; font-size: 12px; } .e { text-align: end; } .c { text-align: center; } .n { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    .grid { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; } .lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .cust { font-size: 16px; font-weight: 700; margin-top: 4px; } .cn { font-family: monospace; font-size: 22px; font-weight: 900; letter-spacing: 1px; }
    .box { display: inline-block; margin-top: 8px; border: 2px solid #0f172a; border-radius: 8px; padding: 6px 12px; font-size: 18px; font-weight: 900; } .box.ok { border-color: #15803d; color: #15803d; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; } th { font-size: 11px; text-transform: uppercase; color: #64748b; text-align: start; border-bottom: 1px solid #cbd5e1; padding: 6px 0; }
    td { border-bottom: 1px solid #f1f5f9; padding: 8px 0; vertical-align: top; }
    .tot { margin-top: 10px; margin-inline-start: auto; width: 260px; } .tot div { display: flex; justify-content: space-between; color: #334155; padding: 2px 0; }
    .tot .g { border-top: 2px solid #0f172a; margin-top: 4px; padding-top: 6px; font-size: 16px; font-weight: 900; color: #0f172a; }
    .note { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; font-size: 12px; }
    footer { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 12px; color: #64748b; }
  </style></head><body>${pages}</body></html>`;
}

async function detailsOf(ids: string[]): Promise<OnlineOrderDetail[]> {
  const res = await Promise.allSettled(ids.slice(0, 100).map((id) => apiClient.get(`/online-orders/${id}`).then((r) => {
    const d = r.data as { data?: OnlineOrderDetail } & OnlineOrderDetail;
    return (d?.data ?? d) as OnlineOrderDetail;
  })));
  return res.filter((r): r is PromiseFulfilledResult<OnlineOrderDetail> => r.status === 'fulfilled').map((r) => r.value);
}

/** Prints the invoice / packing slip of these orders (one page each). */
export async function printInvoices(ids: string[], shopName: string, lang: DocLang, mode: 'print' | 'share' = 'print') {
  try {
    const orders = await detailsOf(ids);
    if (!orders.length) { toast.error(t('Invoice nahi bani')); return; }
    const html = invoicesHtml(orders, shopName, lang);
    if (mode === 'print') { await Print.printAsync({ html }); return; }
    const { uri } = await Print.printToFileAsync({ html });
    const name = `${FileSystem.cacheDirectory}invoice-${orders.length === 1 ? orderNo(orders[0]) : `${orders.length}-orders`}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: name }).catch(() => undefined);
    const file = (await FileSystem.getInfoAsync(name)).exists ? name : uri;
    await Sharing.shareAsync(file, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Invoice') });
  } catch (e) {
    if (!String((e as Error)?.message ?? '').toLowerCase().includes('cancel')) toast.error(apiErrorMessage(e, t('Invoice nahi bani')));
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onloadend = () => resolve(String(reader.result ?? '').replace(/^data:.*?;base64,/, ''));
    reader.readAsDataURL(blob);
  });
}

async function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => resolve('');
    reader.readAsText(blob);
  });
}

/** Errors come back as a blob too; read the JSON message out of it. */
async function blobError(e: unknown): Promise<unknown> {
  const r = (e as { response?: { data?: unknown } })?.response;
  if (r?.data instanceof Blob) {
    try { r.data = JSON.parse(await blobText(r.data)); } catch { /* keep as is */ }
  }
  return e;
}

/**
 * A courier label: PostEx and others answer with a PDF, Leopards with a
 * link. PDFs open the print sheet (or the share sheet); links open in the app's browser.
 */
async function openLabelResponse(blob: Blob, fileName: string, mode: 'print' | 'share') {
  if (String(blob.type).includes('pdf')) {
    const path = `${FileSystem.cacheDirectory}${fileName}.pdf`;
    await FileSystem.writeAsStringAsync(path, await blobToBase64(blob), { encoding: FileSystem.EncodingType.Base64 });
    if (mode === 'share') await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Courier label') });
    else await Print.printAsync({ uri: path });
    return;
  }
  const json = JSON.parse(await blobText(blob)) as { data?: { url?: string }; url?: string };
  const url = json?.data?.url ?? json?.url;
  if (!url) throw new Error(t('Label nahi mila'));
  await openInApp(url);
}

export async function openCourierLabel(orderId: string, number: string, mode: 'print' | 'share' = 'print') {
  try {
    const r = await apiClient.get(`/online-orders/${orderId}/courier/label`, { responseType: 'blob', timeout: 60_000 });
    await openLabelResponse(r.data as Blob, `label-${number}`, mode);
  } catch (e) {
    toast.error(apiErrorMessage(await blobError(e), t('Label nahi khula')));
  }
}

/** Several labels of one courier in one file. */
export async function openCourierLabels(code: string, trackingNumbers: string[], mode: 'print' | 'share' = 'print') {
  try {
    const r = await apiClient.post(`/online-store/couriers/${code}/labels`, { trackingNumbers }, { responseType: 'blob', timeout: 120_000 });
    await openLabelResponse(r.data as Blob, `labels-${code.toLowerCase()}-${trackingNumbers.length}`, mode);
  } catch (e) {
    toast.error(apiErrorMessage(await blobError(e), t('Labels nahi khule')));
  }
}

/** Daraz shipping label of a Daraz order. */
export async function openDarazLabel(orderId: string, number: string) {
  try {
    const r = await apiClient.get(`/online-orders/${orderId}/daraz/label`, { responseType: 'blob', timeout: 60_000 });
    await openLabelResponse(r.data as Blob, `daraz-${number}`, 'print');
  } catch (e) {
    toast.error(apiErrorMessage(await blobError(e), t('Label nahi khula')));
  }
}

/** Saves rows as a CSV file and opens the share sheet (Excel, WhatsApp, email, Files). */
export async function shareCsv(fileName: string, rows: unknown[][]) {
  try {
    const path = `${FileSystem.cacheDirectory}${fileName.replace(/[^\w.-]+/g, '-')}`;
    await FileSystem.writeAsStringAsync(path, toCsv(rows), { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: fileName });
  } catch (e) {
    toast.error(apiErrorMessage(e, t('CSV nahi bani')));
  }
}

/** One airway bill (Nafaa label) with the CN barcode, COD, customer, items and the shop's return address. */
function labelHtml(l: Label, from: LabelsResult['from'], a4: boolean): string {
  const code = l.trackingNumber || l.barcode || l.number;
  return `<div class="lbl${a4 ? ' a4' : ''}">
  <div class="top"><b>${esc(l.courierName ?? l.courierCode ?? '')}</b><span>#${esc(l.number)}</span></div>
  <div class="bc">${barcodeSvg(code, true)}<div class="cn">${esc(code)}</div></div>
  <div class="cod">${l.prepaid ? 'PREPAID' : `COD ${esc(rs(l.cod))}`}</div>
  <div class="to"><small>TO</small><b>${esc(l.customerName)}</b><div>${esc(l.customerPhone)}</div><div>${esc(l.address)}</div><b>${esc(l.city)}</b></div>
  <div class="items">${l.lines.map(esc).join('<br/>')}${l.moreItems ? `<br/>+${l.moreItems}` : ''}</div>
  <div class="meta">${l.pieces} pc${l.weightKg ? ` · ${l.weightKg} kg` : ''}${l.notes ? ` · ${esc(l.notes)}` : ''}</div>
  <div class="from"><small>FROM</small> ${esc(from.name)} · ${esc(from.phone)}<br/>${esc(from.address)}</div>
</div>`;
}

function labelsHtml(r: LabelsResult): string {
  const a4 = r.size === 'A4';
  const css = `@page{size:${a4 ? 'A4' : '4in 6in'};margin:${a4 ? '8mm' : '0'}}body{font-family:-apple-system,Roboto,sans-serif;margin:0;color:#000}
.lbl{width:4in;height:6in;box-sizing:border-box;padding:10px;border:1px solid #000;page-break-after:always;display:flex;flex-direction:column;gap:6px;font-size:12px}
.lbl.a4{width:100%;height:auto;min-height:88mm;page-break-after:auto;page-break-inside:avoid;margin-bottom:6mm}
.top{display:flex;justify-content:space-between;font-size:14px}.bc{text-align:center}.bc svg{max-width:100%;height:56px}.cn{font-family:monospace;font-size:15px;font-weight:700}
.cod{font-size:20px;font-weight:800;text-align:center;border:2px solid #000;padding:4px}.to b{display:block;font-size:14px}.to small,.from small{font-weight:700;color:#444}
.items{border-top:1px dashed #000;padding-top:4px}.meta{color:#333}.from{border-top:1px solid #000;padding-top:4px;margin-top:auto;font-size:11px}`;
  return `<html><head><meta charset="utf-8"/><style>${css}</style></head><body>${r.labels.map((l) => labelHtml(l, r.from, a4)).join('')}</body></html>`;
}

/**
 * Airway bills of these orders. One order with the courier's own label
 * link opens that link; otherwise Nafaa labels (4x6 thermal or A4, as set
 * on the web dispatch page) go to the print sheet or the share sheet.
 */
export async function printLabels(ids: string[], mode: 'print' | 'share' = 'print') {
  try {
    const r = await dispatchApi.labels(ids);
    if (!r.labels.length) { toast.error(t('Label nahi mila')); return; }
    if (r.labels.length === 1 && r.labels[0].courierLabelUrl) { await openInApp(r.labels[0].courierLabelUrl); return; }
    const html = labelsHtml(r);
    if (mode === 'print') { await Print.printAsync({ html }); return; }
    const { uri } = await Print.printToFileAsync({ html, width: r.size === 'A4' ? 595 : 288, height: r.size === 'A4' ? 842 : 432 });
    const name = `${FileSystem.cacheDirectory}labels-${r.labels.length === 1 ? r.labels[0].number : `${r.labels.length}-orders`}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: name }).catch(() => undefined);
    const file = (await FileSystem.getInfoAsync(name)).exists ? name : uri;
    await Sharing.shareAsync(file, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Labels') });
  } catch (e) {
    if (!String((e as Error)?.message ?? '').toLowerCase().includes('cancel')) toast.error(apiErrorMessage(e, t('Labels nahi khule')));
  }
}
