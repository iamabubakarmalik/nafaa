/**
 * Documents of the service packs (prescription, lab result, folio, job card,
 * quote, membership card, commission slip): one data shape turned into an A4
 * page for print, a PDF for the share sheet and plain text for WhatsApp. Words
 * follow the shop's bill language, not the app language, and the page carries
 * the shop's own name and contact.
 */

import * as Print from 'expo-print';
import { MessageCircle, Printer, Share2 } from 'lucide-react-native';
import { Linking } from 'react-native';
import { t } from '@/core/i18n';
import { NAFAA, getReceiptSetup, useBillLanguage, waNumber, type ReceiptLang } from '@/core/receipt';
import { esc } from '@/core/receipt/html';
import { IconButton, Row, toast } from '@/design';
import { sharePdf } from '@/modules/reports/lib/share';

/** A word in the shop's bill language: English, Urdu script or Roman Urdu. */
export const L = (lang: ReceiptLang, en: string, ur: string, roman: string = en) => (lang === 'ur' ? ur : lang === 'roman' ? roman : en);

export interface PackDocTable { heading?: string; columns: string[]; rows: Array<Array<string | number | null | undefined>>; foot?: Array<string | number> }
export interface PackDoc {
  fileName: string;
  title: string;
  subtitle?: string;
  /** Facts under the title (patient, date, doctor). */
  meta?: Array<[string, string]>;
  /** Label and value lines; `strong` rows are totals. */
  rows?: Array<[string, string] | [string, string, 'strong']>;
  tables?: PackDocTable[];
  notes?: string[];
}

export function packDocHtml(doc: PackDoc, lang: ReceiptLang): string {
  const shop = getReceiptSetup().shop;
  const rtl = lang === 'ur';
  const css = `body{font-family:-apple-system,'Geeza Pro',Helvetica,Arial,sans-serif;color:#0f172a;padding:28px;direction:${rtl ? 'rtl' : 'ltr'}}
    .shop{border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:14px}.shop b{font-size:18px}.shop p{margin:2px 0;font-size:11px;color:#475569}
    h1{font-size:17px;margin:0}p.sub{color:#64748b;margin:2px 0 10px;font-size:12px}
    .meta{display:flex;flex-wrap:wrap;gap:6px 22px;margin:8px 0 12px;font-size:12px}.meta span{color:#64748b}
    table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0 10px}th{background:#f1f5f9;text-align:start;padding:6px;border-bottom:1px solid #cbd5e1}
    td{padding:6px;border-bottom:1px solid #e2e8f0}tfoot td{font-weight:700;border-top:1px solid #94a3b8}h2{font-size:13px;margin:14px 0 4px}
    .r{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px dashed #e2e8f0}.r.s{font-weight:700;font-size:14px}.r i{font-style:normal;direction:ltr;unicode-bidi:isolate}
    .note{font-size:11px;color:#64748b;margin:6px 0}.brand{margin-top:22px;font-size:10px;color:#94a3b8;text-align:center}`;
  const meta = doc.meta?.length ? `<div class="meta">${doc.meta.map(([k, v]) => `<div><span>${esc(k)}: </span><b>${esc(v)}</b></div>`).join('')}</div>` : '';
  const rows = (doc.rows ?? []).map((r) => `<div class="r${r[2] ? ' s' : ''}"><span>${esc(r[0])}</span><i>${esc(r[1])}</i></div>`).join('');
  const tables = (doc.tables ?? []).map((tb) => `${tb.heading ? `<h2>${esc(tb.heading)}</h2>` : ''}<table><thead><tr>${tb.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
    tb.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>${tb.foot ? `<tfoot><tr>${tb.foot.map((c) => `<td>${esc(c)}</td>`).join('')}</tr></tfoot>` : ''}</table>`).join('');
  const notes = (doc.notes ?? []).map((n) => `<p class="note">${esc(n)}</p>`).join('');
  return `<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><style>${css}</style></head><body>
    <div class="shop"><b>${esc(shop.name)}</b>${shop.address ? `<p>${esc(shop.address)}</p>` : ''}${shop.phone ? `<p dir="ltr">${esc(shop.phone)}</p>` : ''}</div>
    <h1>${esc(doc.title)}</h1><p class="sub">${esc(doc.subtitle ?? '')}</p>${meta}${rows}${tables}${notes}<p class="brand">${esc(NAFAA.name)} · ${esc(NAFAA.phone)}</p></body></html>`;
}

export function packDocText(doc: PackDoc): string {
  const shop = getReceiptSetup().shop.name;
  const out = [`*${shop}*`, `*${doc.title}*${doc.subtitle ? ` · ${doc.subtitle}` : ''}`];
  for (const [k, v] of doc.meta ?? []) out.push(`${k}: ${v}`);
  for (const r of doc.rows ?? []) out.push(`${r[0]}: ${r[1]}`);
  for (const tb of doc.tables ?? []) {
    if (tb.heading) out.push('', `*${tb.heading}*`);
    for (const r of tb.rows) out.push(`• ${r.filter((c) => c !== null && c !== undefined && c !== '').join(' · ')}`);
  }
  for (const n of doc.notes ?? []) out.push('', n);
  return out.join('\n');
}

export const sharePackPdf = (doc: PackDoc, lang: ReceiptLang) => sharePdf(doc.fileName, packDocHtml(doc, lang), doc.title);
export const printPackDoc = (doc: PackDoc, lang: ReceiptLang) => Print.printAsync({ html: packDocHtml(doc, lang) });
export async function whatsAppPackDoc(doc: PackDoc, phone?: string | null) {
  const n = waNumber(phone);
  await Linking.openURL(`https://wa.me/${n}?text=${encodeURIComponent(packDocText(doc))}`);
}

/** Print, PDF share and WhatsApp for one document. `build` gets the shop's bill language and runs when a button is pressed. */
export function DocActions({ build, phone, disabled }: { build: (lang: ReceiptLang) => PackDoc | null; phone?: string | null; disabled?: boolean }) {
  const lang = useBillLanguage();
  const run = (fn: (d: PackDoc) => Promise<unknown>) => async () => {
    const d = build(lang);
    if (!d) return;
    try { await fn(d); } catch { toast.error(t('File nahi bani, dobara koshish karein')); }
  };
  return (
    <Row gap={1}>
      <IconButton icon={Printer} label={t('Print')} disabled={disabled} onPress={run((d) => printPackDoc(d, lang))} />
      <IconButton icon={Share2} label={t('Share')} disabled={disabled} onPress={run((d) => sharePackPdf(d, lang))} />
      <IconButton icon={MessageCircle} label={t('WhatsApp')} disabled={disabled} onPress={run((d) => whatsAppPackDoc(d, phone))} />
    </Row>
  );
}
