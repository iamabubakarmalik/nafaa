/**
 * Print and CSV for the audit report: the summary with staff risk and the
 * watch list, the event timeline, and the login history. Each is a PrintDoc
 * (A4, PDF or thermal through the shared print button); the CSV is built
 * from the same document so both always match.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import type { AuditEvent, AuditOverview, LoginReport } from './api';
import { ROLE_LABEL, SEVERITY_META, TYPE_META, when } from './meta';
import { t as tr } from '@core/i18n';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }
interface Head { period: string; shop: string; filters: string }

const R = 'right' as const;

function meta(h: Head): Array<[string, string]> {
  return [[tr('Period'), h.period], [tr('Dukaan'), h.shop], ...(h.filters ? [[tr('Filter'), h.filters] as [string, string]] : [])];
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
      kind: 'rows', title: tr('Khulasa'), rows: [
        { label: tr('Kul waqiyat'), value: String(t.events), strong: true },
        { label: tr('Zaroor dekhein'), value: String(t.high), sub: true },
        { label: tr('Dhyan dein'), value: String(t.medium), sub: true },
        { label: tr('Void bill'), value: `${t.voids} · ${f.money(t.voidValue)} (${t.voidRate}%)` },
        { label: tr('Return'), value: `${t.refunds} · ${f.money(t.refundValue)} (${t.refundRate}%)` },
        { label: tr('Cash return'), value: `${t.cashRefunds} · ${f.money(t.cashRefundValue)}`, sub: true },
        { label: tr('Bari discount'), value: `${t.discounts} · ${f.money(t.discountValue)}` },
        { label: tr('Drawer kam'), value: `${t.shortCount} · ${f.money(t.drawerShort)}` },
        { label: tr('Drawer zyada'), value: `${t.overCount} · ${f.money(t.drawerOver)}` },
        { label: tr('Galle se nikale'), value: `${t.cashOuts} · ${f.money(t.cashOutValue)}` },
        ...(f.costHidden ? [] : [{ label: tr('Stock ka nuqsan (cost)'), value: `${t.losses} · ${f.cost(t.cost ?? 0)}` }]),
        { label: tr('Ghalat PIN'), value: String(t.pinFailed) },
        { label: tr('Nakam login / naye device'), value: `${t.failedLogins} / ${t.newDevices}` },
        { label: tr('Dukaan ke waqt ke baad'), value: String(t.afterHours) },
      ],
    },
  ];
  if (d.watch.length) {
    sections.push({ kind: 'table', title: tr('Kya dekhna chahiye'), columns: [{ label: tr('Baat') }, { label: tr('Details'), wideOnly: true }], rows: d.watch.map((w) => [w.title, w.text]) });
  }
  sections.push({
    kind: 'table', title: tr('Staff ka risk'),
    columns: [{ label: tr('Naam') }, { label: tr('Score'), align: R }, { label: tr('Bill'), align: R, wideOnly: true }, { label: tr('Void'), align: R }, { label: tr('Return'), align: R, wideOnly: true }, { label: tr('Discount'), align: R, wideOnly: true }, { label: tr('Drawer kam'), align: R, wideOnly: true }],
    rows: d.staff.filter((s) => s.events || s.bills).map((s) => [
      `${s.name}${s.role ? ` (${ROLE_LABEL[s.role] ?? s.role})` : ''}`, String(s.score), String(s.bills), String(s.voids),
      f.money(s.refundValue), f.money(s.discountValue), f.money(s.drawerShort),
    ]),
  });
  sections.push({
    kind: 'table', title: tr('Type war'),
    columns: [{ label: tr('Type') }, { label: tr('Ginti'), align: R }, { label: tr('Zaroori'), align: R, wideOnly: true }, { label: tr('Amount'), align: R }],
    rows: d.byType.map((x) => [TYPE_META[x.type].label, String(x.count), String(x.high), TYPE_META[x.type].money === 'cost' ? (f.costHidden ? f.cost(0) : f.cost(x.cost ?? 0)) : TYPE_META[x.type].money === 'sale' ? f.money(x.amount) : '—']),
  });
  if (d.shops.length > 1) {
    sections.push({
      kind: 'table', title: tr('Branch war'),
      columns: [{ label: tr('Branch') }, { label: tr('Waqiyat'), align: R }, { label: tr('Zaroori'), align: R }, { label: tr('Void'), align: R, wideOnly: true }, { label: tr('Drawer kam'), align: R, wideOnly: true }],
      rows: d.shops.map((s) => [s.name, String(s.events), String(s.high), String(s.voids), f.money(s.drawerShort)]),
    });
  }
  return { title: tr('Nigrani report'), subtitle: h.shop, meta: meta(h), sections: sections.filter((s) => s.kind !== 'table' || s.rows.length) };
}

export function eventsDoc(items: AuditEvent[], f: Fmt, h: Head): PrintDoc {
  return {
    title: tr('Nigrani — waqiyat'),
    subtitle: h.shop,
    meta: [...meta(h), [tr('Waqiyat'), String(items.length)]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Waqt') }, { label: tr('Type'), wideOnly: true }, { label: tr('Kya hua') }, { label: tr('Kis ne'), wideOnly: true }, { label: tr('Darja'), wideOnly: true }, { label: tr('Amount'), align: R }],
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
    title: tr('Nigrani — login'),
    subtitle: h.shop,
    meta: [...meta(h), [tr('Login'), String(t.logins)], [tr('Nakam'), String(t.failed)], [tr('Naye device'), String(t.newDevices)]],
    sections: [
      {
        kind: 'table', title: tr('Har banda'),
        columns: [{ label: tr('Naam') }, { label: tr('Login'), align: R }, { label: tr('Nakam'), align: R }, { label: tr('Naye device'), align: R, wideOnly: true }, { label: tr('Device'), align: R, wideOnly: true }],
        rows: d.people.map((p) => [p.name, String(p.logins), String(p.failed), String(p.newDevices), String(p.devices)]),
      },
      {
        kind: 'table', title: tr('Login record'),
        columns: [{ label: tr('Waqt') }, { label: tr('Kaun') }, { label: tr('Nateeja') }, { label: tr('Device'), wideOnly: true }],
        rows: d.items.map((l) => [when(l.createdAt), l.userName, l.success ? (l.isNewDevice ? tr('Naya device') : tr('Theek')) : tr('Nakam'), [l.deviceName, l.location, l.ipAddress].filter(Boolean).join(' · ')]),
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
