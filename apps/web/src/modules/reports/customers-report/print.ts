/**
 * Print and CSV for the customers report. Each tab becomes a PrintDoc (A4,
 * PDF or thermal through the shared print button); the CSV is built from the
 * same document, so both always match.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import type { Cohorts, Debtor, Khata, Loyalty, Overview, SegmentCustomer, SegmentKey, Segments } from './api';
import { SEGMENT_META, SEGMENT_ORDER } from './components/meta';
import { keyLabel, type Formatter } from './components/parts';
import { t as tr } from '@core/i18n';

interface Ctx { f: Formatter; period: string; shop: string; noun: string }

const R = 'right' as const;

function table(title: string, head: Array<string | [string, 'r' | 'w' | 'rw']>, rows: string[][], footer?: string[]): PrintSection {
  return {
    kind: 'table', title,
    columns: head.map((h) => (typeof h === 'string' ? { label: h } : { label: h[0], ...(h[1].includes('r') && { align: R }), ...(h[1].includes('w') && { wideOnly: true }) })),
    rows, footer,
  };
}

export function overviewDoc(d: Overview, { f, period, shop, noun }: Ctx): PrintDoc {
  const t = d.totals;
  const sc = !f.costHidden && t.profit != null;
  const m = f.money;
  return {
    title: tr('{{noun}} report — khulasa', { noun }), subtitle: period,
    meta: [[tr('Dukaan'), shop], [tr('Khareedne wale'), String(t.buyers)], [tr('Naam wali sale'), m(t.named)]],
    sections: [
      { kind: 'rows', title: tr('Khulasa'), rows: [
        { label: tr('Khareedne wale (naam ke saath)'), value: String(t.buyers) },
        { label: tr('Naye'), value: `${t.newBuyers} · ${m(t.newNet)}`, sub: true },
        { label: tr('Purane'), value: `${t.returning} · ${m(t.returningNet)}`, sub: true },
        { label: tr('Ek se zyada din aaye'), value: `${t.repeat} (${f.pct(t.repeatRate)})` },
        { label: tr('Naye register hue'), value: String(t.signups) },
        { label: tr('Naam wali sale'), value: `${m(t.named)} · ${t.namedBills} bill`, strong: true },
        { label: tr('Walk-in sale'), value: `${m(t.walkIn)} · ${t.walkInBills} bill` },
        { label: tr('Naam wali sale ka hissa'), value: f.pct(t.namedShare) },
        { label: tr('Ausat kharch (har customer)'), value: m(t.avgSpend) },
        { label: tr('Ausat bill — naam wale / walk-in'), value: `${m(t.avgBasket)} / ${m(t.walkInBasket)}` },
        { label: tr('Ausat dafa aaye'), value: t.avgVisits.toFixed(1) },
        ...(d.frequency.avgDays != null ? [{ label: tr('Do visits ke beech ausat din'), value: d.frequency.avgDays.toFixed(1) }] : []),
        ...(sc ? [{ label: tr('Profit (naam wale)'), value: f.cost(t.profit), strong: true }] : []),
      ] },
      table(tr('Sab se zyada kharch'), [tr('Customer'), [tr('Phone'), 'w'], [tr('Din'), 'r'], [tr('Sale'), 'r'], ...(sc ? [[tr('Profit'), 'rw'] as [string, 'rw']] : [])],
        d.top.spend.map((c) => [c.name, c.phone ?? '', String(c.visits), m(c.net), ...(sc ? [f.cost(c.profit)] : [])])),
      table(d.grouping === 'month' ? tr('Mahine war') : tr('Din war'), [tr('Date'), [tr('Naye'), 'r'], [tr('Purane'), 'r'], [tr('Naam wali'), 'r'], [tr('Walk-in'), 'r']],
        d.trend.filter((x) => x.namedBills || x.walkInBills).map((x) => [keyLabel(x.key), String(x.newBuyers), String(x.returningBuyers), m(x.named), m(x.walkIn)])),
      table(tr('Kitne din aaye'), [tr('Din'), [tr('Customers'), 'r'], [tr('Sale'), 'r']], d.visits.map((v) => [v.label, String(v.customers), m(v.net)])),
      ...(d.cities.rows.length ? [table(tr('Shehar'), [tr('Shehar'), [tr('Customers'), 'r'], [tr('Sale'), 'r']], d.cities.rows.map((c) => [c.name, String(c.buyers), m(c.net)]))] : []),
      ...(d.branches.length ? [table(tr('Branch'), [tr('Branch'), [tr('Customers'), 'r'], [tr('Naam wali'), 'r'], [tr('Walk-in'), 'r']], d.branches.map((b) => [b.name, String(b.buyers), m(b.named), m(b.walkIn)]))] : []),
    ],
  };
}

export function segmentsDoc(d: Segments, { f, shop, noun }: Ctx): PrintDoc {
  return {
    title: tr('{{noun}} — groups (RFM)', { noun }), subtitle: tr('Aaj tak · pichle 12 mahine ki sale'),
    meta: [[tr('Dukaan'), shop], [tr('Customers'), String(d.customers)], [tr('Kabhi nahi khareeda'), String(d.never)]],
    sections: [
      table(tr('Groups'), [tr('Group'), [tr('Customers'), 'r'], [tr('12 mahine sale'), 'r'], [tr('Hissa'), 'rw'], [tr('Ausat din pehle'), 'rw']],
        d.segments.map((s) => [SEGMENT_META[s.key].label, String(s.customers), f.money(s.net), f.pct(s.share), String(s.avgDays)])),
      { kind: 'text', title: tr('Group ka matlab'), text: SEGMENT_ORDER.map((k) => `${SEGMENT_META[k].label}: ${SEGMENT_META[k].rule}`).join('\n') },
    ],
  };
}

export function segmentListDoc(key: SegmentKey, rows: SegmentCustomer[], { f, shop }: Ctx): PrintDoc {
  const meta = SEGMENT_META[key];
  return {
    title: tr('Group — {{label}}', { label: meta.label }), subtitle: meta.rule,
    meta: [[tr('Dukaan'), shop], [tr('Customers'), String(rows.length)]],
    sections: [
      table(tr('Customers'), [tr('Naam'), tr('Phone'), [tr('Shehar'), 'w'], [tr('Aakhri dafa'), 'w'], [tr('Din (12 m)'), 'r'], [tr('Sale (12 m)'), 'r'], [tr('Udhaar'), 'rw'], [tr('Points'), 'rw']],
        rows.map((c) => [c.name, c.phone ?? '', c.city ?? '', c.lastAt ? f.date(c.lastAt) : f.date(c.joinedAt), String(c.visits), f.money(c.net), c.balance > 0 ? f.money(c.balance) : '', c.points ? String(c.points) : ''])),
      { kind: 'text', title: tr('Kya karein'), text: meta.action },
    ],
  };
}

export function cohortsDoc(d: Cohorts, { shop, noun }: Ctx): PrintDoc {
  const offsets = Array.from({ length: Math.min(d.months, 7) }, (_, i) => i);
  return {
    title: tr('{{noun}} — dobara aane ki sharah', { noun }), subtitle: `${keyLabel(d.from)} – ${keyLabel(d.to)}`,
    meta: [[tr('Dukaan'), shop], [tr('Naye customers'), String(d.newCustomers)]],
    sections: [
      table(tr('Pehli khareedari ka mahina'), [tr('Mahina'), [tr('Naye'), 'r'], ...offsets.slice(1).map((o) => [`+${o} mahina`, 'r'] as [string, 'r'])],
        d.cohorts.map((c) => [keyLabel(c.key), String(c.size), ...offsets.slice(1).map((o) => (c.cells[o] ? `${c.cells[o].pct.toFixed(0)}%` : ''))])),
      table(tr('Ausat'), [tr('Mahina baad'), [tr('Wapas aaye'), 'r']], d.curve.slice(1).filter((c) => c.pct != null).map((c) => [`+${c.offset}`, `${c.pct!.toFixed(1)}%`])),
    ],
  };
}

export function khataDoc(d: Khata, rows: Debtor[], { f, period, shop }: Ctx): PrintDoc {
  const t = d.totals;
  const m = f.money;
  return {
    title: tr('Udhaar (khata) report'), subtitle: period,
    meta: [[tr('Dukaan'), shop], [tr('Kul baqi'), m(t.receivable)], [tr('Kitne logon par'), String(t.owing)]],
    sections: [
      { kind: 'rows', title: tr('Is period me'), rows: [
        { label: tr('Shuru me baqi'), value: m(t.opening) },
        { label: tr('Udhaar diya'), value: m(t.given) },
        { label: tr('Wasooli'), value: m(t.received) },
        { label: tr('Return / correction se kam'), value: m(t.reduced), sub: true },
        { label: tr('Aakhir me baqi'), value: m(t.closing), strong: true },
        { label: tr('Wasooli ki sharah'), value: f.pct(t.collectionRate) },
        ...(t.daysToCollect != null ? [{ label: tr('Paisa wapas aane me ausat din'), value: String(t.daysToCollect) }] : []),
        { label: tr('Advance (customer ka paisa hamare paas)'), value: `${m(t.advance)} · ${t.advanceCount}` },
      ] },
      table(tr('Kitna purana'), [tr('Umar'), [tr('Customers'), 'r'], [tr('Amount'), 'r']], d.aging.map((a) => [a.label, String(a.customers), m(a.amount)]),
        [tr('Kul'), '', m(d.aging.reduce((s, a) => s + a.amount, 0))]),
      table(tr('Udhaar wale'), [tr('Naam'), tr('Phone'), [tr('Baqi'), 'r'], ['60+ din', 'r'], [tr('Sab se purana'), 'rw'], [tr('Aakhri wasooli'), 'w']],
        rows.map((r) => [r.name, r.phone ?? '', m(r.balance), r.over60 > 0 ? m(r.over60) : '', r.oldestDays != null ? `${r.oldestDays} din` : '', r.lastPaymentAt ? f.date(r.lastPaymentAt) : tr('Kabhi nahi')])),
    ],
  };
}

export function loyaltyDoc(d: Loyalty, { f, period, shop }: Ctx): PrintDoc {
  const t = d.totals;
  return {
    title: tr('Loyalty points report'), subtitle: period,
    meta: [[tr('Dukaan'), shop], [tr('Baqi points'), f.count(d.outstanding.points)], [tr('Un ki qeemat'), f.money(d.outstanding.value)]],
    sections: [
      { kind: 'rows', title: tr('Is period me'), rows: [
        { label: tr('Points diye'), value: `${f.count(t.issued)} · ${t.earners} customers` },
        { label: tr('Points istemal hue'), value: `${f.count(t.redeemed)} · ${t.redeemers} customers` },
        { label: tr('Points ki discount (Rs)'), value: f.money(t.redeemedValue) },
        { label: tr('Khatam (expire) hue'), value: f.count(t.expired) },
        { label: tr('Istemal ki sharah'), value: f.pct(t.redeemRate) },
        { label: tr('Points wale customers ki sale ka hissa'), value: f.pct(t.memberShare) },
        { label: tr('Baqi points (dukaan par qarz)'), value: `${f.count(d.outstanding.points)} · ${f.money(d.outstanding.value)}`, strong: true },
      ] },
      table(tr('Sab se zyada points'), [tr('Naam'), tr('Phone'), [tr('Points'), 'r'], [tr('Qeemat'), 'r']], d.top.map((c) => [c.name, c.phone ?? '', f.count(c.points), f.money(c.value)])),
    ],
  };
}

export function downloadCsv(doc: PrintDoc, file: string) {
  const lines: string[][] = [[doc.title], ...(doc.subtitle ? [[doc.subtitle]] : []), ...(doc.meta ?? []).map(([k, v]) => [k, v])];
  for (const s of doc.sections) {
    lines.push([]);
    if (s.title) lines.push([s.title]);
    if (s.kind === 'rows') s.rows.forEach((r) => lines.push([r.label, r.value]));
    else if (s.kind === 'table') { lines.push(s.columns.map((c) => c.label)); s.rows.forEach((r) => lines.push(r)); if (s.footer) lines.push(s.footer); }
    else s.text.split('\n').forEach((l) => lines.push([l]));
  }
  const csv = lines.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
