/**
 * Print and CSV for the audit report: the summary with staff risk and the
 * watch list, the event timeline, and the login history. Each is a PrintDoc
 * (A4, PDF or thermal through the shared print button); the CSV is built
 * from the same document so both always match.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import type { AuditEvent, AuditOverview, LoginReport } from './api';
import { ROLE_LABEL, SEVERITY_META, TYPE_META, when } from './meta';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }
interface Head { period: string; shop: string; filters: string }

const R = 'right' as const;

function meta(h: Head): Array<[string, string]> {
  return [['Period', h.period], ['Dukaan', h.shop], ...(h.filters ? [['Filter', h.filters] as [string, string]] : [])];
}

/** Rupee value of an event: sale value, or cost when the type is valued at cost. */
export function eventValue(e: AuditEvent, f: Fmt): string {
  const m = TYPE_META[e.type].money;
  if (m === 'cost') return e.cost != null || f.costHidden ? f.cost(e.cost ?? 0) : '—';
  if (m === 'sale' && e.amount) return f.money(Math.abs(e.amount));
  return '—';
}

export function overviewDoc(d: AuditOverview, f: Fmt, h: Head): PrintDoc {
  const t = d.totals;
  const sections: PrintSection[] = [
    {
      kind: 'rows', title: 'Khulasa', rows: [
        { label: 'Kul waqiyat', value: String(t.events), strong: true },
        { label: 'Zaroor dekhein', value: String(t.high), sub: true },
        { label: 'Dhyan dein', value: String(t.medium), sub: true },
        { label: 'Void bill', value: `${t.voids} · ${f.money(t.voidValue)} (${t.voidRate}%)` },
        { label: 'Return', value: `${t.refunds} · ${f.money(t.refundValue)} (${t.refundRate}%)` },
        { label: 'Cash return', value: `${t.cashRefunds} · ${f.money(t.cashRefundValue)}`, sub: true },
        { label: 'Bari discount', value: `${t.discounts} · ${f.money(t.discountValue)}` },
        { label: 'Drawer kam', value: `${t.shortCount} · ${f.money(t.drawerShort)}` },
        { label: 'Drawer zyada', value: `${t.overCount} · ${f.money(t.drawerOver)}` },
        { label: 'Galle se nikale', value: `${t.cashOuts} · ${f.money(t.cashOutValue)}` },
        ...(f.costHidden ? [] : [{ label: 'Stock ka nuqsan (cost)', value: `${t.losses} · ${f.cost(t.cost ?? 0)}` }]),
        { label: 'Ghalat PIN', value: String(t.pinFailed) },
        { label: 'Nakam login / naye device', value: `${t.failedLogins} / ${t.newDevices}` },
        { label: 'Dukaan ke waqt ke baad', value: String(t.afterHours) },
      ],
    },
  ];
  if (d.watch.length) {
    sections.push({ kind: 'table', title: 'Kya dekhna chahiye', columns: [{ label: 'Baat' }, { label: 'Details', wideOnly: true }], rows: d.watch.map((w) => [w.title, w.text]) });
  }
  sections.push({
    kind: 'table', title: 'Staff ka risk',
    columns: [{ label: 'Naam' }, { label: 'Score', align: R }, { label: 'Bill', align: R, wideOnly: true }, { label: 'Void', align: R }, { label: 'Return', align: R, wideOnly: true }, { label: 'Discount', align: R, wideOnly: true }, { label: 'Drawer kam', align: R, wideOnly: true }],
    rows: d.staff.filter((s) => s.events || s.bills).map((s) => [
      `${s.name}${s.role ? ` (${ROLE_LABEL[s.role] ?? s.role})` : ''}`, String(s.score), String(s.bills), String(s.voids),
      f.money(s.refundValue), f.money(s.discountValue), f.money(s.drawerShort),
    ]),
  });
  sections.push({
    kind: 'table', title: 'Type war',
    columns: [{ label: 'Type' }, { label: 'Ginti', align: R }, { label: 'Zaroori', align: R, wideOnly: true }, { label: 'Amount', align: R }],
    rows: d.byType.map((x) => [TYPE_META[x.type].label, String(x.count), String(x.high), TYPE_META[x.type].money === 'cost' ? (f.costHidden ? f.cost(0) : f.cost(x.cost ?? 0)) : TYPE_META[x.type].money === 'sale' ? f.money(x.amount) : '—']),
  });
  if (d.shops.length > 1) {
    sections.push({
      kind: 'table', title: 'Branch war',
      columns: [{ label: 'Branch' }, { label: 'Waqiyat', align: R }, { label: 'Zaroori', align: R }, { label: 'Void', align: R, wideOnly: true }, { label: 'Drawer kam', align: R, wideOnly: true }],
      rows: d.shops.map((s) => [s.name, String(s.events), String(s.high), String(s.voids), f.money(s.drawerShort)]),
    });
  }
  return { title: 'Nigrani report', subtitle: h.shop, meta: meta(h), sections: sections.filter((s) => s.kind !== 'table' || s.rows.length) };
}

