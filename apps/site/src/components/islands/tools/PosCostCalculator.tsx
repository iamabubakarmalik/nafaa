'use client';

/**
 * POS cost calculator island: the total cost of running a POS for 1-3
 * years. Software prices come only from the Plan table (passed in by the
 * server as `plans`); hardware and other costs are typed by the visitor,
 * because the site has no sourced hardware prices. The section 64D tax
 * credit (facts.ts) is an optional, clearly labelled estimate.
 */
import { useMemo, useState } from 'react';
import { POS_MACHINE_CREDIT } from './facts';
import { parseAmount, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, Glyph, InputsPanel, ResultPanel, Segmented, SmallButton, SourceNote, ToolFrame, useToolUsed } from './kit';

export interface PosCostPlan {
  slug: string;
  name: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  trialDays: number;
  maxShops: number;
  tagline?: string;
}

type Billing = 'monthly' | 'quarterly' | 'yearly';
interface Row {
  id: number;
  label: string;
  qty: string;
  price: string;
}

/** Limits at or above this are "no practical limit" in the Plan table. */
const UNLIMITED = 999;

const START_ROWS: Row[] = [
  { id: 1, label: 'Computer, tablet or phone', qty: '1', price: '' },
  { id: 2, label: 'Receipt printer', qty: '1', price: '' },
  { id: 3, label: 'Barcode scanner', qty: '1', price: '' },
  { id: 4, label: 'Cash drawer', qty: '0', price: '' },
];

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function softwareCost(plan: PosCostPlan, billing: Billing, months: number): number {
  if (billing === 'yearly' && plan.priceYearly > 0) return plan.priceYearly * Math.ceil(months / 12);
  if (billing === 'quarterly' && plan.priceQuarterly > 0) return plan.priceQuarterly * Math.ceil(months / 3);
  return plan.priceMonthly * months;
}

