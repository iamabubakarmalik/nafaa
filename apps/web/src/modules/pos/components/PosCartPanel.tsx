/**
 * The bill being built: customer, lines, discount, delivery, totals and the
 * pay buttons. Each line shows unit, rate and quantity; the rate can be
 * edited in place because bargaining happens at the counter.
 *
 * Used by every POS built on the shared module, on desktop as a side panel
 * and on phones as a full-screen sheet (`isMobile`).
 */

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle, Banknote, BookOpen, Check, CreditCard, Keyboard, Minus, Pause, Pencil, Plus, Receipt, ScanLine, Shield,
  Smartphone, Sparkles, Tag, Trash2, UserPlus, X,
} from 'lucide-react';
import { IconButton, Kbd } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { isWeightUnit, qtyStep } from '../lib/posUnits';
import type { PosCartLine } from '../lib/posCart';
import { PosCustomerPicker } from './PosCustomerPicker';
import { PosDeliveryPanel, type PosDeliveryState } from './PosDeliveryPanel';
import { PosReceiverField, type PosReceiverValue } from './PosReceiverField';

/** Quick payment tiles under the cash button. */
export type PosQuickPay = { method: PaymentMethod } | { mode: 'credit' | 'partial' };

interface PosCartPanelProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
  cart: PosCartLine[];
  itemCount: number;
  totalQty: number;
  subtotal: number;
  total: number;
  totalSavings: number;
  discountMode: 'pct' | 'rs';
  discountPct: number;
  discountRs: number;
  discountAmount: number;
  /** Discount code and points taken off the bill, shown as their own lines. */
  extraDiscounts?: Array<{ label: string; amount: number }>;
  onOpenDiscount: () => void;
  onClearDiscount: () => void;
  delivery?: PosDeliveryState;
  onDeliveryChange?: (d: PosDeliveryState) => void;
  deliveryFee?: number;
  hidePrices?: boolean;
  customers: any[];
  customerId: string;
  setCustomerId: (id: string) => void;
  selectedCustomer?: any;
  onAddCustomer: () => void;
  receiver?: PosReceiverValue;
  onReceiverChange?: (v: PosReceiverValue) => void;
  /** Industry block under the customer picker (seller picker, farmer details…). */
  customerExtra?: ReactNode;
  onHold: () => void;
  onClear: () => void;
  onChangeQty: (id: string, delta: number) => void;
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  priceEditId: string | null;
  onStartPriceEdit: (id: string | null) => void;
  onSetPrice: (id: string, price: number) => void;
  onCheckout: () => void;
  onInstantCash: () => void;
  /** Open checkout with a method or mode preselected; adds the payment tiles. */
  onQuickPay?: (q: PosQuickPay) => void;
  canCheckout: boolean;
  checkoutPending?: boolean;
  /** Hint shown in the empty cart. */
  emptyHint?: string;
  /** Extra block under a line's tags (batch and expiry being sold). */
  lineExtra?: (line: PosCartLine) => ReactNode;
}

const money = (n: number, hidden?: boolean) => (hidden ? '••••' : formatPKR(n));

const QUICK: Array<{ label: string; icon: typeof CreditCard; color: string; q: PosQuickPay }> = [
  { label: 'Card', icon: CreditCard, color: '#2563eb', q: { method: 'CARD' } },
  { label: 'JazzCash', icon: Smartphone, color: '#ea580c', q: { method: 'JAZZCASH' } },
  { label: 'Easypaisa', icon: Smartphone, color: '#16a34a', q: { method: 'EASYPAISA' } },
  { label: 'Udhaar', icon: BookOpen, color: '#d97706', q: { mode: 'credit' } },
];

