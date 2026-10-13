/**
 * One low-stock line: what it is, how much is left and for how many days,
 * what to order and from whom, with quick actions (order, add stock,
 * WhatsApp the supplier, change the alert level, ignore).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, MessageCircle, MoreHorizontal, PackagePlus, Pencil, ShoppingCart, Smartphone, Truck } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import type { LowRow } from '../api';
import { STATUS, dateText, daysText, qty } from './meta';

export const LINE_GRID = 'lg:grid-cols-[2rem_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_auto]';

export interface LineActions {
  onOrder?: () => void;
  onStock?: () => void;
  onWhatsApp: () => void;
  onAlert?: (alert: number) => Promise<void>;
  onIgnore: (ignore: boolean) => void;
}

export function LineRow({ r, selected, onToggle, money, cost, showShop, groupLabel, deviceLink, actions }: {
  r: LowRow;
  selected: boolean;
  onToggle: () => void;
  money: (n: number) => string;
  cost: (n: number) => string;
  showShop: boolean;
  groupLabel?: (id: string) => string;
  deviceLink?: (productId: string) => string;
  actions: LineActions;
}) {
  const st = STATUS[r.status];
  const [menu, setMenu] = useState(false);
  const chips = r.flags.filter((f) => f !== r.status);

  return (
    <li className={cn('grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4', LINE_GRID, selected && 'bg-brand-50/50', r.ignored && 'opacity-60')}>
      <button type="button" onClick={onToggle} aria-label="Chunein" aria-pressed={selected}
        className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2', selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent hover:border-brand-400')}>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>

      {/* Item */}
      <div className="flex min-w-0 items-center gap-3">
        <ProductThumb name={r.name} category={r.category?.name} url={r.image} size="sm" />
        <div className="min-w-0">
          <Link to={`/products/${r.productId}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.short}</span>
            {chips.map((f) => <span key={f} className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', STATUS[f].tone)}>{STATUS[f].short}</span>)}
            {r.made && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">Dukaan me banta hai</span>}
            {r.onOrder > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700 ring-1 ring-sky-200"><Truck className="h-3 w-3" />{qty(r.onOrder)} order me</span>}
            {showShop && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{r.shopName}</span>}
          </div>
          <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">
            {[r.category?.name, r.group && groupLabel ? groupLabel(r.group) : null, r.detail, r.sku].filter(Boolean).join(' · ')}
          </p>
          {r.devices && r.devices.variants.length > 0 && (
            <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{r.devices.variants.map((v) => `${v.name}: ${v.count}`).join(' · ')}</p>
          )}
          {r.expiry && (
            <p className="mt-0.5 text-[0.75rem] text-violet-700">
              {r.expiry.expiredQty > 0 ? `${qty(r.expiry.expiredQty)} ${r.unit} expire ho chuka · ` : ''}{qty(r.expiry.qty)} {r.unit} {dateText(r.expiry.date)} tak · {r.expiry.batches} batch
            </p>
          )}
          {r.agri?.reg && (
            <p className="mt-0.5 text-[0.75rem] text-rose-700">
              {r.agri.reg.state === 'none' ? 'Registration ki date nahi likhi' : r.agri.reg.state === 'expired' ? `Registration ${Math.abs(r.agri.reg.days ?? 0)} din pehle khatam — bechna mana hai` : `Registration ${r.agri.reg.days} din me khatam`}
            </p>
          )}
        </div>
      </div>

      {/* Stock and alert */}
      <div className="col-start-2 lg:col-start-auto">
        <p className={cn('text-base font-bold tabular-nums', r.stock <= 0 ? 'text-rose-700' : r.stock <= r.alert ? 'text-amber-700' : 'text-slate-900')}>
          {qty(r.stock)} <span className="text-[0.75rem] font-medium text-slate-500">{r.devices ? r.devices.label : r.unit}</span>
        </p>
        <AlertLevel r={r} onSave={actions.onAlert} />
      </div>

      {/* Selling rate */}
      <div className="col-start-2 text-[0.8125rem] lg:col-start-auto">
        <p className="tabular-nums text-slate-900">{r.perDay > 0 ? `${qty(r.perDay)} / din` : 'Sale nahi'}</p>
        <p className={cn('text-[0.75rem]', r.daysLeft !== null && r.daysLeft <= 3 ? 'font-semibold text-rose-700' : 'text-slate-500')}>
          {r.stock <= 0 ? (r.outDays !== null ? `${r.outDays} din se khatam (andaza)` : 'Khatam') : r.daysLeft !== null ? `${daysText(r.daysLeft)} ka maal` : '—'}
        </p>
        {r.lostPerDay > 0 && <p className="text-[0.75rem] text-rose-700">Roz {money(r.lostPerDay)} ki sale ruki</p>}
      </div>

      {/* Order */}
      <div className="col-start-2 text-[0.8125rem] lg:col-start-auto">
        {r.suggestQty > 0 ? (
          <>
            <p className="font-semibold tabular-nums text-slate-900">{r.made ? 'Banana hai' : 'Mangwayein'} {qty(r.suggestQty)} {r.unit}</p>
            {!r.made && <p className="text-[0.75rem] tabular-nums text-slate-500">{cost(r.lastCost)} · kul {cost(r.orderValue)}</p>}
          </>
        ) : <p className="text-[0.75rem] text-slate-500">{r.onOrder > 0 ? 'Order ho chuka' : '—'}</p>}
      </div>

      {/* Supplier */}
      <div className="col-start-2 min-w-0 text-[0.8125rem] lg:col-start-auto">
        {r.supplier ? (
          <>
            <Link to={`/suppliers/${r.supplier.id}`} className="block truncate font-medium text-slate-800 hover:text-brand-700">{r.supplier.name}</Link>
            <p className="truncate text-[0.75rem] text-slate-500">{r.lastPurchasedAt ? `Aakhri ${dateText(r.lastPurchasedAt)}` : r.supplier.phone ?? ''}</p>
          </>
        ) : <p className="text-[0.75rem] text-slate-400">{r.made ? '—' : 'Pehle kabhi nahi khareeda'}</p>}
      </div>

      {/* Actions */}
      <div className="relative col-start-3 row-start-1 flex items-center justify-end gap-1 lg:col-start-auto lg:row-start-auto">
        {actions.onOrder && !r.made && r.suggestQty > 0 && (
          <button type="button" onClick={actions.onOrder} title="Order banayein" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"><ShoppingCart className="h-4 w-4" /></button>
        )}
        <button type="button" onClick={actions.onWhatsApp} title="Supplier ko WhatsApp" className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><MessageCircle className="h-4 w-4" /></button>
        <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Aur" aria-expanded={menu} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button>
        {menu && (
          <>
            <button type="button" aria-label="Band" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl bg-white py-1 text-[0.8125rem] shadow-xl ring-1 ring-slate-200">
              {actions.onStock && <MenuItem icon={PackagePlus} onClick={() => { setMenu(false); actions.onStock!(); }}>Stock daalein</MenuItem>}
              {r.devices && deviceLink && <Link to={deviceLink(r.productId)} className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"><Smartphone className="h-4 w-4 text-slate-400" />{r.devices.label} daalein</Link>}
              <MenuItem icon={r.ignored ? Eye : EyeOff} onClick={() => { setMenu(false); actions.onIgnore(!r.ignored); }}>{r.ignored ? 'Wapas dikhayein' : 'Abhi nahi (chhupayein)'}</MenuItem>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function MenuItem({ icon: Icon, onClick, children }: { icon: typeof Eye; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50">
      <Icon className="h-4 w-4 text-slate-400" />{children}
    </button>
  );
}

/** Alert level with an inline edit when allowed. */
function AlertLevel({ r, onSave }: { r: LowRow; onSave?: (alert: number) => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const from = r.alertFrom === 'agri' ? 'agri profile' : r.alertFrom === 'branch' ? 'is branch ka' : 'product ka';

  if (!edit) {
    return (
      <button type="button" disabled={!onSave} onClick={() => { setValue(String(r.alert)); setEdit(true); }} title={`Alert level (${from})`}
        className="group inline-flex items-center gap-1 text-[0.75rem] text-slate-500 enabled:hover:text-brand-700">
        Alert {qty(r.alert)}{onSave && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
      </button>
    );
  }
  const save = async () => {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0) return;
    setSaving(true);
    try { await onSave!(v); setEdit(false); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="mt-0.5 flex items-center gap-1">
      <input autoFocus type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setEdit(false); }}
        aria-label="Alert level" className="h-7 w-16 rounded-md border border-slate-300 px-1.5 text-[0.75rem] tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      <button type="submit" disabled={saving} className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white disabled:opacity-60" aria-label="Save"><Check className="h-3.5 w-3.5" /></button>
    </form>
  );
}
