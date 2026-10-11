/** PrintDoc → HTML (A4 or thermal) and → ESC/POS bytes. */

import { EscPos } from '@core/hardware/escpos';
import type { BusinessHeader, PrintDoc, PrintFormat, PrintSection } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const A4_CSS = `
  @page{size:A4;margin:14mm}
  *{box-sizing:border-box}
  body{font:12.5px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;margin:0}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px}
  .biz{font-size:15px;font-weight:700}.muted{color:#64748b;font-size:11.5px}
  .logo{height:44px;max-width:120px;object-fit:contain}
  h1{font-size:19px;margin:0 0 2px}.sub{color:#475569;margin:0 0 10px}
  .meta{display:flex;flex-wrap:wrap;gap:4px 18px;margin-bottom:6px;font-size:11.5px;color:#334155}
  .meta b{color:#0f172a;font-weight:600}
  h2{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin:18px 0 6px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;color:#475569;font-weight:600;border-bottom:1.5px solid #cbd5e1;padding:5px 6px}
  td{padding:5px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  tr.strong td{font-weight:700;border-top:1.5px solid #0f172a;border-bottom:none}
  tr.group td{background:#f1f5f9;font-weight:600}
  tr.subrow td:first-child{padding-left:18px;color:#475569}
  tfoot td{font-weight:700;border-top:1.5px solid #0f172a;border-bottom:none}
  .text{white-space:pre-wrap}
  footer{margin-top:22px;padding-top:8px;border-top:1px solid #e2e8f0;color:#64748b;font-size:10.5px;display:flex;justify-content:space-between}
`;

const thermalCss = (mm: '80' | '58') => `
  @page{size:${mm}mm auto;margin:0}
  *{box-sizing:border-box}
  body{width:${mm === '80' ? 72 : 48}mm;margin:0 auto;padding:3mm 0;font:${mm === '80' ? 11.5 : 10.5}px/1.35 "Courier New",ui-monospace,monospace;color:#000}
  .c{text-align:center}.biz{font-weight:700;font-size:1.25em}
  h1{font-size:1.15em;margin:6px 0 0;text-align:center}.sub{text-align:center;margin:0 0 4px}
  hr{border:0;border-top:1px dashed #000;margin:5px 0}
  h2{font-size:1em;margin:6px 0 2px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse}td,th{padding:1px 0;vertical-align:top;text-align:left;font-weight:normal}
  .r{text-align:right;white-space:nowrap;padding-left:6px}
  tr.strong td{font-weight:700;border-top:1px dashed #000;padding-top:3px}
  tr.group td{font-weight:700;padding-top:4px}
  tr.subrow td:first-child{padding-left:8px}
  th{border-bottom:1px dashed #000;font-weight:700}
  tfoot td{font-weight:700;border-top:1px dashed #000}
  .text{white-space:pre-wrap}.foot{text-align:center;margin-top:6px}
`;

function sectionHtml(s: PrintSection, thermal: boolean) {
  const title = s.title ? `<h2>${esc(s.title)}</h2>` : '';
  if (s.kind === 'text') return `${title}<div class="text">${esc(s.text)}</div>`;
  if (s.kind === 'rows') {
    const rows = s.rows.map((r) =>
      `<tr class="${r.strong ? 'strong' : r.sub ? 'subrow' : ''}"><td>${esc(r.label)}</td><td class="r">${esc(r.value)}</td></tr>`).join('');
    return `${title}<table>${rows}</table>`;
  }
  const keep = s.columns.map((c, i) => (!thermal || !c.wideOnly ? i : -1)).filter((i) => i >= 0);
  const cell = (v: string, i: number, tag = 'td') => `<${tag}${s.columns[i].align === 'right' ? ' class="r"' : ''}>${esc(v)}</${tag}>`;
  const head = `<thead><tr>${keep.map((i) => cell(s.columns[i].label, i, 'th')).join('')}</tr></thead>`;
  const groups = new Set(s.groupRows ?? []);
  const body = s.rows.map((r, ri) => `<tr${groups.has(ri) ? ' class="group"' : ''}>${keep.map((i) => cell(r[i] ?? '', i)).join('')}</tr>`).join('');
  const foot = s.footer ? `<tfoot><tr>${keep.map((i) => cell(s.footer![i] ?? '', i)).join('')}</tr></tfoot>` : '';
  return `${title}<table>${head}<tbody>${body}</tbody>${foot}</table>`;
}

