'use client';

/**
 * Udhaar (khata) ageing calculator island. The visitor lists what each
 * customer owes and how many days the oldest unpaid amount has waited; the
 * tool groups the money into the same age bands Nafaa's khata book uses
 * (under 7 days, 7-30, 30-90, 90+), shows each band's share and the
 * money-weighted average age, and lists who to call first.
 * Nothing leaves the browser.
 */
import { useMemo, useState } from 'react';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, Glyph, InputsPanel, ResultPanel, SmallButton, ToolFrame, useToolUsed } from './kit';

interface Row {
  id: number;
  name: string;
  amount: string;
  days: string;
}

export const BANDS = [
  { id: 'd0', label: 'Under 7 days', min: 0, max: 7, bar: 'bg-emerald-500' },
  { id: 'd7', label: '7–30 days', min: 7, max: 30, bar: 'bg-amber-400' },
  { id: 'd30', label: '30–90 days', min: 30, max: 90, bar: 'bg-orange-500' },
  { id: 'd90', label: '90+ days', min: 90, max: Infinity, bar: 'bg-rose-600' },
] as const;

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function ageing(rows: { amount: number; days: number }[]) {
  const totals = BANDS.map(() => ({ amount: 0, count: 0 }));
  let total = 0;
  let weighted = 0;
  for (const r of rows) {
    if (r.amount <= 0) continue;
    const i = BANDS.findIndex((b) => r.days >= b.min && r.days < b.max);
    totals[i]!.amount += r.amount;
    totals[i]!.count += 1;
    total += r.amount;
    weighted += r.amount * r.days;
  }
  return { totals: totals.map((t) => ({ ...t, amount: round2(t.amount) })), total: round2(total), averageAge: total > 0 ? weighted / total : 0 };
}

const START: Row[] = [
  { id: 1, name: '', amount: '', days: '' },
  { id: 2, name: '', amount: '', days: '' },
  { id: 3, name: '', amount: '', days: '' },
];

export default function KhataAgeingCalculator() {
  const used = useToolUsed('khata-ageing-calculator');
  const [rows, setRows] = useState<Row[]>(START);

  const update = (id: number, patch: Partial<Row>) => {
    used();
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const parsed = rows.map((r) => ({ ...r, a: n(r.amount), d: n(r.days) }));
  const result = useMemo(() => ageing(parsed.map((r) => ({ amount: r.a, days: r.d }))), [parsed]);
  const old = result.totals[2]!.amount + result.totals[3]!.amount;
  const callFirst = parsed
    .filter((r) => r.a > 0 && r.d >= 30)
    .sort((x, y) => y.d - x.d || y.a - x.a)
    .slice(0, 5);

  return (
    <ToolFrame label="Khata ageing calculator">
      <InputsPanel className="space-y-4">
        <div>
          <h3 className="text-h4 text-fg-strong">Customers who owe you</h3>
          <p className="mt-1 text-small text-fg-subtle">One line per customer: what they owe, and how many days ago the oldest unpaid bill was.</p>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.25rem] gap-2 text-small font-medium text-fg-muted sm:grid">
          <span>Customer</span>
          <span>Owes</span>
          <span>Days</span>
          <span />
        </div>
        <div className="space-y-3 sm:space-y-2">
          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.25rem]">
              <Field label={`Customer ${index + 1}`} hideLabel inputMode="text" placeholder="Name" value={row.name} onChange={(v) => update(row.id, { name: v })} className="col-span-3 sm:col-span-1" />
              <Field label={`Amount owed, customer ${index + 1}`} hideLabel prefix="Rs" placeholder="0" value={row.amount} onChange={(v) => update(row.id, { amount: v })} />
              <Field label={`Days unpaid, customer ${index + 1}`} hideLabel placeholder="Days" inputMode="numeric" value={row.days} onChange={(v) => update(row.id, { days: v })} />
              <button
                type="button"
                aria-label={`Remove customer ${index + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                className="inline-flex h-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong disabled:opacity-40"
              >
                {Glyph.x}
              </button>
            </div>
          ))}
        </div>
        <SmallButton
          variant="ghost"
          className="-ml-2"
          onClick={() => setRows((prev) => [...prev, { id: Math.max(0, ...prev.map((r) => r.id)) + 1, name: '', amount: '', days: '' }])}
        >
          {Glyph.plus} Add customer
        </SmallButton>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label="Total udhaar"
          value={rupees(result.total)}
          note={result.total > 0 ? `${rupees(old)} (${percent((old / result.total) * 100, 0)}) is over 30 days old` : 'Add what customers owe'}
        />
        <div className="mt-6 space-y-3">
          {BANDS.map((band, i) => {
            const t = result.totals[i]!;
            const share = result.total > 0 ? (t.amount / result.total) * 100 : 0;
            return (
              <div key={band.id}>
                <div className="flex items-baseline justify-between gap-3 text-small">
                  <span className="text-fg-muted">
                    {band.label} · {plain(t.count)} {t.count === 1 ? 'customer' : 'customers'}
                  </span>
                  <span className="tabular-nums text-fg-strong">{rupees(t.amount)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                  <div className={`h-full w-[var(--share)] rounded-full ${band.bar}`} style={{ '--share': `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <Breakdown
          className="mt-5"
          rows={[{ label: 'Average age of the money owed', value: result.total > 0 ? `${plain(Math.round(result.averageAge))} days` : '—', strong: true }]}
        />
        {callFirst.length ? (
          <div className="mt-4">
            <p className="text-small font-medium text-fg-strong">Call first</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-small text-fg-muted">
              {callFirst.map((r) => (
                <li key={r.id}>
                  {r.name.trim() || 'Customer'}: {rupees(r.a)}, {plain(r.d)} days
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </ResultPanel>
    </ToolFrame>
  );
}
