/**
 * Print and CSV for the customers report. Each tab becomes a PrintDoc (A4,
 * PDF or thermal through the shared print button); the CSV is built from the
 * same document, so both always match.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import type { Cohorts, Debtor, Khata, Loyalty, Overview, SegmentCustomer, SegmentKey, Segments } from './api';
import { SEGMENT_META, SEGMENT_ORDER } from './components/meta';
import { keyLabel, type Formatter } from './components/parts';

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
    title: `${noun} report — khulasa`, subtitle: period,
    meta: [['Dukaan', shop], ['Khareedne wale', String(t.buyers)], ['Naam wali sale', m(t.named)]],
    sections: [
      { kind: 'rows', title: 'Khulasa', rows: [
        { label: 'Khareedne wale (naam ke saath)', value: String(t.buyers) },
        { label: 'Naye', value: `${t.newBuyers} · ${m(t.newNet)}`, sub: true },
        { label: 'Purane', value: `${t.returning} · ${m(t.returningNet)}`, sub: true },
        { label: 'Ek se zyada din aaye', value: `${t.repeat} (${f.pct(t.repeatRate)})` },
        { label: 'Naye register hue', value: String(t.signups) },
        { label: 'Naam wali sale', value: `${m(t.named)} · ${t.namedBills} bill`, strong: true },
        { label: 'Walk-in sale', value: `${m(t.walkIn)} · ${t.walkInBills} bill` },
        { label: 'Naam wali sale ka hissa', value: f.pct(t.namedShare) },
        { label: 'Ausat kharch (har customer)', value: m(t.avgSpend) },
        { label: 'Ausat bill — naam wale / walk-in', value: `${m(t.avgBasket)} / ${m(t.walkInBasket)}` },
        { label: 'Ausat dafa aaye', value: t.avgVisits.toFixed(1) },
        ...(d.frequency.avgDays != null ? [{ label: 'Do visits ke beech ausat din', value: d.frequency.avgDays.toFixed(1) }] : []),
        ...(sc ? [{ label: 'Profit (naam wale)', value: f.cost(t.profit), strong: true }] : []),
      ] },
      table('Sab se zyada kharch', ['Customer', ['Phone', 'w'], ['Din', 'r'], ['Sale', 'r'], ...(sc ? [['Profit', 'rw'] as [string, 'rw']] : [])],
        d.top.spend.map((c) => [c.name, c.phone ?? '', String(c.visits), m(c.net), ...(sc ? [f.cost(c.profit)] : [])])),
      table(d.grouping === 'month' ? 'Mahine war' : 'Din war', ['Date', ['Naye', 'r'], ['Purane', 'r'], ['Naam wali', 'r'], ['Walk-in', 'r']],
        d.trend.filter((x) => x.namedBills || x.walkInBills).map((x) => [keyLabel(x.key), String(x.newBuyers), String(x.returningBuyers), m(x.named), m(x.walkIn)])),
      table('Kitne din aaye', ['Din', ['Customers', 'r'], ['Sale', 'r']], d.visits.map((v) => [v.label, String(v.customers), m(v.net)])),
      ...(d.cities.rows.length ? [table('Shehar', ['Shehar', ['Customers', 'r'], ['Sale', 'r']], d.cities.rows.map((c) => [c.name, String(c.buyers), m(c.net)]))] : []),
      ...(d.branches.length ? [table('Branch', ['Branch', ['Customers', 'r'], ['Naam wali', 'r'], ['Walk-in', 'r']], d.branches.map((b) => [b.name, String(b.buyers), m(b.named), m(b.walkIn)]))] : []),
    ],
  };
}

export function segmentsDoc(d: Segments, { f, shop, noun }: Ctx): PrintDoc {
  return {
    title: `${noun} — groups (RFM)`, subtitle: `Aaj tak · pichle 12 mahine ki sale`,
    meta: [['Dukaan', shop], ['Customers', String(d.customers)], ['Kabhi nahi khareeda', String(d.never)]],
    sections: [
      table('Groups', ['Group', ['Customers', 'r'], ['12 mahine sale', 'r'], ['Hissa', 'rw'], ['Ausat din pehle', 'rw']],
        d.segments.map((s) => [SEGMENT_META[s.key].label, String(s.customers), f.money(s.net), f.pct(s.share), String(s.avgDays)])),
      { kind: 'text', title: 'Group ka matlab', text: SEGMENT_ORDER.map((k) => `${SEGMENT_META[k].label}: ${SEGMENT_META[k].rule}`).join('\n') },
    ],
  };
}

export function segmentListDoc(key: SegmentKey, rows: SegmentCustomer[], { f, shop }: Ctx): PrintDoc {
  const meta = SEGMENT_META[key];
  return {
    title: `Group — ${meta.label}`, subtitle: meta.rule,
    meta: [['Dukaan', shop], ['Customers', String(rows.length)]],
    sections: [
      table('Customers', ['Naam', 'Phone', ['Shehar', 'w'], ['Aakhri dafa', 'w'], ['Din (12 m)', 'r'], ['Sale (12 m)', 'r'], ['Udhaar', 'rw'], ['Points', 'rw']],
        rows.map((c) => [c.name, c.phone ?? '', c.city ?? '', c.lastAt ? f.date(c.lastAt) : f.date(c.joinedAt), String(c.visits), f.money(c.net), c.balance > 0 ? f.money(c.balance) : '', c.points ? String(c.points) : ''])),
      { kind: 'text', title: 'Kya karein', text: meta.action },
    ],
  };
}

export function cohortsDoc(d: Cohorts, { shop, noun }: Ctx): PrintDoc {
  const offsets = Array.from({ length: Math.min(d.months, 7) }, (_, i) => i);
  return {
    title: `${noun} — dobara aane ki sharah`, subtitle: `${keyLabel(d.from)} – ${keyLabel(d.to)}`,
    meta: [['Dukaan', shop], ['Naye customers', String(d.newCustomers)]],
    sections: [
      table('Pehli khareedari ka mahina', ['Mahina', ['Naye', 'r'], ...offsets.slice(1).map((o) => [`+${o} mahina`, 'r'] as [string, 'r'])],
        d.cohorts.map((c) => [keyLabel(c.key), String(c.size), ...offsets.slice(1).map((o) => (c.cells[o] ? `${c.cells[o].pct.toFixed(0)}%` : ''))])),
      table('Ausat', ['Mahina baad', ['Wapas aaye', 'r']], d.curve.slice(1).filter((c) => c.pct != null).map((c) => [`+${c.offset}`, `${c.pct!.toFixed(1)}%`])),
    ],
  };
}

export function khataDoc(d: Khata, rows: Debtor[], { f, period, shop }: Ctx): PrintDoc {
  const t = d.totals;
  const m = f.money;
  return {
    title: 'Udhaar (khata) report', subtitle: period,
    meta: [['Dukaan', shop], ['Kul baqi', m(t.receivable)], ['Kitne logon par', String(t.owing)]],
    sections: [
      { kind: 'rows', title: 'Is period me', rows: [
        { label: 'Shuru me baqi', value: m(t.opening) },
        { label: 'Udhaar diya', value: m(t.given) },
        { label: 'Wasooli', value: m(t.received) },
        { label: 'Return / correction se kam', value: m(t.reduced), sub: true },
        { label: 'Aakhir me baqi', value: m(t.closing), strong: true },
        { label: 'Wasooli ki sharah', value: f.pct(t.collectionRate) },
        ...(t.daysToCollect != null ? [{ label: 'Paisa wapas aane me ausat din', value: String(t.daysToCollect) }] : []),
        { label: 'Advance (customer ka paisa hamare paas)', value: `${m(t.advance)} · ${t.advanceCount}` },
      ] },
      table('Kitna purana', ['Umar', ['Customers', 'r'], ['Amount', 'r']], d.aging.map((a) => [a.label, String(a.customers), m(a.amount)]),
        ['Kul', '', m(d.aging.reduce((s, a) => s + a.amount, 0))]),
      table('Udhaar wale', ['Naam', 'Phone', ['Baqi', 'r'], ['60+ din', 'r'], ['Sab se purana', 'rw'], ['Aakhri wasooli', 'w']],
        rows.map((r) => [r.name, r.phone ?? '', m(r.balance), r.over60 > 0 ? m(r.over60) : '', r.oldestDays != null ? `${r.oldestDays} din` : '', r.lastPaymentAt ? f.date(r.lastPaymentAt) : 'Kabhi nahi'])),
    ],
  };
}

export function loyaltyDoc(d: Loyalty, { f, period, shop }: Ctx): PrintDoc {
  const t = d.totals;
  return {
    title: 'Loyalty points report', subtitle: period,
    meta: [['Dukaan', shop], ['Baqi points', f.count(d.outstanding.points)], ['Un ki qeemat', f.money(d.outstanding.value)]],
    sections: [
      { kind: 'rows', title: 'Is period me', rows: [
        { label: 'Points diye', value: `${f.count(t.issued)} · ${t.earners} customers` },
        { label: 'Points istemal hue', value: `${f.count(t.redeemed)} · ${t.redeemers} customers` },
        { label: 'Points ki discount (Rs)', value: f.money(t.redeemedValue) },
        { label: 'Khatam (expire) hue', value: f.count(t.expired) },
        { label: 'Istemal ki sharah', value: f.pct(t.redeemRate) },
        { label: 'Points wale customers ki sale ka hissa', value: f.pct(t.memberShare) },
        { label: 'Baqi points (dukaan par qarz)', value: `${f.count(d.outstanding.points)} · ${f.money(d.outstanding.value)}`, strong: true },
      ] },
      table('Sab se zyada points', ['Naam', 'Phone', ['Points', 'r'], ['Qeemat', 'r']], d.top.map((c) => [c.name, c.phone ?? '', f.count(c.points), f.money(c.value)])),
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
