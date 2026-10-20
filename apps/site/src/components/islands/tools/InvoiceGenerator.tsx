'use client';

/**
 * Invoice generator island: fill in the business, the customer and the
 * items, see the invoice as it will print, then print it or save it as PDF
 * from the browser's print dialog. Everything stays in the browser; only
 * the business details are remembered on this device (localStorage).
 *
 * It is a plain invoice, not an FBR fiscal invoice (those carry an FBR
 * invoice number and QR code from an integrated POS), and says so.
 */
import { useEffect, useState } from 'react';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { Field, Glyph, InputsPanel, Segmented, SmallButton, ToolFrame, useToolUsed } from './kit';
import styles from './tools.module.css';

interface Item {
  id: number;
  description: string;
  qty: string;
  rate: string;
}

interface Business {
  name: string;
  address: string;
  phone: string;
  taxId: string;
}

const STORE_KEY = 'nafaa_tool_invoice_business';
const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

function today(): string {
  // Asia/Karachi calendar date, since the server and many browsers run in other zones.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
}

function displayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

export function invoiceTotals(items: { qty: number; rate: number }[], discount: { mode: 'amount' | 'percent'; value: number }, taxRate: number) {
  const subtotal = round2(items.reduce((sum, i) => sum + i.qty * i.rate, 0));
  const discountValue = round2(Math.min(discount.mode === 'percent' ? (subtotal * discount.value) / 100 : discount.value, subtotal));
  const taxable = subtotal - discountValue;
  const tax = round2((taxable * taxRate) / 100);
  return { subtotal, discount: discountValue, tax, total: round2(taxable + tax) };
}

