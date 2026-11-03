/**
 * Report documents: one structure (title, summary figures, tables) turned
 * into a PDF page (HTML) or CSV rows, so every report shares the same
 * export. The page follows the reading direction of the app language.
 */

import { currentLocale } from '@/core/i18n';
import { esc, shareCsv, sharePdf } from './share';

export interface DocTable { heading: string; columns: string[]; rows: Array<Array<string | number | null | undefined>>; foot?: Array<string | number> }
export interface ReportDoc {
  title: string;
  subtitle?: string;
  /** Label and value pairs shown at the top. */
  summary?: Array<[string, string]>;
  tables?: DocTable[];
  notes?: string[];
  fileName: string;
}

export function docHtml(doc: ReportDoc): string {
  const rtl = currentLocale() === 'ur';
  const css = `
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f172a;padding:24px;direction:${rtl ? 'rtl' : 'ltr'}}
    h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 6px}p.sub{color:#64748b;margin:2px 0 14px;font-size:12px}
    .kpis{display:flex;flex-wrap:wrap;gap:8px}.k{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;min-width:130px}
    .k b{display:block;font-size:15px;direction:ltr;unicode-bidi:isolate}.k span{font-size:11px;color:#64748b}
    table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f1f5f9;text-align:start;padding:6px;border-bottom:1px solid #cbd5e1}
    td{padding:6px;border-bottom:1px solid #e2e8f0}td.n{direction:ltr;text-align:end;unicode-bidi:isolate}tfoot td{font-weight:700;border-top:1px solid #94a3b8}
    .note{font-size:11px;color:#64748b;margin-top:8px}.brand{margin-top:24px;font-size:10px;color:#94a3b8}`;
  const kpis = doc.summary?.length ? `<div class="kpis">${doc.summary.map(([l, v]) => `<div class="k"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : '';
  const isNum = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && /^[-+]?(Rs\s?)?[\d.,]+[%KLCr\s]*$/.test(v.trim()));
  const tables = (doc.tables ?? []).map((tb) => `<h2>${esc(tb.heading)}</h2><table><thead><tr>${tb.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
    tb.rows.map((r) => `<tr>${r.map((c, i) => `<td${i > 0 && isNum(c) ? ' class="n"' : ''}>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')
  }</tbody>${tb.foot ? `<tfoot><tr>${tb.foot.map((c, i) => `<td${i > 0 ? ' class="n"' : ''}>${esc(c)}</td>`).join('')}</tr></tfoot>` : ''}</table>`).join('');
  const notes = (doc.notes ?? []).map((n) => `<p class="note">${esc(n)}</p>`).join('');
  return `<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><style>${css}</style></head><body><h1>${esc(doc.title)}</h1><p class="sub">${esc(doc.subtitle ?? '')}</p>${kpis}${tables}${notes}<p class="brand">Nafaa</p></body></html>`;
}

export function docCsv(doc: ReportDoc): unknown[][] {
  const rows: unknown[][] = [[doc.title], [doc.subtitle ?? ''], []];
  for (const [l, v] of doc.summary ?? []) rows.push([l, v]);
  for (const tb of doc.tables ?? []) {
    rows.push([], [tb.heading], tb.columns, ...tb.rows.map((r) => r.map((c) => c ?? '')));
    if (tb.foot) rows.push(tb.foot);
  }
  return rows;
}

export const sharePdfDoc = (doc: ReportDoc) => sharePdf(doc.fileName, docHtml(doc), doc.title);
export const shareCsvDoc = (doc: ReportDoc) => shareCsv(doc.fileName, docCsv(doc), doc.title);
