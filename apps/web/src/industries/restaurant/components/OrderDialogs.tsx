/**
 * Dialogs for a running order: void a dish, cancel the order, change the
 * bill's charges, merge another table's order in, and move some dishes to a
 * separate bill. Each shows what will happen before it is saved; the server
 * checks the same rules again (PIN for a dish the kitchen already has).
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { teamApi } from '@modules/organization/team/api/team.api';
import { ordersApi, type OrderCharges, type OrderItem, type RestaurantOrder } from '../api/orders.api';
import { itemName, lineExtras, orderTitle } from '../lib/orderMeta';

const VOID_REASONS = ['Customer ne mana kar diya', 'Ghalat order likha', 'Der ho gayi', 'Khana kharab tha', 'Item khatam'];

const r2 = (n: number) => Math.round(n * 100) / 100;

function ReasonPicker({ value, onChange, reasons }: { value: string; onChange: (v: string) => void; reasons: string[] }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <button key={r} type="button" onClick={() => onChange(r)}
            className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium', value === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{r}</button>
        ))}
      </div>
      <input data-autofocus value={value} onChange={(e) => onChange(e.target.value.slice(0, 200))} placeholder="Wajah likhein" aria-label="Wajah"
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      {value.trim().length > 0 && value.trim().length < 3 && <p className="mt-1 text-[0.75rem] text-rose-600">Wajah thori aur wazeh likhein</p>}
    </div>
  );
}

/** Take a dish (or part of it) off the bill. */
export function VoidItemDialog({ item, saving, onConfirm, onClose }: {
  item: OrderItem; saving?: boolean;
  onConfirm: (d: { quantity: number; reason: string }) => void; onClose: () => void;
}) {
  const [qty, setQty] = useState(item.quantity);
  const [reason, setReason] = useState(item.sentToKitchenAt ? '' : 'Kitchen se pehle hataya');
  const sent = !!item.sentToKitchenAt;
  const unit = (item.basePrice ?? 0) + (item.modifierTotal ?? 0);
  const ok = reason.trim().length >= 3 && qty > 0;
  return (
    <Modal open onClose={onClose} size="md" title={`${item.product?.name ?? 'Item'} hatayein`}
      description={sent ? 'Ye dish kitchen ja chuki hai — void hogi, record me rahegi aur kitchen ko cancel ticket jayega.' : 'Abhi kitchen nahi gayi — seedha hat jayegi.'}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" loading={saving} disabled={!ok} onClick={() => onConfirm({ quantity: qty, reason: reason.trim() })}>{sent ? 'Void karein' : 'Hatayein'} · {formatPKR(unit * qty)}</Button></div>}>
      <div className="space-y-4">
        {item.quantity > 1 && (
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
            <span className="text-[0.875rem] text-slate-700">Kitne hatane hain?</span>
            <div className="inline-flex items-center rounded-xl bg-white p-1 ring-1 ring-slate-200">
              <button type="button" aria-label="Kam" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
              <span className="w-12 text-center font-bold tabular-nums">{qty} / {item.quantity}</span>
              <button type="button" aria-label="Zyada" onClick={() => setQty((q) => Math.min(item.quantity, q + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {sent && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Is ke liye "Bill void" ki ijazat ya malik/manager ka PIN chahiye.</p>}
        <ReasonPicker value={reason} onChange={setReason} reasons={VOID_REASONS} />
      </div>
    </Modal>
  );
}

/** Cancel an unpaid order with a reason. */
export function CancelOrderDialog({ order, saving, onConfirm, onClose }: {
  order: RestaurantOrder; saving?: boolean; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const sent = order.items.some((it) => !it.isReturned && it.sentToKitchenAt);
  return (
    <Modal open onClose={onClose} size="md" title={`${orderTitle(order)} ka order cancel`}
      description={`${formatPKR(order.total)} ka bill nahi banega. Order record me "Cancel" dikhega.`}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" loading={saving} disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>Order cancel karein</Button></div>}>
      <div className="space-y-4">
        {sent && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Kuch dishes kitchen ja chuki hain — "Bill void" ki ijazat ya PIN chahiye, aur kitchen ko cancel ticket jayega.</p>}
        {order.paidAmount > 0 && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">Is order par {formatPKR(order.paidAmount)} pehle mil chuke hain — customer ko wapas karna hoga.</p>}
        <ReasonPicker value={reason} onChange={setReason} reasons={['Customer chala gaya', 'Ghalat order', 'Duplicate order', 'Kitchen nahi bana saka']} />
      </div>
    </Modal>
  );
}

/** Service charge, tax, discount, packing, delivery, tip, guests and waiter of an open order. */
export function ChargesDialog({ order, saving, onSave, onClose }: {
  order: RestaurantOrder; saving?: boolean;
  onSave: (d: OrderCharges & { numberOfGuests?: number; waiterId?: string; customerName?: string; customerPhone?: string; specialRequests?: string }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    serviceChargePct: String(order.serviceChargePct || ''), taxPct: String(order.taxPct || ''), discount: String(order.discount || ''),
    packagingFee: String(order.packagingFee || ''), deliveryFee: String(order.deliveryFee || ''), tip: String(order.tip || ''),
    numberOfGuests: String(order.numberOfGuests || ''), waiterId: order.waiterId ?? '', customerName: order.customerName ?? '', customerPhone: order.customerPhone ?? '',
    specialRequests: order.specialRequests ?? '',
  });
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
  const n = (v: string) => Number(v) || 0;
  const service = r2(order.subtotal * n(f.serviceChargePct) / 100);
  const tax = r2((order.subtotal + service) * n(f.taxPct) / 100);
  const delivery = order.mode === 'DELIVERY' ? n(f.deliveryFee) : 0;
  const total = r2(Math.max(order.subtotal + service + tax + delivery + n(f.packagingFee) + n(f.tip) - n(f.discount), 0));
  const problem = n(f.serviceChargePct) > 100 || n(f.taxPct) > 100 ? 'Percent 100 se zyada nahi'
    : n(f.discount) > order.subtotal + service + tax + delivery + n(f.packagingFee) ? 'Discount bill se zyada hai'
      : total < order.paidAmount - 0.01 ? `${formatPKR(order.paidAmount)} pehle mil chuke — bill is se kam nahi ho sakta` : null;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const num = (k: keyof typeof f, label: string, hint?: string) => (
    <label className="text-[0.8125rem] font-medium text-slate-700">{label}
      <input value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.]/g, '').slice(0, 9) }))} inputMode="decimal" placeholder="0"
        className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      {hint && <span className="mt-0.5 block text-[0.75rem] font-normal text-slate-500">{hint}</span>}
    </label>
  );
  return (
    <Modal open onClose={onClose} size="lg" title="Bill ke charges" description="Service, tax aur discount badlein — naya total neeche dikhta hai"
      footer={<div className="flex w-full items-center justify-between gap-3">
        <span className="text-[0.875rem] text-slate-600">Naya total <b className="text-[1.125rem] tabular-nums text-slate-900">{formatPKR(total)}</b></span>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
          <Button loading={saving} disabled={!!problem} onClick={() => onSave({
            serviceChargePct: n(f.serviceChargePct), taxPct: n(f.taxPct), discount: n(f.discount), packagingFee: n(f.packagingFee), tip: n(f.tip),
            ...(order.mode === 'DELIVERY' && { deliveryFee: n(f.deliveryFee) }),
            ...(n(f.numberOfGuests) > 0 && { numberOfGuests: Math.round(n(f.numberOfGuests)) }),
            waiterId: f.waiterId, customerName: f.customerName, customerPhone: f.customerPhone, specialRequests: f.specialRequests,
          })}>Save karein</Button></div></div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {num('serviceChargePct', 'Service charge %')}
          {num('taxPct', 'Tax %')}
          {num('discount', 'Discount (Rs)', 'Had se zyada ho to payment par PIN')}
          {num('packagingFee', 'Packing (Rs)')}
          {order.mode === 'DELIVERY' && num('deliveryFee', 'Delivery charge (Rs)')}
          {num('tip', 'Tip (Rs)')}
          {order.mode === 'DINE_IN' && num('numberOfGuests', 'Mehman')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[0.8125rem] font-medium text-slate-700">Waiter
            <select value={f.waiterId} onChange={set('waiterId')} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-[0.875rem] font-normal">
              <option value="">—</option>
              {team.filter((m) => m.isActive || m.id === f.waiterId).map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
          </label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Customer ka naam
            <input value={f.customerName} onChange={set('customerName')} maxLength={120} className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal outline-none focus:border-brand-500" />
          </label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Phone
            <input value={f.customerPhone} onChange={(e) => setF((x) => ({ ...x, customerPhone: e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 30) }))} inputMode="tel" className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal outline-none focus:border-brand-500" />
          </label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Order note
            <input value={f.specialRequests} onChange={set('specialRequests')} maxLength={500} className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal outline-none focus:border-brand-500" />
          </label>
        </div>
        {problem && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{problem}</p>}
      </div>
    </Modal>
  );
}

/** Bring another open order (another table) into this bill. */
export function MergeDialog({ order, saving, onConfirm, onClose }: {
  order: RestaurantOrder; saving?: boolean; onConfirm: (fromOrderId: string) => void; onClose: () => void;
}) {
  const { data = [], isLoading } = useQuery({ queryKey: ['restaurant-orders-open-merge'], queryFn: () => ordersApi.list({ open: true }) });
  const others = data.filter((o) => o.id !== order.id && !o.saleId && o.status !== 'CANCELLED' && o.status !== 'COMPLETED');
  const [pick, setPick] = useState('');
  const chosen = others.find((o) => o.id === pick);
  return (
    <Modal open onClose={onClose} size="md" title={`${orderTitle(order)} me doosra order milayein`}
      description="Doosre order ki dishes, kitchen tickets aur payment is bill me aa jayengi; us ki table khaali ho jayegi."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={saving} disabled={!chosen} onClick={() => chosen && onConfirm(chosen.id)}>{chosen ? `${orderTitle(chosen)} milayein` : 'Order chunein'}</Button></div>}>
      {isLoading ? <p className="py-6 text-center text-[0.875rem] text-slate-500">Orders aa rahe hain…</p> : !others.length ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-[0.875rem] text-slate-600">Koi aur khula order nahi</p>
      ) : (
        <ul className="max-h-80 space-y-1.5 overflow-y-auto">
          {others.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => setPick(o.id)}
                className={cn('flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left ring-1', pick === o.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50')}>
                <span className="min-w-0"><span className="block text-[0.875rem] font-semibold text-slate-900">{orderTitle(o)}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{o.orderNumber} · {o.items.length} item</span></span>
                <span className="text-[0.875rem] font-bold tabular-nums">{formatPKR(o.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Some guests pay for what they ate: the chosen dishes move to a separate bill on the same table. */
export function SplitItemsDialog({ order, saving, onConfirm, onClose }: {
  order: RestaurantOrder; saving?: boolean; onConfirm: (lines: Array<{ itemId: string; quantity: number }>) => void; onClose: () => void;
}) {
  const live = order.items.filter((it) => !it.isReturned && it.id);
  const [qty, setQty] = useState<Record<string, number>>({});
  const picked = live.filter((it) => (qty[it.id!] ?? 0) > 0);
  const amount = useMemo(() => r2(picked.reduce((s, it) => s + ((it.total ?? 0) / it.quantity) * qty[it.id!], 0)), [picked, qty]);
  const all = live.every((it) => (qty[it.id!] ?? 0) >= it.quantity);
  return (
    <Modal open onClose={onClose} size="lg" title="Bill alag karein (dishes se)" description="Jo dishes alag bill par jani hain un ki tadaad chunein. Service aur tax ka % saath jata hai."
      footer={<div className="flex w-full items-center justify-between gap-3">
        <span className="text-[0.875rem] text-slate-600">Naya bill ~ <b className="tabular-nums text-slate-900">{formatPKR(amount)}</b></span>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
          <Button loading={saving} disabled={!picked.length || all} onClick={() => onConfirm(picked.map((it) => ({ itemId: it.id!, quantity: qty[it.id!] })))}>
            {all ? 'Kuch dishes pehle bill par rehni chahiye' : 'Alag bill banayein'}</Button></div></div>}>
      <ul className="divide-y divide-slate-100">
        {live.map((it) => {
          const q = qty[it.id!] ?? 0;
          return (
            <li key={it.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold text-slate-900">{it.quantity}× {itemName(it)}</p>
                {lineExtras(it) && <p className="truncate text-[0.75rem] text-slate-500">{lineExtras(it)}</p>}
              </div>
              <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5">
                <button type="button" aria-label="Kam" onClick={() => setQty((x) => ({ ...x, [it.id!]: Math.max(0, q - 1) }))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-bold tabular-nums">{q}</span>
                <button type="button" aria-label="Zyada" onClick={() => setQty((x) => ({ ...x, [it.id!]: Math.min(it.quantity, q + 1) }))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white"><Plus className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