export default function InvoiceGenerator() {
  const used = useToolUsed('invoice-generator');
  const [business, setBusiness] = useState<Business>({ name: '', address: '', phone: '', taxId: '' });
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [number, setNumber] = useState('INV-0001');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<Item[]>([{ id: 1, description: '', qty: '1', rate: '' }]);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discount, setDiscount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setDate(today());
    try {
      const saved = window.localStorage.getItem(STORE_KEY);
      if (saved) setBusiness((prev) => ({ ...prev, ...(JSON.parse(saved) as Partial<Business>) }));
    } catch {
      // Storage can be blocked; the form still works.
    }
  }, []);

  const updateBusiness = (patch: Partial<Business>) => {
    used();
    setBusiness((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // Ignore: remembering details is optional.
      }
      return next;
    });
  };
  const updateItem = (id: number, patch: Partial<Item>) => {
    used();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };
  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const lines = items.map((i) => ({ ...i, q: n(i.qty), r: n(i.rate) }));
  const totals = invoiceTotals(lines.map((l) => ({ qty: l.q, rate: l.r })), { mode: discountMode, value: n(discount) }, n(taxRate));

  return (
    <ToolFrame label="Invoice generator">
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">Your business</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Business name" inputMode="text" autoComplete="organization" value={business.name} onChange={(v) => updateBusiness({ name: v })} />
            <Field label="Phone" inputMode="text" autoComplete="tel" value={business.phone} onChange={(v) => updateBusiness({ phone: v })} />
            <Field label="Address" inputMode="text" autoComplete="street-address" value={business.address} onChange={(v) => updateBusiness({ address: v })} className="sm:col-span-2" />
            <Field label="NTN or STRN (optional)" inputMode="text" value={business.taxId} onChange={(v) => updateBusiness({ taxId: v })} hint="Saved on this device only." />
          </div>
        </div>
        <div>
          <h3 className="text-h4 text-fg-strong">Invoice</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Customer" inputMode="text" value={customer} onChange={touch(setCustomer)} />
            <Field label="Customer phone" inputMode="text" value={customerPhone} onChange={touch(setCustomerPhone)} />
            <Field label="Invoice number" inputMode="text" value={number} onChange={touch(setNumber)} />
            <Field label="Date" type="date" value={date} onChange={touch(setDate)} />
          </div>
        </div>
        <div>
          <h3 className="text-h4 text-fg-strong">Items</h3>
          <div className="mt-3 space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_8rem_2.25rem]">
                <Field label={`Item ${index + 1}`} hideLabel inputMode="text" placeholder="Description" value={item.description} onChange={(v) => updateItem(item.id, { description: v })} />
                <Field label={`Quantity, item ${index + 1}`} hideLabel value={item.qty} onChange={(v) => updateItem(item.id, { qty: v })} />
                <Field
                  label={`Rate, item ${index + 1}`}
                  hideLabel
                  prefix="Rs"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(v) => updateItem(item.id, { rate: v })}
                  className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
                />
                <button
                  type="button"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  className="inline-flex h-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong disabled:opacity-40"
                >
                  {Glyph.x}
                </button>
              </div>
            ))}
            <SmallButton
              variant="ghost"
              className="-ml-2"
              onClick={() => setItems((prev) => [...prev, { id: Math.max(0, ...prev.map((i) => i.id)) + 1, description: '', qty: '1', rate: '' }])}
            >
              {Glyph.plus} Add item
            </SmallButton>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Segmented
              legend="Discount"
              value={discountMode}
              onChange={touch(setDiscountMode)}
              options={[
                { value: 'amount', label: 'Rs' },
                { value: 'percent', label: '%' },
              ]}
            />
            <Field
              label="Discount value"
              hideLabel
              prefix={discountMode === 'amount' ? 'Rs' : undefined}
              suffix={discountMode === 'percent' ? '%' : undefined}
              value={discount}
              onChange={touch(setDiscount)}
              placeholder="0"
            />
          </div>
          <Field label="Sales tax" suffix="%" value={taxRate} onChange={touch(setTaxRate)} placeholder="0" hint="Leave 0 if you do not charge tax." />
        </div>
        <Field label="Note on the invoice (optional)" inputMode="text" value={notes} onChange={touch(setNotes)} placeholder="Thank you for your business" />
      </InputsPanel>

      <div className="space-y-3 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        <article aria-label="Invoice preview" className={`${styles.sheet} rounded-lg border border-line bg-white p-6 text-[13px] leading-relaxed text-slate-800 shadow-e2`}>
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-slate-950">{business.name || 'Your business name'}</p>
              {business.address ? <p className="break-words text-slate-600">{business.address}</p> : null}
              {business.phone ? <p className="text-slate-600">{business.phone}</p> : null}
              {business.taxId ? <p className="text-slate-600">NTN/STRN: {business.taxId}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Invoice</p>
              <p className="font-medium text-slate-950">{number || '—'}</p>
              <p className="text-slate-600">{date ? displayDate(date) : ''}</p>
            </div>
          </header>
          {customer || customerPhone ? (
            <div className="border-b border-slate-200 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Bill to</p>
              <p className="font-medium text-slate-950">{customer}</p>
              {customerPhone ? <p className="text-slate-600">{customerPhone}</p> : null}
            </div>
          ) : null}
          <table className="mt-3 w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.06em] text-slate-500">
                <th className="py-1.5 font-medium">Item</th>
                <th className="py-1.5 text-right font-medium">Qty</th>
                <th className="py-1.5 text-right font-medium">Rate</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 align-top">
                  <td className="break-words py-1.5 pr-2">{l.description || <span className="text-slate-400">Item</span>}</td>
                  <td className="py-1.5 text-right">{plain(l.q)}</td>
                  <td className="py-1.5 text-right">{rupees(l.r, true)}</td>
                  <td className="py-1.5 text-right">{rupees(round2(l.q * l.r), true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-3 w-full max-w-60 space-y-1 tabular-nums">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd>{rupees(totals.subtotal, true)}</dd>
            </div>
            {totals.discount ? (
              <div className="flex justify-between">
                <dt className="text-slate-600">Discount{discountMode === 'percent' ? ` (${percent(n(discount))})` : ''}</dt>
                <dd>-{rupees(totals.discount, true)}</dd>
              </div>
            ) : null}
            {totals.tax ? (
              <div className="flex justify-between">
                <dt className="text-slate-600">Sales tax ({percent(n(taxRate))})</dt>
                <dd>{rupees(totals.tax, true)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-semibold text-slate-950">
              <dt>Total</dt>
              <dd>{rupees(totals.total, true)}</dd>
            </div>
          </dl>
          {notes ? <p className="mt-5 break-words text-slate-600">{notes}</p> : null}
        </article>
        <div className="flex flex-wrap items-center gap-2">
          <SmallButton
            variant="primary"
            onClick={() => {
              used();
              window.print();
            }}
          >
            {Glyph.printer} Print or save as PDF
          </SmallButton>
        </div>
        <p className="text-small text-fg-subtle">
          This is a plain invoice. It is not an FBR fiscal invoice, which needs an FBR invoice number and QR code from an integrated POS.
        </p>
      </div>
    </ToolFrame>
  );
}
