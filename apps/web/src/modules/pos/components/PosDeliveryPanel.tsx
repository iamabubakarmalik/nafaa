/**
 * POS delivery panel. Records what the customer pays for delivery and what
 * the shop pays its rider separately, so the full charge is not counted as
 * profit. An outside rider (Bykea etc.) collects the charge directly: it is
 * printed on the bill but stays out of the sale and the drawer.
 */

import { Truck } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { controlClass } from '@/design-system/components';
import type { ServiceChargeItem } from '@modules/sales/sales/api/sales.api';

export interface PosDeliveryState {
  on: boolean;
  /** Charge taken from the customer. */
  charge: number;
  /** Amount paid to the rider; the shop's own cost. */
  riderCost: number;
  address: string;
  /**
   * An outside rider collects the charge from the customer directly: it is
   * printed on the bill but not added to the sale, drawer or profit.
   */
  byRider?: boolean;
}

const MODE_KEY = 'nafaa.delivery-by-rider';
const savedByRider = () => { try { return localStorage.getItem(MODE_KEY) === '1'; } catch { return false; } };
const saveByRider = (v: boolean) => { try { localStorage.setItem(MODE_KEY, v ? '1' : '0'); } catch { /* */ } };

export const emptyDelivery = (): PosDeliveryState => ({
  on: false, charge: 0, riderCost: 0, address: '', byRider: savedByRider(),
});

/** Amount added to the cart total (nothing for an outside rider). */
export const deliveryAmount = (d: PosDeliveryState) =>
  d.on && !d.byRider ? Number(d.charge) || 0 : 0;

/** Outside rider's charge, printed on the bill only. */
export const deliveryRiderAmount = (d: PosDeliveryState) =>
  d.on && d.byRider ? Number(d.charge) || 0 : 0;

/**
 * Service charge line for the sale payload; `undefined` when there is none
 * so the payload never carries an empty array.
 */
export const deliveryServiceCharge = (
  d: PosDeliveryState,
): ServiceChargeItem[] | undefined => {
  const rider = deliveryRiderAmount(d);
  if (rider > 0) {
    return [{ type: 'DELIVERY', label: 'Delivery (rider ko — bill me shamil nahi)', amount: rider, passThrough: true, note: d.address || undefined }];
  }
  const amount = deliveryAmount(d);
  if (amount <= 0) return undefined;
  return [{
    type: 'DELIVERY',
    label: 'Delivery',
    amount,
    cost: Number(d.riderCost) || 0,
    note: d.address || undefined,
  }];
};

const QUICK = [100, 200, 300, 500];

interface Props {
  value: PosDeliveryState;
  onChange: (next: PosDeliveryState) => void;
  /** Kept for existing callers; the panel always follows the brand color. */
  tone?: 'sky' | 'emerald' | 'violet' | 'orange';
  /** Compact layout for the mobile cart (no address field). */
  compact?: boolean;
}

const ON = 'bg-brand-600 text-brand-fg shadow-sm';
const field = cn(controlClass(), 'h-10 px-2 text-center text-sm font-semibold tabular-nums');

export function PosDeliveryPanel({ value: d, onChange, compact }: Props) {
  const amount = d.on ? Number(d.charge) || 0 : 0;
  const profit = amount - (Number(d.riderCost) || 0);
  const set = (patch: Partial<PosDeliveryState>) => onChange({ ...d, ...patch });
  const setMode = (byRider: boolean) => { saveByRider(byRider); set({ byRider, riderCost: byRider ? 0 : d.riderCost }); };

  return (
    <div className={cn('rounded-2xl border transition', d.on ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white')}>
      <button type="button" role="switch" aria-checked={d.on} onClick={() => set({ on: !d.on })}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition', d.on ? ON : 'bg-slate-100 text-slate-500')}>
          <Truck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900">Ghar Bhejna Hai?</div>
          <div className="truncate text-[0.6875rem] font-medium text-slate-500">
            {d.on && amount > 0 ? (d.byRider ? `${formatPKR(amount)} rider lega — bill me nahi` : `${formatPKR(amount)} charge lagega`) : 'Delivery charge add karein'}
          </div>
        </div>
        <div className={cn('relative h-5 w-9 shrink-0 rounded-full transition', d.on ? 'bg-brand-600' : 'bg-slate-300')}>
          <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', d.on ? 'left-[1.15rem]' : 'left-0.5')} />
        </div>
      </button>

      {d.on && (
        <div className="space-y-2 px-3 pb-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Delivery ka paisa kis ke paas">
            <button type="button" role="radio" aria-checked={!d.byRider} onClick={() => setMode(false)}
              className={cn('h-8 rounded-md text-[0.65625rem] font-semibold transition', !d.byRider ? ON : 'text-slate-600 hover:bg-slate-50')}>
              🛵 Hamara rider
            </button>
            <button type="button" role="radio" aria-checked={!!d.byRider} onClick={() => setMode(true)}
              className={cn('h-8 rounded-md text-[0.65625rem] font-semibold transition', d.byRider ? ON : 'text-slate-600 hover:bg-slate-50')}>
              🏍️ Bahar ka rider lega
            </button>
          </div>
          <div className={d.byRider ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'}>
            <label className="block">
              <span className="mb-0.5 block text-[0.625rem] font-semibold uppercase text-brand-700">Customer se</span>
              <input type="number" min={0} value={d.charge || ''}
                onChange={(e) => set({ charge: Number(e.target.value || 0) })}
                placeholder="0" className={field} />
            </label>
            {!d.byRider && (
              <label className="block">
                <span className="mb-0.5 block text-[0.625rem] font-semibold uppercase text-slate-500">Rider ko diya</span>
                <input type="number" min={0} value={d.riderCost || ''}
                  onChange={(e) => set({ riderCost: Number(e.target.value || 0) })}
                  placeholder="0" className={field} />
              </label>
            )}
          </div>

          <div className="flex gap-1">
            {QUICK.map((v) => (
              <button key={v} type="button" onClick={() => set({ charge: v })}
                className={cn('h-8 flex-1 rounded-lg border text-[0.6875rem] font-semibold transition',
                  d.charge === v ? cn(ON, 'border-transparent') : 'border-brand-200 bg-white text-brand-800 hover:border-brand-400')}>
                {v}
              </button>
            ))}
          </div>

          {!compact && (
            <input value={d.address} onChange={(e) => set({ address: e.target.value })}
              placeholder="Address ya landmark (receipt par chhapega)" aria-label="Address"
              className={cn(controlClass(), 'h-10 px-2.5 text-xs font-medium')} />
          )}

          {amount > 0 && d.byRider && (
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.6875rem] font-medium text-slate-600">
              Customer {formatPKR(amount)} seedha rider ko dega — bill par likha aayega, lekin dukaan ki sale aur drawer me nahi judega.
            </div>
          )}
          {amount > 0 && !d.byRider && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <span className="text-[0.6875rem] font-medium text-slate-600">Delivery ka apna profit</span>
              <span className={cn('text-xs font-semibold tabular-nums', profit >= 0 ? 'text-success-700' : 'text-rose-600')}>
                {formatPKR(profit)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