export function renderHtml(doc: PrintDoc, format: PrintFormat, biz: BusinessHeader) {
  const printed = new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  if (format === 'a4') {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>${A4_CSS}</style></head><body>
<header><div><div class="biz">${esc(biz.name)}</div>${biz.address ? `<div class="muted">${esc(biz.address)}</div>` : ''}${biz.phone ? `<div class="muted">${esc(biz.phone)}</div>` : ''}</div>
${biz.logoUrl ? `<img class="logo" src="${esc(biz.logoUrl)}" alt="">` : ''}</header>
<h1>${esc(doc.title)}</h1>${doc.subtitle ? `<p class="sub">${esc(doc.subtitle)}</p>` : ''}
${doc.meta?.length ? `<div class="meta">${doc.meta.map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join('')}</div>` : ''}
${doc.sections.map((s) => sectionHtml(s, false)).join('')}
<footer><span>${esc(doc.footer ?? '')}</span><span>Printed ${esc(printed)} · Nafaa</span></footer>
</body></html>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>${thermalCss(format)}</style></head><body>
<div class="c biz">${esc(biz.name)}</div>${biz.address ? `<div class="c">${esc(biz.address)}</div>` : ''}${biz.phone ? `<div class="c">${esc(biz.phone)}</div>` : ''}
<hr><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<p class="sub">${esc(doc.subtitle)}</p>` : ''}
${doc.meta?.map(([k, v]) => `<div>${esc(k)}: ${esc(v)}</div>`).join('') ?? ''}
<hr>${doc.sections.map((s) => sectionHtml(s, true)).join('')}
<hr><div class="foot">${esc(doc.footer ?? '')}${doc.footer ? '<br>' : ''}${esc(printed)}</div>
</body></html>`;
}

export function renderEscPos(doc: PrintDoc, width: '80' | '58', biz: BusinessHeader) {
  const e = new EscPos(width === '80' ? 48 : 32);
  e.align('center').bold(true).size(2).line(biz.name).size(1).bold(false);
  if (biz.address) e.wrap(biz.address);
  if (biz.phone) e.line(biz.phone);
  e.rule().bold(true).line(doc.title).bold(false);
  if (doc.subtitle) e.wrap(doc.subtitle);
  e.align('left');
  doc.meta?.forEach(([k, v]) => e.row(k, v));
  e.rule();
  for (const s of doc.sections) {
    if (s.title) e.bold(true).line(s.title.toUpperCase()).bold(false);
    if (s.kind === 'text') e.wrap(s.text);
    else if (s.kind === 'rows') {
      s.rows.forEach((r) => {
        if (r.strong) e.rule();
        e.bold(!!r.strong).row(r.sub ? `  ${r.label}` : r.label, r.value).bold(false);
      });
    } else {
      const keep = s.columns.map((c, i) => (c.wideOnly ? -1 : i)).filter((i) => i >= 0);
      const groups = new Set(s.groupRows ?? []);
      // First kept column is the label; the rest are joined on the right.
      const line = (r: string[], bold = false) => {
        const [first, ...rest] = keep;
        e.bold(bold).row(r[first] ?? '', rest.map((i) => r[i] ?? '').filter(Boolean).join('  ')).bold(false);
      };
      s.rows.forEach((r, i) => line(r, groups.has(i)));
      if (s.footer) { e.rule(); line(s.footer, true); }
    }
    e.feed(1);
  }
  if (doc.footer) e.align('center').wrap(doc.footer);
  return e.cut().bytes();
}
