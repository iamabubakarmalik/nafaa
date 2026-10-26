/**
 * The bill being built: customer, lines, discount, delivery, totals and the
 * pay buttons. Lines are dense (name, qty × rate, total) so a long bill stays
 * in view; the totals and pay buttons stay fixed at the bottom.
 *
 * Two shapes: `panel` (side panel, two-row lines) and `table` (wide bill with
 * No. / Item / Qty / Rate / Total columns, for the Express and Bill-bara
 * layouts). The keyboard drives it too: the counter passes the selected line,
 * and qty / rate / note editing state.
 *
 * Used by every POS built on the shared module, on desktop as a panel and on
 * phones as a full-screen sheet (`isMobile`).
 */

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  AlertTriangle, Banknote, BookOpen, CreditCard, Minus, Pause, Plus, Printer, Receipt, Repeat, ScanLine, Shield,
  Smartphone, Sparkles, StickyNote, Tag, Trash2, Truck, UserCheck, UserPlus, X,
} from 'lucide-react';
import { IconButton, Kbd, Table, THead, TBody, Tr, Th } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { isWeightUnit } from '../lib/posUnits';
import type { PosCartLine } from '../lib/posCart';
import { PosCustomerPicker } from './PosCustomerPicker';
import { PosDeliveryPanel, type PosDeliveryState } from './PosDeliveryPanel';
import { PosReceiverField, type PosReceiverValue } from './PosReceiverField';

/** Quick payment tiles under the cash button. */
export type PosQuickPay = { method: PaymentMethod } | { mode: 'credit' | 'partial' };

interface PosCartPanelProps {
  isMobile?: boolean;
  className?: string;
  onCloseMobile?: () => void;
  /** `table`: wide bill with columns; `panel`: side panel. */
  variant?: 'panel' | 'table';
  /** Totals and pay buttons in a column on the right of the lines. */
  summarySide?: boolean;
  density?: 'compact' | 'comfortable';
  touch?: boolean;
  showImages?: boolean;
  cart: PosCartLine[];
  totalQty: number;
  subtotal: number;
  total: number;
  totalSavings: number;
  discountMode: 'pct' | 'rs';
  discountPct: number;
  discountAmount: number;
  /** Discount code and points taken off the bill, shown as their own lines. */
  extraDiscounts?: Array<{ label: string; amount: number }>;
  onOpenDiscount: () => void;
  onClearDiscount: () => void;
  showDiscount?: boolean;
  /** One-tap discount % buttons (already limited to what this cashier may give). */
  quickDiscounts?: number[];
  onQuickDiscount?: (pct: number) => void;
  delivery?: PosDeliveryState;
  onDeliveryChange?: (d: PosDeliveryState) => void;
  deliveryFee?: number;
  hidePrices?: boolean;
  customers: any[];
  customerId: string;
  setCustomerId: (id: string) => void;
  selectedCustomer?: any;
  onAddCustomer: (prefill?: string) => void;
  customerOpenKey?: number;
  onCustomerClosed?: () => void;
  receiver?: PosReceiverValue;
  onReceiverChange?: (v: PosReceiverValue) => void;
  /** Changing this number opens the receiver box (Alt+L). */
  receiverOpenKey?: number;
  /** Industry block next to the customer (seller picker, farmer details…). */
  customerExtra?: ReactNode;
  /** Price tier switcher (Retail / Wholesale / Credit), when the shop uses tiers. */
  tierBar?: ReactNode;
  onHold: () => void;
  onClear: () => void;
  heldCount?: number;
  onOpenHeld?: () => void;
  onChangeQty: (id: string, delta: number) => void;
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  priceEditId: string | null;
  onStartPriceEdit: (id: string | null) => void;
  onSetPrice: (id: string, price: number) => void;
  canEditPrice?: boolean;
  qtyEditId?: string | null;
  onStartQtyEdit?: (id: string | null) => void;
  lineNotes?: boolean;
  noteEditId?: string | null;
  onStartNoteEdit?: (id: string | null) => void;
  onSetNote?: (id: string, note: string) => void;
  /** Line the keyboard works on (highlighted). */
  activeId?: string | null;
  /** Lines list has keyboard focus (arrow keys move the selection). */
  cartFocused?: boolean;
  onSelect?: (id: string) => void;
  listRef?: Ref<HTMLDivElement>;
  onListKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onListFocus?: () => void;
  onCheckout: () => void;
  onInstantCash: () => void;
  /** Open checkout with a method or mode preselected; adds the payment tiles. */
  onQuickPay?: (q: PosQuickPay) => void;
  canCheckout: boolean;
  checkoutPending?: boolean;
  /** Hint shown in the empty cart. */
  emptyHint?: string;
  /** Extra block under a line (batch and expiry being sold). */
  lineExtra?: (line: PosCartLine) => ReactNode;
  /** Last bill of this session, for the change-due pill and reprint. */
  lastBill?: { number: string; total: number; change: number } | null;
  onReprint?: () => void;
  onRepeat?: () => void;
}