export function eventsDoc(items: AuditEvent[], f: Fmt, h: Head): PrintDoc {
  return {
    title: 'Nigrani — waqiyat',
    subtitle: h.shop,
    meta: [...meta(h), ['Waqiyat', String(items.length)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Waqt' }, { label: 'Type', wideOnly: true }, { label: 'Kya hua' }, { label: 'Kis ne', wideOnly: true }, { label: 'Darja', wideOnly: true }, { label: 'Amount', align: R }],
      rows: items.map((e) => [
        when(e.at), TYPE_META[e.type].label,
        `${e.title}${e.flags.length ? ` — ${e.flags.join(', ')}` : ''}${e.detail ? ` (${e.detail})` : ''}`,
        e.userName ?? '—', SEVERITY_META[e.severity].label, eventValue(e, f),
      ]),
    }],
  };
}

export function loginsDoc(d: LoginReport, h: Head): PrintDoc {
  const t = d.totals;
  return {
    title: 'Nigrani — login',
    subtitle: h.shop,
    meta: [...meta(h), ['Login', String(t.logins)], ['Nakam', String(t.failed)], ['Naye device', String(t.newDevices)]],
    sections: [
      {
        kind: 'table', title: 'Har banda',
        columns: [{ label: 'Naam' }, { label: 'Login', align: R }, { label: 'Nakam', align: R }, { label: 'Naye device', align: R, wideOnly: true }, { label: 'Device', align: R, wideOnly: true }],
        rows: d.people.map((p) => [p.name, String(p.logins), String(p.failed), String(p.newDevices), String(p.devices)]),
      },
      {
        kind: 'table', title: 'Login record',
        columns: [{ label: 'Waqt' }, { label: 'Kaun' }, { label: 'Nateeja' }, { label: 'Device', wideOnly: true }],
        rows: d.items.map((l) => [when(l.createdAt), l.userName, l.success ? (l.isNewDevice ? 'Naya device' : 'Theek') : 'Nakam', [l.deviceName, l.location, l.ipAddress].filter(Boolean).join(' · ')]),
      },
    ].filter((s) => s.rows.length) as PrintSection[],
  };
}

/** The same document as a CSV file: one block per section. */
export function downloadCsv(doc: PrintDoc, file: string) {
  const lines: string[][] = [[doc.title], ...(doc.subtitle ? [[doc.subtitle]] : []), ...(doc.meta ?? []).map(([k, v]) => [k, v])];
  for (const s of doc.sections) {
    lines.push([]);
    if (s.title) lines.push([s.title]);
    if (s.kind === 'rows') s.rows.forEach((r) => lines.push([r.label, r.value]));
    else if (s.kind === 'table') { lines.push(s.columns.map((c) => c.label)); s.rows.forEach((r) => lines.push(r)); if (s.footer) lines.push(s.footer); }
    else lines.push([s.text]);
  }
  const csv = lines.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