export default function PosCostCalculator({ plans }: { plans: PosCostPlan[] }) {
  const used = useToolUsed('pos-cost-calculator');
  const paid = plans.filter((p) => p.priceMonthly > 0).sort((a, b) => a.priceMonthly - b.priceMonthly);
  const trial = plans.find((p) => p.priceMonthly === 0 && p.trialDays > 0);
  const [planSlug, setPlanSlug] = useState(paid[0]?.slug ?? '');
  const [billing, setBilling] = useState<Billing>('monthly');
  const [months, setMonths] = useState('12');
  const [shops, setShops] = useState('1');
  const [counters, setCounters] = useState('1');
  const [rows, setRows] = useState<Row[]>(START_ROWS);
  const [setup, setSetup] = useState('');
  const [monthlyOther, setMonthlyOther] = useState('');
  const [credit, setCredit] = useState(false);

  const plan = paid.find((p) => p.slug === planSlug) ?? paid[0];
  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };
  const updateRow = (id: number, patch: Partial<Row>) => {
    used();
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const r = useMemo(() => {
    const period = Number(months);
    const hardware = rows.reduce((sum, row) => sum + n(row.qty) * n(row.price), 0);
    const software = plan ? softwareCost(plan, billing, period) : 0;
    const other = n(setup) + n(monthlyOther) * period;
    const machines = Math.max(Math.round(n(counters)), 0);
    const taxCredit = credit ? Math.min(hardware, POS_MACHINE_CREDIT.maxPerMachine * machines) : 0;
    const total = hardware + software + other - taxCredit;
    return {
      period,
      hardware: round2(hardware),
      software: round2(software),
      other: round2(other),
      taxCredit: round2(taxCredit),
      total: round2(total),
      perMonth: period ? round2(total / period) : 0,
    };
  }, [rows, plan, billing, months, setup, monthlyOther, counters, credit]);

  const shopsOverLimit = plan && plan.maxShops < UNLIMITED && n(shops) > plan.maxShops;

  if (!plan) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 text-small text-fg-muted">
        Plan prices are not available right now. See the pricing page for current plans.
      </div>
    );
  }

  return (
    <ToolFrame label="POS cost calculator">
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">Software</h3>
          <div className="mt-3 space-y-4">
            <Segmented legend="Nafaa plan" value={plan.slug} onChange={touch(setPlanSlug)} options={paid.map((p) => ({ value: p.slug, label: p.name }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Segmented
                legend="Billing"
                value={billing}
                onChange={touch(setBilling)}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  ...(plan.priceQuarterly > 0 ? [{ value: 'quarterly' as const, label: 'Quarterly' }] : []),
                  ...(plan.priceYearly > 0 ? [{ value: 'yearly' as const, label: 'Yearly' }] : []),
                ]}
              />
              <Segmented
                legend="Period"
                value={months}
                onChange={touch(setMonths)}
                options={[
                  { value: '12', label: '1 year' },
                  { value: '24', label: '2 years' },
                  { value: '36', label: '3 years' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Shops (branches)" inputMode="numeric" value={shops} onChange={touch(setShops)} />
              <Field label="Counters (POS machines)" inputMode="numeric" value={counters} onChange={touch(setCounters)} />
            </div>
            {shopsOverLimit ? (
              <p role="status" className="rounded-md border border-amber-600/25 bg-amber-50 px-3 py-2 text-small text-amber-900 ink:bg-amber-400/10 ink:text-amber-200">
                {plan.name} covers up to {plain(plan.maxShops)} shop{plan.maxShops === 1 ? '' : 's'}. Pick a larger plan for {plain(n(shops))} shops.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-h4 text-fg-strong">Hardware (one time)</h3>
            <p className="text-small text-fg-subtle">Type your quotes</p>
          </div>
          <div className="mt-3 space-y-2">
            <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_8rem_2.25rem] gap-2 text-xs font-medium text-fg-subtle sm:grid">
              <span>Item</span>
              <span>Qty</span>
              <span>Price each</span>
              <span className="sr-only">Remove</span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_8rem_2.25rem]">
                <Field label="Item" hideLabel inputMode="text" value={row.label} onChange={(v) => updateRow(row.id, { label: v })} />
                <Field label={`Quantity of ${row.label || 'item'}`} hideLabel inputMode="numeric" value={row.qty} onChange={(v) => updateRow(row.id, { qty: v })} />
                <Field
                  label={`Price each for ${row.label || 'item'}`}
                  hideLabel
                  prefix="Rs"
                  value={row.price}
                  onChange={(v) => updateRow(row.id, { price: v })}
                  placeholder="0"
                  className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
                />
                <button
                  type="button"
                  aria-label={`Remove ${row.label || 'item'}`}
                  onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                  className="inline-flex h-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong"
                >
                  {Glyph.x}
                </button>
              </div>
            ))}
            <SmallButton
              variant="ghost"
              className="-ml-2"
              onClick={() => setRows((prev) => [...prev, { id: Math.max(0, ...prev.map((r) => r.id)) + 1, label: '', qty: '1', price: '' }])}
            >
              {Glyph.plus} Add item
            </SmallButton>
          </div>
        </div>

        <div>
          <h3 className="text-h4 text-fg-strong">Other costs</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Setup and training (one time)" prefix="Rs" value={setup} onChange={touch(setSetup)} placeholder="0" />
            <Field label="Internet, paper rolls (per month)" prefix="Rs" value={monthlyOther} onChange={touch(setMonthlyOther)} placeholder="0" />
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-small text-fg">
            <input
              type="checkbox"
              checked={credit}
              onChange={(e) => {
                used();
                setCredit(e.target.checked);
              }}
              className="mt-0.5 size-4 rounded border-line-strong accent-brand-700"
            />
            <span>
              Take off the section 64D tax credit for POS machines (lesser of the cost or {rupees(POS_MACHINE_CREDIT.maxPerMachine)} per machine).
              <span className="block text-fg-subtle">For persons integrated with FBR for real-time reporting of sales; check eligibility with your tax adviser.</span>
            </span>
          </label>
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult label={`Total for ${r.period / 12} year${r.period === 12 ? '' : 's'}`} value={rupees(r.total)} note={`About ${rupees(r.perMonth)} a month`} />
        <Breakdown
          className="mt-6"
          rows={[
            { label: `Nafaa ${plan.name}, ${billing}`, value: rupees(r.software) },
            { label: 'Hardware', value: rupees(r.hardware) },
            { label: 'Other costs', value: rupees(r.other) },
            ...(credit ? [{ label: 'Section 64D credit', value: rupees(-r.taxCredit) }] : []),
            { label: 'Total', value: rupees(r.total), strong: true },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          Plan prices are today&apos;s prices from Nafaa&apos;s plan list.
          {trial ? ` Nafaa also has a ${trial.trialDays}-day free trial.` : ''}
        </p>
        {credit ? <SourceNote source={POS_MACHINE_CREDIT.source}>Income Tax Ordinance 2001, section 64D.</SourceNote> : null}
      </ResultPanel>
    </ToolFrame>
  );
}