const money = (n: number, hidden?: boolean) => (hidden ? '••••' : formatPKR(n));
const qtyText = (n: number) => String(Number(n.toFixed(3)));

const QUICK: Array<{ label: string; icon: typeof CreditCard; color: string; q: PosQuickPay; key: string }> = [
  { label: 'Card', icon: CreditCard, color: '#2563eb', q: { method: 'CARD' }, key: '2' },
  { label: 'JazzCash', icon: Smartphone, color: '#ea580c', q: { method: 'JAZZCASH' }, key: '3' },
  { label: 'Easypaisa', icon: Smartphone, color: '#16a34a', q: { method: 'EASYPAISA' }, key: '4' },
  { label: 'Udhaar', icon: BookOpen, color: '#d97706', q: { mode: 'credit' }, key: '5' },
];

export function PosCartPanel(props: PosCartPanelProps) {
  const {
    isMobile, className, onCloseMobile, variant = 'panel', summarySide, density = 'compact', touch, showImages = true,
    cart, totalQty, subtotal, total, totalSavings, hidePrices,
    customers, customerId, setCustomerId, selectedCustomer, onAddCustomer, customerOpenKey, onCustomerClosed,
    receiver, onReceiverChange, receiverOpenKey, customerExtra, tierBar,
    onHold, onClear, heldCount = 0, onOpenHeld, emptyHint, lineExtra, lastBill, onReprint, onRepeat,
    activeId, cartFocused, onSelect, listRef, onListKeyDown, onListFocus,
  } = props;
  const balance = Number(selectedCustomer?.balance || 0);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const table = variant === 'table' && !isMobile;
  const side = summarySide && table;
  const scroller = useRef<HTMLDivElement | null>(null);

  const receiverBox = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!receiverOpenKey) return;
    setReceiverOpen(true);
    setTimeout(() => receiverBox.current?.querySelector('input')?.focus(), 50);
  }, [receiverOpenKey]);
  const closeReceiver = () => { setReceiverOpen(false); onCustomerClosed?.(); };
  useEffect(() => { setReceiverOpen(false); }, [customerId]);
  // Keep the line being worked on in view.
  useEffect(() => {
    if (!activeId) return;
    scroller.current?.querySelector(`[data-line-id="${activeId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeId, cart.length, customerId]);

  const setListRef = (el: HTMLDivElement | null) => {
    scroller.current = el;
    if (typeof listRef === 'function') listRef(el);
    else if (listRef) (listRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const showReceiverChip = !!selectedCustomer && !!receiver && !!onReceiverChange;

  const lines = cart.length === 0 ? (
    <EmptyBill hint={emptyHint} lastBill={lastBill} hidePrices={hidePrices} onReprint={onReprint} onRepeat={onRepeat} />
  ) : table ? (
    // overflow-visible keeps the header sticky inside the bill's own scroller.
    <Table className="overflow-visible [&>table]:table-fixed [&>table]:text-[0.8125rem]">
      <THead className="sticky top-0 z-10 border-b-0 text-[0.6875rem]">
        <Tr>
          <Th className="w-10 py-2 pl-3 pr-0">No.</Th>
          <Th className="px-0 py-2">Item</Th>
          <Th align="center" className="w-32 px-0 py-2">Qty</Th>
          <Th align="right" className="w-28 px-0 py-2">Rate</Th>
          <Th align="right" className="w-28 px-0 py-2">Total</Th>
          <Th className="w-14 px-0 py-2" aria-label="Hatayein" />
        </Tr>
      </THead>
      <TBody>
        {cart.map((l, i) => <PosCartRow key={l.id} line={l} index={i} table {...rowProps(props, l)} active={activeId === l.id} focused={cartFocused} onSelect={() => onSelect?.(l.id)} extra={lineExtra?.(l)} />)}
      </TBody>
    </Table>
  ) : (
    <ul className="divide-y divide-slate-100">
      {cart.map((l, i) => <PosCartRow key={l.id} line={l} index={i} {...rowProps(props, l)} active={activeId === l.id} focused={cartFocused} onSelect={() => onSelect?.(l.id)} extra={lineExtra?.(l)} />)}
    </ul>
  );

  return (
    <aside
      aria-label="Bill"
      // Clicking a button keeps the keyboard where it was (search box or bill lines).
      onMouseDown={(ev) => { if (!isMobile && (ev.target as HTMLElement).closest('button')) ev.preventDefault(); }}
      className={cn(isMobile
        ? 'fixed inset-0 z-[60] flex flex-col bg-white lg:hidden'
        : 'hidden min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:flex', !isMobile && className)}
    >
      {/* Header: count, hold, clear */}
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 pb-1.5 pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Receipt className="h-4 w-4" /></span>
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">Bill</h2>
          {cart.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums text-slate-700">
              {cart.length} items · {qtyText(totalQty)} qty
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {heldCount > 0 && onOpenHeld && (
            <button type="button" onClick={onOpenHeld} title="Hold bill (F6)"
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-100 px-2 text-[0.75rem] font-semibold text-amber-900 hover:bg-amber-200">
              <Pause className="h-3.5 w-3.5" />{heldCount}
            </button>
          )}
          {cart.length > 0 && (
            <>
              <button type="button" onClick={onHold} title="Hold — baad me resume (F6)"
                className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-medium text-slate-600 hover:bg-slate-100">
                <Pause className="h-3.5 w-3.5" /> Hold <Kbd className="hidden h-4 xl:inline-flex">F6</Kbd>
              </button>
              <IconButton label="Bill khaali karein" size="sm" onClick={onClear} className="hover:text-rose-600"><Trash2 className="h-4 w-4" /></IconButton>
            </>
          )}
          {isMobile && <IconButton label="Band karein" size="sm" onClick={onCloseMobile}><X className="h-4 w-4" /></IconButton>}
        </div>
      </header>

      {/* Customer, previous udhaar, receiver */}
      <div className="shrink-0 space-y-1.5 px-3 pb-2">
        <div className="flex gap-1.5">
          <div className="min-w-0 flex-1">
            <PosCustomerPicker customers={customers} customerId={customerId} setCustomerId={setCustomerId} compact
              selectedCustomer={selectedCustomer} onAddCustomer={onAddCustomer} openKey={customerOpenKey} onClosed={onCustomerClosed} />
          </div>
          <IconButton label="Naya customer" variant="secondary" onClick={() => onAddCustomer()} className="h-9 w-9 rounded-lg"><UserPlus className="h-4 w-4" /></IconButton>
        </div>
        {(balance > 0 || showReceiverChip || customerExtra) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {balance > 0 && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-amber-50 px-2 text-[0.6875rem] font-semibold text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="h-3 w-3" /> Pichhla udhaar {money(balance, hidePrices)}
              </span>
            )}
            {showReceiverChip && !receiverOpen && (
              receiver!.name.trim() ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-slate-100 pl-2 text-[0.6875rem] font-semibold text-slate-700">
                  <button type="button" onClick={() => setReceiverOpen(true)} className="inline-flex items-center gap-1"><UserCheck className="h-3 w-3" /> Lene wala: {receiver!.name}</button>
                  <button type="button" aria-label="Lene wala hatayein" onClick={() => onReceiverChange!({ name: '', phone: '' })} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-200"><X className="h-3 w-3" /></button>
                </span>
              ) : (
                <button type="button" onClick={() => setReceiverOpen(true)} title="Maal lene koi aur aaya hai? (Alt+L)"
                  className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 text-[0.6875rem] font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700">
                  <Plus className="h-3 w-3" /> Lene wala
                </button>
              )
            )}
            {customerExtra}
          </div>
        )}
        {tierBar}
        {showReceiverChip && receiverOpen && (
          <div className="relative" ref={receiverBox}
            onKeyDown={(ev) => { if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.target as HTMLElement).tagName === 'INPUT')) { ev.preventDefault(); ev.stopPropagation(); closeReceiver(); } }}>
            <PosReceiverField customerId={customerId} customerName={selectedCustomer.name} value={receiver!} onChange={onReceiverChange!} compact />
            <button type="button" aria-label="Band karein" onClick={closeReceiver}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-amber-100"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className={cn('flex min-h-0 flex-1', side ? 'flex-row' : 'flex-col')}>
        <div ref={setListRef} tabIndex={cart.length ? 0 : -1} onKeyDown={onListKeyDown} onFocus={onListFocus}
          aria-label="Bill ki cheezein (F3)" role="listbox" data-own-keys
          className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100 outline-none',
            cartFocused && 'shadow-[inset_0_0_0_2px_rgb(var(--brand-500))]',
            density === 'comfortable' && '[--row-py:0.625rem]', touch && '[--row-py:0.75rem]')}
          data-density={density} data-images={showImages ? '1' : '0'}>
          {lines}
        </div>
        {(cart.length > 0 || side) && (
          <BillSummary {...props} side={side} />
        )}
      </div>
    </aside>
  );
}

/** Row props taken from the panel props for one line. */
function rowProps(p: PosCartPanelProps, l: PosCartLine) {
  return {
    hidePrices: p.hidePrices, showImages: p.showImages ?? true, density: p.density ?? 'compact', touch: p.touch,
    editingPrice: p.priceEditId === l.id, canEditPrice: p.canEditPrice ?? true,
    onStartPriceEdit: () => p.onStartPriceEdit(l.id), onSetPrice: (v: number) => p.onSetPrice(l.id, v), onCancelPriceEdit: () => p.onStartPriceEdit(null),
    editingQty: p.qtyEditId === l.id, onStartQtyEdit: () => p.onStartQtyEdit?.(l.id), onEndQtyEdit: () => p.onStartQtyEdit?.(null),
    lineNotes: !!p.lineNotes, editingNote: p.noteEditId === l.id,
    onStartNoteEdit: () => p.onStartNoteEdit?.(l.id), onEndNoteEdit: () => p.onStartNoteEdit?.(null), onSetNote: (v: string) => p.onSetNote?.(l.id, v),
    onChangeQty: (d: number) => p.onChangeQty(l.id, d), onSetQty: (q: number) => p.onSetQty(l.id, q), onRemove: () => p.onRemove(l.id),
  };
}

function EmptyBill({ hint, lastBill, hidePrices, onReprint, onRepeat }: {
  hint?: string; lastBill?: { number: string; total: number; change: number } | null; hidePrices?: boolean; onReprint?: () => void; onRepeat?: () => void;
}) {
  const keys: Array<[string, string]> = [['Naam / barcode', 'Type'], ['Customer', 'F2'], ['Cash + print', 'F12'], ['Sab shortcuts', '?']];
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-md">
        <ScanLine className="h-6 w-6" />
      </span>
      <p className="mt-3 text-[0.9375rem] font-semibold text-slate-800">Bill shuru karein</p>
      <p className="mt-0.5 max-w-[17rem] text-[0.8125rem] text-slate-500">{hint ?? 'Barcode scan karein ya naam likh kar Enter dabayein.'}</p>
      {lastBill && (
        <div className="mt-3 w-full max-w-[18rem] rounded-xl bg-success-50 px-3 py-2 text-left ring-1 ring-success-200">
          <div className="flex items-center justify-between text-[0.75rem] text-success-800">
            <span>Pichhla bill {lastBill.number}</span><span className="tabular-nums">{money(lastBill.total, hidePrices)}</span>
          </div>
          {lastBill.change > 0 && <div className="text-[1.125rem] font-bold tabular-nums text-success-700">Wapas: {money(lastBill.change, hidePrices)}</div>}
          <div className="mt-1.5 flex gap-1.5">
            {onReprint && <button type="button" onClick={onReprint} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Printer className="h-3.5 w-3.5" /> Print <Kbd className="h-4">Ctrl P</Kbd></button>}
            {onRepeat && <button type="button" onClick={onRepeat} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Repeat className="h-3.5 w-3.5" /> Dobara <Kbd className="h-4">Alt R</Kbd></button>}
          </div>
        </div>
      )}
      <div className="mt-3 grid w-full max-w-[18rem] gap-1 text-left text-[0.75rem] text-slate-500">
        {keys.map(([label, key]) => (
          <span key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1">{label}<Kbd>{key}</Kbd></span>
        ))}
      </div>
    </div>
  );
}

/** Discount, delivery, totals and pay buttons; stays at the bottom (or on the right). */
function BillSummary(p: PosCartPanelProps & { side?: boolean }) {
  const {
    side, cart, subtotal, total, totalSavings, discountMode, discountPct, discountAmount, extraDiscounts = [],
    onOpenDiscount, onClearDiscount, showDiscount = true, quickDiscounts = [], onQuickDiscount,
    delivery, onDeliveryChange, deliveryFee = 0, hidePrices, customerId,
    onCheckout, onInstantCash, onQuickPay, canCheckout, checkoutPending, touch,
  } = p;
  const hasDiscount = discountAmount > 0;
  const disabled = !canCheckout || checkoutPending || cart.length === 0;
  const extras = extraDiscounts.filter((x) => x.amount > 0);
  const breakdown = hasDiscount || deliveryFee > 0 || totalSavings > 0 || extras.length > 0;
  const chip = 'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold transition';

  return (
    <footer className={cn('shrink-0 space-y-2 border-slate-100 bg-white px-3 pb-3 pt-2', side ? 'flex w-[22rem] flex-col border-l' : 'border-t')}>
      {side && (
        // Express: a big total the cashier and customer can both read.
        <div className="flex flex-1 flex-col justify-center rounded-xl bg-slate-900 px-4 py-4 text-right text-white">
          <span className="text-[0.75rem] font-medium uppercase tracking-wide text-slate-400">Kul bill · {cart.length} items</span>
          <span className="text-[2.5rem] font-bold leading-tight tabular-nums tracking-tight">{money(total, hidePrices)}</span>
          {p.selectedCustomer && <span className="truncate text-[0.8125rem] text-slate-300">{p.selectedCustomer.name}</span>}
        </div>
      )}
      {(showDiscount || (delivery && onDeliveryChange)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {showDiscount && (hasDiscount ? (
            <span className={cn(chip, 'bg-amber-100 pr-1 text-amber-900')}>
              <button type="button" onClick={onOpenDiscount} className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />{discountMode === 'pct' ? `${discountPct}%` : 'Discount'} −{money(discountAmount, hidePrices)}
              </button>
              <button type="button" aria-label="Discount hatayein" onClick={onClearDiscount} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-amber-200"><X className="h-3 w-3" /></button>
            </span>
          ) : (
            <>
              <button type="button" onClick={onOpenDiscount} className={cn(chip, 'border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50')}>
                <Tag className="h-3.5 w-3.5" /> Discount <Kbd className="h-4">F4</Kbd>
              </button>
              {onQuickDiscount && quickDiscounts.map((pct) => (
                <button key={pct} type="button" onClick={() => onQuickDiscount(pct)} title={`${pct}% Discount`}
                  className={cn(chip, 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900')}>{pct}%</button>
              ))}
            </>
          ))}
          {delivery && onDeliveryChange && !delivery.on && (
            <button type="button" onClick={() => onDeliveryChange({ ...delivery, on: true })} title="Ghar bhejna hai? (Alt+D)"
              className={cn(chip, 'border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50')}>
              <Truck className="h-3.5 w-3.5" /> Delivery
            </button>
          )}
        </div>
      )}
      {delivery?.on && onDeliveryChange && <PosDeliveryPanel value={delivery} onChange={onDeliveryChange} compact />}

      {(!side || breakdown) && <div className="rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200/70">
        {breakdown && (
          <dl className="mb-1 space-y-0.5 border-b border-dashed border-slate-300 pb-1 text-[0.75rem]">
            <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd className="tabular-nums">{money(subtotal, hidePrices)}</dd></div>
            {totalSavings > 0 && <div className="flex justify-between text-success-700"><dt className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />Combo bachat</dt><dd className="tabular-nums">{money(totalSavings, hidePrices)}</dd></div>}
            {hasDiscount && <div className="flex justify-between text-amber-700"><dt>Discount</dt><dd className="tabular-nums">−{money(discountAmount, hidePrices)}</dd></div>}
            {extras.map((x) => <div key={x.label} className="flex justify-between text-violet-700"><dt>{x.label}</dt><dd className="tabular-nums">−{money(x.amount, hidePrices)}</dd></div>)}
            {deliveryFee > 0 && <div className="flex justify-between text-slate-600"><dt>Delivery</dt><dd className="tabular-nums">+{money(deliveryFee, hidePrices)}</dd></div>}
          </dl>
        )}
        {!side && (
          <div className="flex items-baseline justify-between">
            <span className="text-[0.8125rem] font-medium text-slate-500">Kul</span>
            <span className={cn('font-bold leading-tight tabular-nums tracking-tight text-slate-900', touch ? 'text-[2rem]' : 'text-[1.5rem]')}>{money(total, hidePrices)}</span>
          </div>
        )}
        <FbrModeIndicator saleTotal={total} />
      </div>}
      {side && !breakdown && <FbrModeIndicator saleTotal={total} />}

      <button type="button" onClick={onInstantCash} disabled={disabled}
        className={cn('flex w-full items-center justify-between gap-3 rounded-xl bg-brand-600 px-4 text-brand-fg shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50', touch ? 'h-16' : 'h-11')}>
        <span className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold"><Banknote className="h-5 w-5" /> Cash · print</span>
        <span className="inline-flex items-center gap-2">
          <span className="text-lg font-bold tabular-nums">{money(total, hidePrices)}</span>
          <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[0.6875rem]">F12</kbd>
        </span>
      </button>

      {onQuickPay ? (
        <div className={cn('grid grid-cols-5 gap-1', touch && 'gap-1.5')}>
          {QUICK.map((q) => (
            <button key={q.label} type="button" disabled={disabled || ('mode' in q.q && !customerId)} onClick={() => onQuickPay(q.q)}
              title={'mode' in q.q && !customerId ? 'Udhaar ke liye customer chunein' : `${q.label} (F8 phir ${q.key})`}
              className={cn('flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white text-[0.6875rem] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40', touch ? 'h-14' : 'h-10')}>
              <q.icon className="h-4 w-4" style={{ color: q.color }} />
              {q.label}
            </button>
          ))}
          <button type="button" disabled={disabled} onClick={onCheckout} title="Checkout — sab tareeqe, split (Ctrl+Enter)"
            className={cn('flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white text-[0.6875rem] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40', touch ? 'h-14' : 'h-10')}>
            <span className="font-mono text-[0.625rem] font-bold text-slate-500">Ctrl ↵</span>
            Checkout
          </button>
        </div>
      ) : (
        <button type="button" onClick={onCheckout} disabled={disabled}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 text-[0.875rem] font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <span>Card · JazzCash · udhaar · kuch paisa</span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-500">Ctrl ↵</kbd>
        </button>
      )}
      <p className="hidden text-center text-[0.6875rem] text-slate-400 xl:block [@media(max-height:820px)]:!hidden">F8 tareeqa chunein · F9 aur kaam · ? sab shortcuts</p>
      {!canCheckout && <p className="text-center text-[0.75rem] font-medium text-rose-700">Pehle upar se shop chunein</p>}
    </footer>
  );
}

/** One bill line: name, qty × rate, total; stepper on hover or when selected. */
export function PosCartRow(props: {
  line: PosCartLine;
  index: number;
  table?: boolean;
  extra?: ReactNode;
  hidePrices?: boolean;
  showImages?: boolean;
  density?: 'compact' | 'comfortable';
  touch?: boolean;
  active?: boolean;
  focused?: boolean;
  onSelect?: () => void;
  editingPrice: boolean;
  canEditPrice?: boolean;
  onStartPriceEdit: () => void;
  onSetPrice: (p: number) => void;
  onCancelPriceEdit: () => void;
  editingQty?: boolean;
  onStartQtyEdit?: () => void;
  onEndQtyEdit?: () => void;
  lineNotes?: boolean;
  editingNote?: boolean;
  onStartNoteEdit?: () => void;
  onEndNoteEdit?: () => void;
  onSetNote?: (note: string) => void;
  onChangeQty: (d: number) => void;
  onSetQty: (q: number) => void;
  onRemove: () => void;
}) {
  const {
    line: l, index, table, extra, hidePrices, showImages = true, density = 'compact', touch, active, focused, onSelect,
    editingPrice, canEditPrice = true, onStartPriceEdit, onSetPrice, onCancelPriceEdit,
    editingQty, onStartQtyEdit, onEndQtyEdit, lineNotes, editingNote, onStartNoteEdit, onEndNoteEdit, onSetNote,
    onChangeQty, onSetQty, onRemove,
  } = props;
  const customPriced = Number(l.unitPrice) !== Number(l.basePrice);
  const comfy = density === 'comfortable' || touch;
  const tags = [
    l.variantName && { t: l.variantName, c: 'bg-slate-100 text-slate-600' },
    l.serialNumber && { t: `S/N ${l.serialNumber}`, c: 'bg-slate-100 font-mono text-slate-600' },
    l.imei && { t: `IMEI ${l.imei}`, c: 'bg-slate-100 font-mono text-slate-600' },
    l.type === 'combo' && { t: 'Combo', c: 'bg-violet-50 text-violet-700' },
    customPriced && { t: 'Rate badla', c: 'bg-amber-50 text-amber-700' },
    l.warrantyMonths && { t: `${l.warrantyMonths}m warranty`, c: 'bg-sky-50 text-sky-700' },
  ].filter(Boolean) as Array<{ t: string; c: string }>;

  const qtyField = editingQty
    ? <NumberEdit initial={l.quantity} label="Qty" width="w-14" onCommit={(v) => { if (v !== l.quantity) onSetQty(v); onEndQtyEdit?.(); }} onCancel={() => onEndQtyEdit?.()}
        onTab={canEditPrice ? () => { onEndQtyEdit?.(); onStartPriceEdit(); } : undefined} />
    : null;
  const priceField = editingPrice
    ? <NumberEdit initial={l.unitPrice} label="Rate" width="w-20" tone="amber" onCommit={(v) => onSetPrice(v)} onCancel={onCancelPriceEdit}
        extra={customPriced ? <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSetPrice(l.basePrice)} className="text-[0.6875rem] font-medium text-slate-500 hover:text-slate-800">Asal rate</button> : undefined} />
    : null;
  const rate = (
    <button type="button" tabIndex={-1} onClick={canEditPrice ? onStartPriceEdit : undefined} title={canEditPrice ? 'Rate badlein (Enter phir Tab, ya R)' : undefined}
      className={cn('tabular-nums', canEditPrice ? 'hover:text-brand-700 hover:underline' : 'cursor-default')}>
      {money(l.unitPrice, hidePrices)}{customPriced && <span className="ml-1 text-slate-400 line-through">{money(l.basePrice, hidePrices)}</span>}
    </button>
  );
  const stepper = (always: boolean) => (
    <span className={cn('inline-flex items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200', touch ? 'h-8' : 'h-6',
      !always && !active && 'invisible group-hover:visible')}>
      <button type="button" tabIndex={-1} aria-label="Kam" disabled={l.lockQty} onClick={() => onChangeQty(-1)}
        className={cn('flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30', touch ? 'h-8 w-8' : 'h-6 w-6')}><Minus className="h-3 w-3" /></button>
      {always && (qtyField ?? (
        <button type="button" tabIndex={-1} onClick={onStartQtyEdit} disabled={l.lockQty} className="min-w-8 px-1 text-center text-[0.8125rem] font-bold tabular-nums text-slate-900">{qtyText(l.quantity)}</button>
      ))}
      <button type="button" tabIndex={-1} aria-label="Zyada" disabled={l.lockQty} onClick={() => onChangeQty(1)}
        className={cn('flex items-center justify-center bg-brand-600 text-brand-fg hover:bg-brand-700 disabled:opacity-30', touch ? 'h-8 w-8' : 'h-6 w-6')}><Plus className="h-3 w-3" /></button>
    </span>
  );
  const removeBtn = (
    <button type="button" tabIndex={-1} aria-label="Hatayein" onClick={onRemove}
      className={cn('flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600', !active && 'invisible group-hover:visible max-lg:visible')}>
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
  const noteBtn = lineNotes && !editingNote && (
    <button type="button" tabIndex={-1} aria-label="Note (N)" title="Note (N)" onClick={onStartNoteEdit}
      className={cn('flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-700', !active && !l.customNote && 'invisible group-hover:visible')}>
      <StickyNote className="h-3.5 w-3.5" />
    </button>
  );
  const unitHint = isWeightUnit(l.unitName) ? l.unitName : l.conversionRate !== 1 ? `${l.unitName} (= ${qtyText(l.baseQuantity)} ${l.baseUnit})` : l.unitName;
  const meta = (tags.length > 0 || extra || l.customNote || editingNote) && (
    <div className="mt-0.5 space-y-0.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => <span key={t.t} className={cn('inline-flex items-center gap-0.5 rounded px-1 py-px text-[0.625rem] font-medium', t.c)}>{t.t.includes('warranty') && <Shield className="h-2.5 w-2.5" />}{t.t}</span>)}
        </div>
      )}
      {extra}
      {editingNote ? (
        <NoteEdit initial={l.customNote ?? ''} onCommit={(v) => { onSetNote?.(v); onEndNoteEdit?.(); }} onCancel={() => onEndNoteEdit?.()} />
      ) : l.customNote ? (
        <button type="button" tabIndex={-1} onClick={onStartNoteEdit} className="block max-w-full truncate text-left text-[0.6875rem] italic text-slate-500">“{l.customNote}”</button>
      ) : null}
    </div>
  );
  const rowClass = cn('group relative transition', active ? (focused ? 'bg-brand-50 ring-2 ring-inset ring-brand-500' : 'bg-brand-50/60') : 'hover:bg-slate-50/70');
  const thumb = showImages && (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg', comfy ? 'h-9 w-9 text-lg' : 'h-7 w-7 text-sm', !l.image && 'bg-gradient-to-br', !l.image && (l.type === 'combo' ? 'from-violet-100 to-fuchsia-200' : productTint(l.name)))}>
      {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : <span>{l.type === 'combo' ? '🎁' : productEmoji(l.name)}</span>}
    </span>
  );

  if (table) {
    return (
      <tr data-line-id={l.id} role="option" aria-selected={!!active} onClick={onSelect} className={cn(rowClass, 'align-middle')}>
        <td className={cn('pl-3 text-[0.75rem] tabular-nums text-slate-400', comfy ? 'py-2' : 'py-1')}>{index + 1}</td>
        <td className={cn('pr-2', comfy ? 'py-2' : 'py-1')}>
          <div className="flex items-center gap-2">
            {thumb}
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900" title={l.name}>{l.name}</p>
              {meta}
            </div>
          </div>
        </td>
        <td className="text-center">
          <div className="flex items-center justify-center gap-1">{stepper(true)}{(isWeightUnit(l.unitName) || l.conversionRate !== 1) && <span className="text-[0.625rem] text-slate-400">{l.unitName}</span>}</div>
        </td>
        <td className="text-right">{priceField ?? rate}</td>
        <td className="text-right font-bold tabular-nums text-slate-900">{money(l.lineTotal, hidePrices)}</td>
        <td><div className="flex items-center justify-center">{noteBtn}{removeBtn}</div></td>
      </tr>
    );
  }

  if (!comfy) {
    // Compact: one row — name, qty × rate (stepper on hover / when selected), total.
    const editingAny = editingQty || editingPrice;
    return (
      <li data-line-id={l.id} role="option" aria-selected={!!active} onClick={onSelect} className={cn(rowClass, 'px-3 py-1')}>
        <div className="flex h-7 items-center gap-2">
          {showImages && (
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md text-[0.8125rem]', !l.image && 'bg-gradient-to-br', !l.image && (l.type === 'combo' ? 'from-violet-100 to-fuchsia-200' : productTint(l.name)))}>
              {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : <span>{l.type === 'combo' ? '🎁' : productEmoji(l.name)}</span>}
            </span>
          )}
          <p className="min-w-[4.5rem] flex-1 truncate text-[0.8125rem] font-medium text-slate-900" title={l.name}>{l.name}</p>
          {editingAny ? (
            <span className="flex shrink-0 items-center gap-1 text-[0.75rem] text-slate-500">{qtyField ?? qtyText(l.quantity)} × {priceField ?? rate}</span>
          ) : (
            <>
              <span className={cn('shrink-0 items-center gap-1 text-[0.75rem] tabular-nums text-slate-500', active ? 'hidden' : 'flex group-hover:hidden')}>
                <b className="font-semibold text-slate-700">{qtyText(l.quantity)}</b>{!isWeightUnit(l.unitName) && l.conversionRate === 1 ? '' : ` ${l.unitName}`} × {money(l.unitPrice, hidePrices)}
                {customPriced && <span className="rounded bg-amber-50 px-1 text-[0.625rem] font-semibold text-amber-700">rate badla</span>}
              </span>
              <span className={cn('shrink-0 items-center gap-1', active ? 'flex' : 'hidden group-hover:flex')}>
                {noteBtn}
                {stepper(true)}
                <span className="text-[0.75rem] text-slate-500">×</span>
                <button type="button" tabIndex={-1} onClick={canEditPrice ? onStartPriceEdit : undefined} className="text-[0.75rem] tabular-nums text-slate-500 hover:text-brand-700">{money(l.unitPrice, hidePrices)}</button>
              </span>
            </>
          )}
          <p className="min-w-[4.75rem] shrink-0 whitespace-nowrap text-right text-[0.8125rem] font-bold tabular-nums text-slate-900">{money(l.lineTotal, hidePrices)}</p>
          <span className={cn('shrink-0', active ? 'block' : 'hidden group-hover:block max-lg:block')}>{removeBtn}</span>
        </div>
        {meta && <div className={cn(showImages && 'pl-8')}>{meta}</div>}
      </li>
    );
  }

  return (
    <li data-line-id={l.id} role="option" aria-selected={!!active} onClick={onSelect} className={cn(rowClass, 'px-3', comfy ? 'py-2' : 'py-1')}>
      <div className="flex items-center gap-2">
        {thumb}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn('truncate font-medium leading-snug text-slate-900', touch ? 'text-[0.9375rem]' : 'text-[0.8125rem]')} title={l.name}>{l.name}</p>
            <p className={cn('shrink-0 font-bold tabular-nums text-slate-900', touch ? 'text-[0.9375rem]' : 'text-[0.8125rem]')}>{money(l.lineTotal, hidePrices)}</p>
          </div>
          <div className="flex min-h-6 items-center justify-between gap-2 text-[0.75rem] text-slate-500">
            <span className="flex min-w-0 items-center gap-1 truncate">
              {qtyField ?? (
                <button type="button" tabIndex={-1} onClick={onStartQtyEdit} disabled={l.lockQty} className="font-semibold tabular-nums text-slate-700 hover:text-brand-700">{qtyText(l.quantity)}</button>
              )}
              <span>×</span>
              {priceField ?? rate}
              <span className="truncate text-slate-400">/ {unitHint}</span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              {noteBtn}
              {stepper(false)}
              {removeBtn}
            </span>
          </div>
          {meta}
        </div>
      </div>
    </li>
  );
}

/** Small number box used for qty and rate edits: Enter saves, Esc leaves, Tab moves on. */
function NumberEdit({ initial, label, width, tone, onCommit, onCancel, onTab, extra }: {
  initial: number; label: string; width: string; tone?: 'amber';
  onCommit: (v: number) => void; onCancel: () => void; onTab?: () => void; extra?: ReactNode;
}) {
  const [draft, setDraft] = useState(String(initial));
  const done = useRef(false);
  const commit = () => {
    if (done.current) return;
    done.current = true;
    const v = Number(draft);
    if (draft !== '' && Number.isFinite(v) && v >= 0) onCommit(v); else onCancel();
  };
  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input autoFocus inputMode="decimal" aria-label={label} value={draft} onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); done.current = true; onCancel(); }
          if (e.key === 'Tab' && onTab) { e.preventDefault(); commit(); onTab(); }
        }}
        onBlur={commit}
        className={cn('h-6 rounded border px-1 text-center text-[0.8125rem] font-bold tabular-nums outline-none', width,
          tone === 'amber' ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-brand-400 bg-white text-slate-900')} />
      {extra}
    </span>
  );
}

function NoteEdit({ initial, onCommit, onCancel }: { initial: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const done = useRef(false);
  const commit = () => { if (done.current) return; done.current = true; onCommit(draft); };
  return (
    <input autoFocus value={draft} maxLength={120} placeholder="Is cheez ka note — Enter se save" aria-label="Line note"
      onClick={(e) => e.stopPropagation()} onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); done.current = true; onCancel(); }
      }}
      onBlur={commit}
      className="h-6 w-full rounded border border-slate-300 bg-white px-1.5 text-[0.75rem] outline-none focus:border-brand-500" />
  );
}
