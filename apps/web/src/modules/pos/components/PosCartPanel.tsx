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
  AlertTriangle, ArrowRight, Banknote, Check, Minus, Pause, Pencil, Plus, Scale, Shield, ShoppingCart, Sparkles,
  Tag, Trash2, UserPlus, X,
} from 'lucide-react';
import { IconButton, Kbd } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';
import { isWeightUnit, qtyStep } from '../lib/posUnits';
import type { PosCartLine } from '../lib/posCart';
import { PosCustomerPicker } from './PosCustomerPicker';
import { PosDeliveryPanel, type PosDeliveryState } from './PosDeliveryPanel';
import { PosReceiverField, type PosReceiverValue } from './PosReceiverField';

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
  canCheckout: boolean;
  checkoutPending?: boolean;
  /** Hint shown in the empty cart. */
  emptyHint?: string;
}

const money = (n: number, hidden?: boolean) => (hidden ? '••••' : formatPKR(n));

export function PosCartPanel(props: PosCartPanelProps) {
  const {
    isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total, totalSavings,
    discountMode, discountPct, discountAmount, onOpenDiscount, onClearDiscount,
    delivery, onDeliveryChange, deliveryFee = 0, hidePrices,
    customers, customerId, setCustomerId, selectedCustomer, onAddCustomer, receiver, onReceiverChange, customerExtra,
    onHold, onClear, onChangeQty, onSetQty, onRemove, priceEditId, onStartPriceEdit, onSetPrice,
    onCheckout, onInstantCash, canCheckout, checkoutPending, emptyHint,
  } = props;
  const hasDiscount = discountAmount > 0;
  const balance = Number(selectedCustomer?.balance || 0);

  return (
    <aside
      aria-label="Bill"
      className={isMobile
        ? 'fixed inset-0 z-[60] flex flex-col bg-white lg:hidden'
        : 'hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex'}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">Bill</h2>
          <p className="text-[0.75rem] text-slate-500">
            {itemCount ? `${itemCount} cheezein · ${Number(totalQty.toFixed(2))} qty` : 'Abhi khaali'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <>
              <IconButton label="Hold — baad me resume" variant="secondary" size="sm" onClick={onHold}><Pause className="h-4 w-4" /></IconButton>
              <IconButton label="Bill khaali karein" variant="secondary" size="sm" onClick={onClear}><Trash2 className="h-4 w-4" /></IconButton>
            </>
          )}
          {isMobile && <IconButton label="Band karein" size="sm" onClick={onCloseMobile}><X className="h-4 w-4" /></IconButton>}
        </div>
      </header>

      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <PosCustomerPicker customers={customers} customerId={customerId} setCustomerId={setCustomerId}
              selectedCustomer={selectedCustomer} onAddCustomer={onAddCustomer} />
          </div>
          <IconButton label="Naya customer" variant="secondary" onClick={onAddCustomer} className="h-11 w-11"><UserPlus className="h-4 w-4" /></IconButton>
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><ShoppingCart className="h-6 w-6" /></span>
            <p className="mt-3 text-[0.9375rem] font-semibold text-slate-800">Bill khaali hai</p>
            <p className="mt-1 max-w-[16rem] text-[0.8125rem] text-slate-500">{emptyHint ?? 'Barcode scan karein, naam likhein, ya product par click karein.'}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] text-slate-400"><Kbd>F12</Kbd> cash + print</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cart.map((l) => (
              <PosCartRow
                key={l.id}
                line={l}
                hidePrices={hidePrices}
                editing={priceEditId === l.id}
                onStartPriceEdit={() => onStartPriceEdit(l.id)}
                onSetPrice={(p: number) => onSetPrice(l.id, p)}
                onCancelPriceEdit={() => onStartPriceEdit(null)}
                onChangeQty={(d: number) => onChangeQty(l.id, d)}
                onSetQty={(q: number) => onSetQty(l.id, q)}
                onRemove={() => onRemove(l.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {cart.length > 0 && (
        <footer className="shrink-0 space-y-2.5 border-t border-slate-200 px-4 py-3">
          <div className="flex gap-2">
            <button type="button" onClick={onOpenDiscount}
              className={cn('flex h-10 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-[0.8125rem] font-medium transition',
                hasDiscount ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
              <span className="inline-flex items-center gap-1.5"><Tag className="h-4 w-4" />{hasDiscount ? `Discount ${discountMode === 'pct' ? `${discountPct}%` : ''}` : 'Discount'}</span>
              {hasDiscount ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="tabular-nums">−{money(discountAmount, hidePrices)}</span>
                  <span role="button" tabIndex={0} aria-label="Discount hatayein"
                    onClick={(e) => { e.stopPropagation(); onClearDiscount(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClearDiscount(); } }}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-amber-200"><X className="h-3.5 w-3.5" /></span>
                </span>
              ) : <ArrowRight className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
          {delivery && onDeliveryChange && <PosDeliveryPanel value={delivery} onChange={onDeliveryChange} tone="emerald" compact />}

          <dl className="space-y-1 text-[0.8125rem]">
            {(hasDiscount || deliveryFee > 0 || totalSavings > 0) && (
              <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd className="tabular-nums">{money(subtotal, hidePrices)}</dd></div>
            )}
            {totalSavings > 0 && (
              <div className="flex justify-between text-success-700"><dt className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />Combo bachat</dt><dd className="tabular-nums">{money(totalSavings, hidePrices)}</dd></div>
            )}
            {hasDiscount && <div className="flex justify-between text-amber-700"><dt>Discount</dt><dd className="tabular-nums">−{money(discountAmount, hidePrices)}</dd></div>}
            {deliveryFee > 0 && <div className="flex justify-between text-slate-600"><dt>Delivery</dt><dd className="tabular-nums">+{money(deliveryFee, hidePrices)}</dd></div>}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="text-[0.875rem] font-semibold text-slate-900">Total</dt>
              <dd className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{money(total, hidePrices)}</dd>
            </div>
          </dl>
          <FbrModeIndicator saleTotal={total} />

          <button type="button" onClick={onInstantCash} disabled={!canCheckout || checkoutPending}
            className="flex h-14 w-full items-center justify-between gap-3 rounded-xl bg-brand-600 px-4 text-brand-fg shadow-sm transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">
            <span className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold"><Banknote className="h-5 w-5" /> Cash · print</span>
            <span className="inline-flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums">{money(total, hidePrices)}</span>
              <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 font-mono text-[0.6875rem] sm:inline">F12</kbd>
            </span>
          </button>
          <button type="button" onClick={onCheckout} disabled={!canCheckout || checkoutPending}
            className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 text-[0.875rem] font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <span>Card · JazzCash · udhaar · kuch paisa</span>
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-500 sm:inline">F9</kbd>
          </button>
          {!canCheckout && <p className="text-center text-[0.75rem] font-medium text-rose-700">Pehle upar se shop chunein</p>}
        </footer>
      )}
    </aside>
  );
}

/** One bill line: rate (editable), badges, quantity stepper, line total. */
export function PosCartRow({ line: l, hidePrices, editing, onStartPriceEdit, onSetPrice, onCancelPriceEdit, onChangeQty, onSetQty, onRemove }: {
  line: PosCartLine;
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

  return (
    <li className="group px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">{l.emoji}</span>}
          {l.type === 'combo' && <span className="absolute inset-x-0 bottom-0 bg-violet-600 text-center text-[0.5rem] font-bold uppercase text-white">Combo</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-slate-900">
              {l.name}{l.variantName && <span className="text-slate-500"> · {l.variantName}</span>}
            </p>
            <p className="shrink-0 text-[0.9375rem] font-semibold tabular-nums text-slate-900">{money(l.lineTotal, hidePrices)}</p>
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
              className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem] text-slate-500 transition hover:text-brand-700">
              {money(l.unitPrice, hidePrices)} / {l.unitName}
              {customPriced && <span className="text-amber-700">(asal {money(l.basePrice, hidePrices)})</span>}
              <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
            </button>
          )}

          {(l.serialNumber || l.imei || l.warrantyMonths || (l.note && l.conversionRate === 1)) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {l.serialNumber && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-600">S/N {l.serialNumber}</span>}
              {l.imei && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-600">IMEI {l.imei}</span>}
              {l.warrantyMonths ? <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-sky-700"><Shield className="h-3 w-3" />{l.warrantyMonths}m warranty</span> : null}
              {l.note && !l.serialNumber && l.conversionRate === 1 && <span className="text-[0.6875rem] text-slate-500">{l.note}</span>}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200">
              <button type="button" aria-label="Kam" disabled={l.lockQty} onClick={() => onChangeQty(-1)}
                className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
              <input aria-label="Qty" inputMode="decimal" value={qtyDraft} disabled={l.lockQty}
                onChange={(e) => setQtyDraft(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={commitQty}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                onFocus={(e) => e.target.select()}
                className="h-9 w-14 border-x border-slate-200 bg-white text-center text-[0.9375rem] font-semibold tabular-nums text-slate-900 outline-none disabled:bg-slate-50" />
              <button type="button" aria-label="Zyada" disabled={l.lockQty} onClick={() => onChangeQty(1)}
                className="flex h-9 w-9 items-center justify-center bg-brand-600 text-brand-fg transition hover:bg-brand-700 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
            </div>
            <span className="min-w-0 truncate text-[0.6875rem] text-slate-400">
              {weight && <span className="inline-flex items-center gap-0.5"><Scale className="h-3 w-3" />{qtyStep(l.unitName)} {l.unitName} step</span>}
              {l.conversionRate !== 1 && !weight && `= ${Number(l.baseQuantity.toFixed(3))} ${l.baseUnit}`}
            </span>
            <IconButton label="Hatayein" size="sm" onClick={onRemove} className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></IconButton>
          </div>
        </div>
      </div>
    </li>
  );
}