export function PosCartPanel(props: PosCartPanelProps) {
  const {
    isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total, totalSavings,
    discountMode, discountPct, discountAmount, extraDiscounts = [], onOpenDiscount, onClearDiscount,
    delivery, onDeliveryChange, deliveryFee = 0, hidePrices,
    customers, customerId, setCustomerId, selectedCustomer, onAddCustomer, receiver, onReceiverChange, customerExtra,
    onHold, onClear, onChangeQty, onSetQty, onRemove, priceEditId, onStartPriceEdit, onSetPrice,
    onCheckout, onInstantCash, onQuickPay, canCheckout, checkoutPending, emptyHint, lineExtra,
  } = props;
  const hasDiscount = discountAmount > 0;
  const balance = Number(selectedCustomer?.balance || 0);
  const disabled = !canCheckout || checkoutPending;

  return (
    <aside
      aria-label="Bill"
      className={isMobile
        ? 'fixed inset-0 z-[60] flex flex-col bg-white lg:hidden'
        : 'hidden min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:flex'}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Receipt className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-semibold leading-tight text-slate-900">Naya bill</h2>
            <p className="text-[0.75rem] text-slate-500">
              {itemCount ? `${itemCount} cheezein · ${Number(totalQty.toFixed(2))} qty` : 'Khaali — scan ya click karein'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <>
              <IconButton label="Hold — baad me resume" size="sm" onClick={onHold}><Pause className="h-4 w-4" /></IconButton>
              <IconButton label="Bill khaali karein" size="sm" onClick={onClear} className="hover:text-rose-600"><Trash2 className="h-4 w-4" /></IconButton>
            </>
          )}
          {isMobile && <IconButton label="Band karein" size="sm" onClick={onCloseMobile}><X className="h-4 w-4" /></IconButton>}
        </div>
      </header>

      <div className="shrink-0 space-y-2 px-4 pb-3">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <PosCustomerPicker customers={customers} customerId={customerId} setCustomerId={setCustomerId}
              selectedCustomer={selectedCustomer} onAddCustomer={onAddCustomer} />
          </div>
          <IconButton label="Naya customer" variant="secondary" onClick={onAddCustomer} className="h-11 w-11 rounded-lg"><UserPlus className="h-4 w-4" /></IconButton>
        </div>
        {customerExtra}
        {balance > 0 && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.75rem] font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> Pichhla udhaar {money(balance, hidePrices)}
          </p>
        )}
        {selectedCustomer && receiver && onReceiverChange && (
          <PosReceiverField customerId={customerId} customerName={selectedCustomer.name} value={receiver} onChange={onReceiverChange} compact />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl" aria-hidden />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg">
                <ScanLine className="h-7 w-7" />
              </span>
            </div>
            <p className="mt-4 text-[0.9375rem] font-semibold text-slate-800">Bill shuru karein</p>
            <p className="mt-1 max-w-[17rem] text-[0.8125rem] text-slate-500">{emptyHint ?? 'Barcode scan karein, naam likhein ya product par click karein.'}</p>
            <div className="mt-4 grid w-full max-w-[17rem] gap-1.5 text-left text-[0.75rem] text-slate-500">
              <span className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5"><span className="inline-flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5" /> Search</span><Kbd>/</Kbd></span>
              <span className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5"><span className="inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Cash + print</span><Kbd>F12</Kbd></span>
              <span className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5"><span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Baqi payments</span><Kbd>F9</Kbd></span>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cart.map((l) => (
              <PosCartRow key={l.id} line={l} hidePrices={hidePrices} editing={priceEditId === l.id}
                onStartPriceEdit={() => onStartPriceEdit(l.id)} onSetPrice={(p: number) => onSetPrice(l.id, p)} onCancelPriceEdit={() => onStartPriceEdit(null)}
                onChangeQty={(d: number) => onChangeQty(l.id, d)} onSetQty={(q: number) => onSetQty(l.id, q)} onRemove={() => onRemove(l.id)}
                extra={lineExtra?.(l)} />
            ))}
          </ul>
        )}
      </div>

      {cart.length > 0 && (
        <footer className="shrink-0 space-y-3 border-t border-slate-100 p-4">
          <div className="flex gap-2">
            <button type="button" onClick={onOpenDiscount}
              className={cn('inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[0.8125rem] font-medium transition',
                hasDiscount ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
              <Tag className="h-4 w-4" />
              {hasDiscount ? <>{discountMode === 'pct' ? `${discountPct}% off` : 'Discount'} <span className="tabular-nums">−{money(discountAmount, hidePrices)}</span></> : 'Discount'}
              {hasDiscount && (
                <span role="button" tabIndex={0} aria-label="Discount hatayein"
                  onClick={(e) => { e.stopPropagation(); onClearDiscount(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClearDiscount(); } }}
                  className="ml-0.5 flex h-5 w-5 items-center justify-center rounded hover:bg-amber-200"><X className="h-3.5 w-3.5" /></span>
              )}
            </button>
          </div>
          {delivery && onDeliveryChange && <PosDeliveryPanel value={delivery} onChange={onDeliveryChange} tone="emerald" compact />}

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 p-3.5 ring-1 ring-slate-200/70">
            <dl className="space-y-1 text-[0.8125rem]">
              {(hasDiscount || deliveryFee > 0 || totalSavings > 0) && (
                <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd className="tabular-nums">{money(subtotal, hidePrices)}</dd></div>
              )}
              {totalSavings > 0 && <div className="flex justify-between text-success-700"><dt className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />Combo bachat</dt><dd className="tabular-nums">{money(totalSavings, hidePrices)}</dd></div>}
              {hasDiscount && <div className="flex justify-between text-amber-700"><dt>Discount</dt><dd className="tabular-nums">−{money(discountAmount, hidePrices)}</dd></div>}
              {extraDiscounts.filter((x) => x.amount > 0).map((x) => (
                <div key={x.label} className="flex justify-between text-violet-700"><dt>{x.label}</dt><dd className="tabular-nums">−{money(x.amount, hidePrices)}</dd></div>
              ))}
              {deliveryFee > 0 && <div className="flex justify-between text-slate-600"><dt>Delivery</dt><dd className="tabular-nums">+{money(deliveryFee, hidePrices)}</dd></div>}
            </dl>
            <div className={cn('flex items-end justify-between', (hasDiscount || deliveryFee > 0 || totalSavings > 0) && 'mt-2 border-t border-dashed border-slate-300 pt-2')}>
              <span className="text-[0.8125rem] font-medium text-slate-500">Kul amount</span>
              <span className="text-[1.875rem] font-bold leading-none tabular-nums tracking-tight text-slate-900">{money(total, hidePrices)}</span>
            </div>
            <FbrModeIndicator saleTotal={total} />
          </div>

          <button type="button" onClick={onInstantCash} disabled={disabled}
            className="group relative flex h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-brand-fg shadow-lg shadow-brand-600/25 transition hover:shadow-xl hover:shadow-brand-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">
            <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/15 transition-all duration-700 group-hover:left-[110%]" aria-hidden />
            <span className="relative inline-flex items-center gap-2.5 text-[0.9375rem] font-semibold"><Banknote className="h-5 w-5" /> Cash · print</span>
            <span className="relative inline-flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums">{money(total, hidePrices)}</span>
              <kbd className="hidden rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[0.6875rem] sm:inline">F12</kbd>
            </span>
          </button>

          {onQuickPay ? (
            <div className="grid grid-cols-5 gap-1.5">
              {QUICK.map((p) => (
                <button key={p.label} type="button" disabled={disabled || ('mode' in p.q && !customerId)} onClick={() => onQuickPay(p.q)}
                  title={'mode' in p.q && !customerId ? 'Udhaar ke liye customer chunein' : p.label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-2 text-[0.6875rem] font-medium text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${p.color}17`, color: p.color }}><p.icon className="h-4 w-4" /></span>
                  {p.label}
                </button>
              ))}
              <button type="button" disabled={disabled} onClick={onCheckout} title="Sab tareeqe (F9)"
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-2 text-[0.6875rem] font-medium text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-mono text-[0.625rem] font-bold">F9</span>
                Aur
              </button>
            </div>
          ) : (
            <button type="button" onClick={onCheckout} disabled={disabled}
              className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 text-[0.875rem] font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <span>Card · JazzCash · udhaar · kuch paisa</span>
              <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-500 sm:inline">F9</kbd>
            </button>
          )}
          {!canCheckout && <p className="text-center text-[0.75rem] font-medium text-rose-700">Pehle upar se shop chunein</p>}
        </footer>
      )}
    </aside>
  );
}

/** One bill line: thumbnail, name, rate (editable), quantity stepper, line total. */
export function PosCartRow({ line: l, hidePrices, editing, onStartPriceEdit, onSetPrice, onCancelPriceEdit, onChangeQty, onSetQty, onRemove, extra }: {
  line: PosCartLine;
  extra?: ReactNode;
  hidePrices?: boolean;
  editing: boolean;
  onStartPriceEdit: () => void;
  onSetPrice: (p: number) => void;
  onCancelPriceEdit: () => void;
  onChangeQty: (d: number) => void;
  onSetQty: (q: number) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [qtyDraft, setQtyDraft] = useState(String(l.quantity));
  const customPriced = Number(l.unitPrice) !== Number(l.basePrice);
  const weight = isWeightUnit(l.unitName);

  useEffect(() => { if (editing) setDraft(String(l.unitPrice)); }, [editing, l.unitPrice]);
  useEffect(() => { setQtyDraft(String(l.quantity)); }, [l.quantity]);

  const commit = () => {
    const v = Number(draft);
    if (draft !== '' && !Number.isNaN(v) && v >= 0) onSetPrice(v);
    else onCancelPriceEdit();
  };
  const commitQty = () => {
    const v = Number(qtyDraft);
    if (!Number.isNaN(v) && v !== l.quantity) onSetQty(v);
    else setQtyDraft(String(l.quantity));
  };
  const tags = [
    l.variantName && { t: l.variantName, c: 'bg-slate-100 text-slate-600' },
    l.serialNumber && { t: `S/N ${l.serialNumber}`, c: 'bg-slate-100 font-mono text-slate-600' },
    l.imei && { t: `IMEI ${l.imei}`, c: 'bg-slate-100 font-mono text-slate-600' },
    l.type === 'combo' && { t: 'Combo', c: 'bg-violet-50 text-violet-700' },
    customPriced && { t: 'Rate badla', c: 'bg-amber-50 text-amber-700' },
  ].filter(Boolean) as Array<{ t: string; c: string }>;

  return (
    <li className="group relative px-4 py-3 transition hover:bg-slate-50/70">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xl', !l.image && 'bg-gradient-to-br', !l.image && (l.type === 'combo' ? 'from-violet-100 to-fuchsia-200' : productTint(l.name)))}>
          {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : <span className="drop-shadow-sm">{l.type === 'combo' ? '🎁' : productEmoji(l.name)}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[0.875rem] font-semibold leading-snug text-slate-900">{l.name}</p>
            <p className="shrink-0 text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(l.lineTotal, hidePrices)}</p>
          </div>

          {editing ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[0.75rem] text-slate-500">Rs</span>
              <input autoFocus inputMode="decimal" value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { e.stopPropagation(); onCancelPriceEdit(); } }}
                onBlur={commit}
                className="h-8 w-24 rounded-md border border-amber-400 bg-amber-50 px-2 text-[0.875rem] font-semibold tabular-nums text-amber-900 outline-none" />
              <IconButton label="Theek" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={commit}><Check className="h-4 w-4" /></IconButton>
              {customPriced && (
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSetPrice(l.basePrice)}
                  className="text-[0.75rem] font-medium text-slate-500 hover:text-slate-800">Asal rate</button>
              )}
            </div>
          ) : (
            <button type="button" onClick={onStartPriceEdit} title="Rate badlein"
              className="mt-0.5 inline-flex items-center gap-1 rounded text-[0.75rem] text-slate-500 transition hover:text-brand-700">
              <span className="tabular-nums">{money(l.unitPrice, hidePrices)}</span> / {l.unitName}
              {customPriced && <span className="text-slate-400 line-through tabular-nums">{money(l.basePrice, hidePrices)}</span>}
              <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
            </button>
          )}

          {(tags.length > 0 || l.warrantyMonths) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((t) => <span key={t.t} className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium', t.c)}>{t.t}</span>)}
              {l.warrantyMonths ? <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-sky-700"><Shield className="h-3 w-3" />{l.warrantyMonths}m warranty</span> : null}
            </div>
          )}
          {extra}

          <div className="mt-2 flex items-center gap-2">
            <div className="inline-flex h-8 items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              <button type="button" aria-label="Kam" disabled={l.lockQty} onClick={() => onChangeQty(-1)}
                className="flex h-8 w-8 items-center justify-center text-slate-600 transition hover:bg-slate-200 disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
              <input aria-label="Qty" inputMode="decimal" value={qtyDraft} disabled={l.lockQty}
                onChange={(e) => setQtyDraft(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={commitQty}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                onFocus={(e) => e.target.select()}
                className="h-8 w-11 bg-white text-center text-[0.875rem] font-bold tabular-nums text-slate-900 outline-none disabled:bg-slate-50" />
              <button type="button" aria-label="Zyada" disabled={l.lockQty} onClick={() => onChangeQty(1)}
                className="flex h-8 w-8 items-center justify-center bg-brand-600 text-brand-fg transition hover:bg-brand-700 disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-slate-400">
              {weight ? `${qtyStep(l.unitName)} ${l.unitName} step` : l.conversionRate !== 1 ? `= ${Number(l.baseQuantity.toFixed(3))} ${l.baseUnit}` : ''}
            </span>
            <IconButton label="Hatayein" size="sm" onClick={onRemove} className="text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100 max-lg:opacity-100"><Trash2 className="h-4 w-4" /></IconButton>
          </div>
        </div>
      </div>
    </li>
  );
}
