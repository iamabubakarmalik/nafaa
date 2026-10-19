/**
 * The bill side of the salon counter: customer and their perks
 * (membership, packages), gift voucher, service lines with stylist, price,
 * package session, colour notes and products used, retail products,
 * discount, tip and the totals down to what is due after the advance.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronDown, ChevronUp, Crown, Droplet, Gift, Minus, Package, Plus, Receipt, Scissors, Ticket, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Kbd, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { StaffProfile } from '../api/staff-profiles.api';
import { giftVouchersApi } from '../api/gift-vouchers.api';
import { CustomerField, ProductPicker } from '../components/fields';
import { apiError, dateOf, minutes, staffName } from '../lib/meta';
import type { SalonBillState, ServiceLine } from './useSalonBill';

const money = (n: number) => formatPKR(n);

export function BillPanel({ bill, stylists, onCheckout, busy }: {
  bill: SalonBillState;
  stylists: StaffProfile[];
  onCheckout: () => void;
  busy: boolean;
}) {
  const [usedFor, setUsedFor] = useState<ServiceLine | null>(null);
  const b = bill;
  const minutesTotal = b.lines.reduce((s, l) => s + l.durationMinutes, 0);

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="space-y-2 border-b border-slate-100 p-3">
        {b.appointment && (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-[0.8125rem] text-violet-900 ring-1 ring-violet-100">
            <CalendarCheck className="h-4 w-4 shrink-0" />
            <Link to={`/salon/appointments/${b.appointment.id}`} className="font-semibold hover:underline">{b.appointment.number}</Link>
            {b.advance > 0 && <span className="text-violet-700">· Advance {money(b.advance)}</span>}
            <button type="button" onClick={() => b.setAppointment(null)} aria-label="Appointment hatayein" className="ml-auto rounded-md p-1 hover:bg-violet-100"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <CustomerField value={b.customer} onChange={b.setCustomer} compact locked={!!b.appointment && !!b.customer.customerId} />
        {!b.customer.customerId && (
          <div className="grid grid-cols-2 gap-2">
            <Input size="sm" value={b.customer.name} onChange={(e) => b.setCustomer({ ...b.customer, name: e.target.value })} placeholder="Walk-in naam (marzi)" maxLength={120} />
            <Input size="sm" inputMode="tel" value={b.customer.phone} onChange={(e) => b.setCustomer({ ...b.customer, phone: e.target.value.replace(/[^\d+\- ]/g, '') })} placeholder="Phone (marzi)" maxLength={20} />
          </div>
        )}
        {b.perks?.membership && (
          <label className={cn('flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[0.8125rem] ring-1', b.useMembership ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-slate-50 text-slate-700 ring-slate-200')}>
            <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={b.useMembership} onChange={(e) => b.setUseMembership(e.target.checked)} />
            <Crown className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{b.perks.membership.planName} membership — services par {b.perks.membership.discountPct}% discount</span>
          </label>
        )}
        {!!b.perks?.packages.length && (
          <p className="flex items-center gap-2 rounded-xl bg-success-50 px-3 py-2 text-[0.8125rem] text-success-800 ring-1 ring-success-100">
            <Gift className="h-4 w-4 shrink-0" />
            {b.perks.packages.map((p) => `${p.packageName}: ${p.sessionsRemaining} session baqi`).join(' · ')}
          </p>
        )}
        <VoucherField bill={b} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!b.count ? (
          <div className="px-6 py-14 text-center">
            <Scissors className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-2 text-[0.9375rem] font-semibold text-slate-800">Bill khali hai</p>
            <p className="mt-1 text-[0.8125rem] text-slate-500">Service par click karein, ya baayen queue se customer chunein.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {b.priced.map(({ line, list, total }) => (
              <ServiceRow key={line.key} line={line} list={list} total={total} bill={b} stylists={stylists} onUsed={() => setUsedFor(line)} />
            ))}
            {b.products.map((p) => (
              <li key={p.key} className="flex items-center gap-2 px-3 py-2.5">
                <Package className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-medium text-slate-900">{p.name}</p>
                  <p className={cn('text-[0.6875rem]', p.quantity > p.stock ? 'font-semibold text-rose-600' : 'text-slate-500')}>Stock {p.stock} {p.unit}</p>
                </div>
                <div className="flex items-center rounded-lg ring-1 ring-slate-200">
                  <button type="button" aria-label="Kam" onClick={() => b.updateProduct(p.key, { quantity: p.quantity - 1 })} className="p-1.5 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-7 text-center text-[0.8125rem] tabular-nums">{p.quantity}</span>
                  <button type="button" aria-label="Zyada" onClick={() => b.updateProduct(p.key, { quantity: p.quantity + 1 })} className="p-1.5 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <input aria-label="Rate" inputMode="decimal" value={p.price} onChange={(e) => b.updateProduct(p.key, { price: Math.max(Number(e.target.value) || 0, 0) })}
                  className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-right text-[0.8125rem] tabular-nums" />
                <button type="button" aria-label="Hatayein" onClick={() => b.updateProduct(p.key, { quantity: 0 })} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Input size="sm" label="Discount (Rs)" inputMode="decimal" value={b.discount} onChange={(e) => b.setDiscount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
          <Input size="sm" label="Tip staff ke liye" inputMode="decimal" value={b.tip} onChange={(e) => b.setTip(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
        </div>
        <dl className="space-y-1 text-[0.8125rem]">
          {b.servicesTotal > 0 && <Row label={`Services (${b.lines.length}${minutesTotal ? ` · ${minutes(minutesTotal)}` : ''})`} value={money(b.servicesTotal)} />}
          {b.productsTotal > 0 && <Row label="Products" value={money(b.productsTotal)} />}
          {b.memberSaved > 0 && <Row label="Membership bachat" value={`−${money(b.memberSaved)}`} tone="text-amber-700" />}
          {b.packageCovered > 0 && <Row label="Package se (pehle se paid)" value={money(b.packageCovered)} tone="text-success-700" />}
          {b.voucherRs > 0 && <Row label={`Gift voucher ${b.voucher?.code}`} value={`−${money(b.voucherRs)}`} tone="text-success-700" />}
          {b.discountRs > 0 && <Row label="Discount" value={`−${money(b.discountRs)}`} tone="text-rose-600" />}
          {b.tipRs > 0 && <Row label="Tip" value={`+${money(b.tipRs)}`} />}
          <Row label="Kul bill" value={money(b.total)} strong />
          {b.advance > 0 && <Row label="Advance pehle mila" value={`−${money(Math.min(b.advance, b.total))}`} tone="text-success-700" />}
        </dl>
        <Button fullWidth size="lg" onClick={onCheckout} loading={busy} disabled={!b.count} leftIcon={<Receipt className="h-5 w-5" />}>
          {b.advance > 0 ? `Baqi lein ${money(b.due)}` : `Bill ${money(b.total)}`} <Kbd className="ml-2 hidden bg-white/20 text-white sm:inline-flex">F12</Kbd>
        </Button>
        {!!b.count && <button type="button" onClick={b.reset} className="w-full text-center text-[0.75rem] text-slate-500 hover:text-rose-600">Bill saaf karein</button>}
      </div>

      {usedFor && (
        <UsedModal line={usedFor} onClose={() => setUsedFor(null)} onAdd={(p, q) => { b.addUsed(usedFor.key, p, q); setUsedFor(null); }} />
      )}
    </aside>
  );
}

/** Gift voucher on the bill: type the code, see the balance, use all of it or a part. */
function VoucherField({ bill: b }: { bill: SalonBillState }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const find = async () => {
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    try {
      const v = await giftVouchersApi.lookup(c);
      b.setVoucher(v);
      b.setVoucherAsk('');
      setCode('');
      if (v.problem) toast.error(`${v.code}: ${v.problem}`);
    } catch (e) {
      toast.error(apiError(e, 'Voucher nahi mila'));
    } finally {
      setBusy(false);
    }
  };
  const v = b.voucher;
  if (!v) {
    return (
      <div className="flex gap-2">
        <Input size="sm" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Gift voucher code (GV-…)" maxLength={20} wrapperClassName="min-w-0 flex-1"
          leftIcon={<Ticket className="h-4 w-4" />} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void find(); } }} />
        <Button size="sm" variant="secondary" onClick={find} loading={busy} disabled={!code.trim()}>Lagayein</Button>
      </div>
    );
  }
  return (
    <div className={cn('rounded-xl px-3 py-2 text-[0.8125rem] ring-1', v.problem ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-success-50 text-success-900 ring-success-100')}>
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{v.code}</span>
          {v.problem ? ` — ${v.problem}` : ` · balance ${money(v.balance)}${v.expiryDate ? ` · ${dateOf(v.expiryDate)} tak` : ''}${v.customerName ? ` · ${v.customerName}` : ''}`}
        </span>
        <button type="button" onClick={() => { b.setVoucher(null); b.setVoucherAsk(''); }} aria-label="Voucher hatayein" className="rounded-md p-1 hover:bg-white/60"><X className="h-3.5 w-3.5" /></button>
      </div>
      {!v.problem && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[0.75rem]">Is bill par</span>
          <input aria-label="Voucher se kitna" inputMode="decimal" value={b.voucherAsk} placeholder={String(b.voucherRs)}
            onChange={(e) => b.setVoucherAsk(e.target.value.replace(/[^\d.]/g, ''))}
            className="h-7 w-24 rounded-lg border border-success-200 bg-white px-2 text-right text-[0.8125rem] tabular-nums" />
          <span className="text-[0.75rem] text-success-700">{b.voucherRs > 0 ? `−${money(b.voucherRs)}` : 'Pehle service ya cheez jorein'}</span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-2', strong && 'border-t border-slate-200 pt-1.5 text-[0.9375rem] font-bold text-slate-900')}>
      <dt className={cn(!strong && 'text-slate-500')}>{label}</dt>
      <dd className={cn('tabular-nums', tone)}>{value}</dd>
    </div>
  );
}

function ServiceRow({ line, list, total, bill, stylists, onUsed }: {
  line: ServiceLine; list: number; total: number; bill: SalonBillState; stylists: StaffProfile[]; onUsed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const packages = (bill.perks?.packages ?? []).filter((p) => !p.serviceIds.length || p.serviceIds.includes(line.serviceId));
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Scissors className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{line.name}</p>
          <select aria-label="Stylist" value={line.staffProfileId} onChange={(e) => bill.updateLine(line.key, { staffProfileId: e.target.value })}
            className={cn('mt-1 h-8 w-full rounded-lg border bg-white px-2 text-[0.8125rem]', line.staffProfileId ? 'border-slate-200' : 'border-amber-300 text-amber-800')}>
            <option value="">— Stylist chunein (commission) —</option>
            {stylists.map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}
          </select>
        </div>
        <div className="w-24 shrink-0 text-right">
          {line.packagePurchaseId ? (
            <p className="pt-1 text-[0.8125rem] font-semibold text-success-700">Package</p>
          ) : (
            <input aria-label="Rate" inputMode="decimal" value={line.price ?? total}
              onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); bill.updateLine(line.key, { price: v === '' ? null : Number(v) }); }}
              className={cn('h-8 w-full rounded-lg border px-2 text-right text-[0.875rem] font-semibold tabular-nums', line.price != null && line.price < list ? 'border-rose-300 text-rose-700' : 'border-slate-200')} />
          )}
          {line.price != null && !line.packagePurchaseId && Math.abs(line.price - list) > 0.009 && <p className="text-[0.6875rem] text-slate-400 line-through">{formatPKR(list)}</p>}
        </div>
        <button type="button" aria-label="Hatayein" onClick={() => bill.removeLine(line.key)} className="mt-1 rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="ml-6 mt-1.5 flex flex-wrap items-center gap-1.5">
        {packages.length > 0 && (
          <select aria-label="Package" value={line.packagePurchaseId} onChange={(e) => bill.updateLine(line.key, { packagePurchaseId: e.target.value })}
            className="h-7 rounded-lg border border-success-200 bg-success-50 px-1.5 text-[0.75rem] text-success-800">
            <option value="">Package nahi</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.packageName} ({p.sessionsRemaining} baqi)</option>)}
          </select>
        )}
        <button type="button" onClick={onUsed} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
          <Droplet className="h-3.5 w-3.5" /> Istemal
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
          Note {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {line.used.map((u) => (
          <span key={u.key} className="inline-flex h-7 items-center gap-1 rounded-lg bg-sky-50 pl-2 pr-1 text-[0.75rem] text-sky-800 ring-1 ring-sky-100">
            {u.name} · {u.quantity} {u.unit}
            <button type="button" aria-label="Hatayein" onClick={() => bill.removeUsed(line.key, u.key)} className="rounded p-0.5 hover:bg-sky-100"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      {(open || line.notes) && (
        <textarea value={line.notes} onChange={(e) => bill.updateLine(line.key, { notes: e.target.value })} rows={2} maxLength={500}
          placeholder="Colour formula, developer, waqt… (customer ki history me rehta hai)"
          className="ml-6 mt-1.5 w-[calc(100%-1.5rem)] rounded-lg border border-slate-200 px-2 py-1.5 text-[0.8125rem]" />
      )}
    </li>
  );
}

/** Product used up on a service: stock goes down at cost, the customer is not charged. */
function UsedModal({ line, onAdd, onClose }: { line: ServiceLine; onAdd: (p: Product, qty: number) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const q = Number(qty);
  return (
    <Modal open onClose={onClose} size="md" title={`${line.name} — kya istemal hua?`}
      description="Shampoo, colour, wax… stock se kat jata hai aur profit me Cost ban kar ginta hai. Customer ke bill me paisa nahi lagta."
      footer={picked ? <>
        <Button variant="secondary" onClick={() => setPicked(null)}>Wapas</Button>
        <Button disabled={!(q > 0)} onClick={() => onAdd(picked, q)}>Jorein</Button>
      </> : undefined}>
      {picked ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem] font-medium text-slate-900 ring-1 ring-slate-200">{picked.name}</p>
          <Input label={`Kitna (${picked.unit || 'pcs'})`} inputMode="decimal" autoFocus value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))}
            error={qty !== '' && !(q > 0) ? 'Miqdaar 0 se zyada likhein' : undefined} hint="Jaise colour 40 ml, wax 1 strip" />
        </div>
      ) : (
        <ProductPicker onPick={setPicked} placeholder="Colour, shampoo, wax…" autoFocus />
      )}
    </Modal>
  );
}
