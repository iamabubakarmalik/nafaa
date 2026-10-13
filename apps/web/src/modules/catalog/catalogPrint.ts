/**
 * Printed catalogs. `priceListDoc` is a plain rate list for the shared print
 * button (A4, PDF or thermal). `photoCatalogHtml` is an A4 catalog with
 * pictures, in the shop's name, logo and colour from the receipt setup.
 * Neither ever shows cost.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import { NAFAA } from '@core/receipt/setup';
import type { ReceiptShop } from '@core/receipt/types';
import type { CatalogEntry } from './types';

const rate = (e: CatalogEntry) => e.priceNote ?? `${formatPKR(e.price)}${e.per ? ` / ${e.per}` : ''}`;
const facts = (e: CatalogEntry) => [...(e.chips ?? []).map((c) => c.label), ...(e.specs ?? []).slice(0, 2).map(([k, v]) => `${k}: ${v}`)].join(' · ');

function byCategory(entries: CatalogEntry[]) {
  const groups = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    const k = e.category?.name ?? 'Baqi';
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return [...groups.entries()];
}

export function priceListDoc(entries: CatalogEntry[], title: string, subtitle: string): PrintDoc {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  const groups = byCategory(entries);
  for (const [name, list] of groups) {
    if (groups.length > 1) { groupRows.push(rows.length); rows.push([name, '', '']); }
    for (const e of list) rows.push([e.name, facts(e), rate(e)]);
  }
  return {
    title,
    subtitle,
    meta: [['Kul', String(entries.length)], ['Date', new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })]],
    sections: [{ kind: 'table', columns: [{ label: 'Naam' }, { label: 'Details', wideOnly: true }, { label: 'Rate', align: 'right' }], rows, groupRows }],
    footer: 'Rate badal sakte hain — taza rate dukaan se poochein.',
  };
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function photoCatalogHtml(entries: CatalogEntry[], o: { title: string; subtitle: string; shop: ReceiptShop; accent: string }) {
  const contact = [o.shop.phone, o.shop.whatsapp && o.shop.whatsapp !== o.shop.phone ? `WhatsApp ${o.shop.whatsapp}` : null, o.shop.address].filter(Boolean).join(' · ');
  const card = (e: CatalogEntry) => `
    <div class="card">
      <div class="pic">${e.image ? `<img src="${esc(e.image)}" alt="">` : `<span>${esc(e.emoji ?? '')}</span>`}${e.featured ? '<b class="star">★</b>' : ''}</div>
      <div class="body">
        <div class="name">${esc(e.name)}</div>
        ${facts(e) ? `<div class="facts">${esc(facts(e))}</div>` : ''}
        <div class="price">${esc(rate(e))}${e.oldPrice && e.oldPrice > e.price ? ` <s>${esc(formatPKR(e.oldPrice))}</s>` : ''}</div>
      </div>
    </div>`;
  const sections = byCategory(entries).map(([name, list]) => `<h2>${esc(name)}</h2><div class="grid">${list.map(card).join('')}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.shop.name)} — ${esc(o.title)}</title><style>
  @page{size:A4;margin:12mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font:12px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;margin:0}
  header{display:flex;align-items:center;gap:14px;border-bottom:3px solid ${o.accent};padding-bottom:10px;margin-bottom:6px}
  header img{height:52px;max-width:140px;object-fit:contain}
  .shop{font-size:20px;font-weight:800;color:${o.accent}}.muted{color:#64748b;font-size:11px}
  h1{font-size:15px;margin:2px 0 0}
  h2{font-size:13px;color:${o.accent};border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin:14px 0 8px;break-after:avoid}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .card{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;break-inside:avoid}
  .pic{position:relative;height:120px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:40px}
  .pic img{width:100%;height:100%;object-fit:cover}
  .star{position:absolute;top:5px;left:6px;background:#fbbf24;color:#451a03;border-radius:5px;padding:0 5px;font-size:11px}
  .body{padding:6px 8px 8px}.name{font-weight:700;font-size:12.5px}
  .facts{color:#475569;font-size:10.5px;margin-top:2px}
  .price{margin-top:4px;font-weight:800;font-size:13px;color:${o.accent}}.price s{color:#94a3b8;font-weight:500;font-size:11px}
  footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;color:#64748b;font-size:10px}
  </style></head><body>
  <header>${o.shop.logoUrl ? `<img src="${esc(o.shop.logoUrl)}" alt="">` : ''}<div><div class="shop">${esc(o.shop.name)}</div>${contact ? `<div class="muted">${esc(contact)}</div>` : ''}<h1>${esc(o.title)}</h1><div class="muted">${esc(o.subtitle)}</div></div></header>
  ${sections}
  <footer><span>Rate badal sakte hain — taza rate dukaan se poochein.</span><span>${esc(NAFAA.name)} · ${esc(NAFAA.web)}</span></footer>
  </body></html>`;
}
