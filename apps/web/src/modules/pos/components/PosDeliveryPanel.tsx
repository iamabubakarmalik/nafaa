// apps/web/src/modules/pos/components/PosDeliveryPanel.tsx
import { Truck } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { ServiceChargeItem } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   POS DELIVERY PANEL
   ─────────────────────────────────────────────────────────────
   Dukan maal ghar bhejti ho to: customer se kitna liya, aur
   rider ko kitna diya. Dono alag — warna delivery charge poora
   munafa gina jata hai jo ghalat hai.
   ═════════════════════════════════════════════════════════════ */

export interface PosDeliveryState {
  on: boolean;
  /** Customer se liya gaya charge */
  charge: number;
  /** Rider ko diya gaya paisa — dukan ka apna kharcha */
  riderCost: number;
  address: string;
  /**
   * Bahar ka rider (Bykea / Indolj / khud ka koi) charge seedha customer se leta hai —
   * bill par likha aata hai lekin sale / drawer / munafe me nahi judta.
   */
  byRider?: boolean;
}

const MODE_KEY = 'nafaa.delivery-by-rider';
const savedByRider = () => { try { return localStorage.getItem(MODE_KEY) === '1'; } catch { return false; } };
const saveByRider = (v: boolean) => { try { localStorage.setItem(MODE_KEY, v ? '1' : '0'); } catch { /* */ } };

export const emptyDelivery = (): PosDeliveryState => ({
  on: false, charge: 0, riderCost: 0, address: '', byRider: savedByRider(),
});

/** Cart total me jitna jorna hai (bahar ka rider ho to kuch nahi) */
export const deliveryAmount = (d: PosDeliveryState) =>
  d.on && !d.byRider ? Number(d.charge) || 0 : 0;

/** Bahar ke rider ka charge — sirf bill par likhne ke liye */
export const deliveryRiderAmount = (d: PosDeliveryState) =>
  d.on && d.byRider ? Number(d.charge) || 0 : 0;

/**
 * Sale payload ke liye service charge line.
 * Kuch na ho to `undefined` — payload me khali array na jaye.
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
  /** Theme — industry ke rang se match karne ke liye */
  tone?: 'sky' | 'emerald' | 'violet' | 'orange';
  /** Chhota rakhna ho (mobile cart) */
  compact?: boolean;
}

const TONES = {
  sky:     { on: 'border-sky-400 bg-sky-50',         btn: 'bg-sky-600',     chip: 'border-sky-200 text-sky-800 hover:border-sky-400',         label: 'text-sky-700',     focus: 'focus:border-sky-600 border-sky-300' },
  emerald: { on: 'border-emerald-400 bg-emerald-50', btn: 'bg-emerald-600', chip: 'border-emerald-200 text-emerald-800 hover:border-emerald-400', label: 'text-emerald-700', focus: 'focus:border-emerald-600 border-emerald-300' },
  violet:  { on: 'border-violet-400 bg-violet-50',   btn: 'bg-violet-600',  chip: 'border-violet-200 text-violet-800 hover:border-violet-400',  label: 'text-violet-700',  focus: 'focus:border-violet-600 border-violet-300' },
  orange:  { on: 'border-orange-400 bg-orange-50',   btn: 'bg-orange-600',  chip: 'border-orange-200 text-orange-800 hover:border-orange-400',  label: 'text-orange-700',  focus: 'focus:border-orange-600 border-orange-300' },
};

export function PosDeliveryPanel({ value: d, onChange, tone = 'sky', compact }: Props) {
  const t = TONES[tone];
  const amount = d.on ? Number(d.charge) || 0 : 0;
  const profit = amount - (Number(d.riderCost) || 0);
  const set = (patch: Partial<PosDeliveryState>) => onChange({ ...d, ...patch });
  const setMode = (byRider: boolean) => { saveByRider(byRider); set({ byRider, riderCost: byRider ? 0 : d.riderCost }); };

  return (
    <div className={['rounded-2xl border-2 transition', d.on ? t.on : 'border-slate-200 bg-white'].join(' ')}>
      <button type="button" onClick={() => set({ on: !d.on })}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left">
        <div className={['h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition',
          d.on ? `${t.btn} text-white` : 'bg-slate-100 text-slate-500'].join(' ')}>
          <Truck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-extrabold text-slate-900">Ghar Bhejna Hai?</div>
          <div className="text-[10px] font-bold text-slate-500 truncate">
            {d.on && amount > 0 ? (d.byRider ? `${formatPKR(amount)} rider lega — bill me nahi` : `${formatPKR(amount)} charge lagega`) : 'Delivery charge add karein'}
          </div>
        </div>
        <div className={['h-5 w-9 rounded-full transition relative shrink-0', d.on ? t.btn : 'bg-slate-300'].join(' ')}>
          <div className={['absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            d.on ? 'left-[1.15rem]' : 'left-0.5'].join(' ')} />
        </div>
      </button>

      {d.on && (
        <div className="px-3 pb-3 space-y-2">
          {/* Delivery ka paisa kis ke paas? */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1 border-2 border-slate-200">
            <button type="button" onClick={() => setMode(false)}
              className={['h-8 rounded-md text-[10.5px] font-extrabold transition', !d.byRider ? `${t.btn} text-white shadow` : 'text-slate-600'].join(' ')}>
              🛵 Hamara rider
            </button>
            <button type="button" onClick={() => setMode(true)}
              className={['h-8 rounded-md text-[10.5px] font-extrabold transition', d.byRider ? `${t.btn} text-white shadow` : 'text-slate-600'].join(' ')}>
              🏍️ Bahar ka rider lega
            </button>
          </div>
          <div className={d.byRider ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'}>
            <div>
              <div className={`text-[9px] uppercase font-extrabold mb-0.5 ${t.label}`}>Customer se</div>
              <input type="number" min={0} value={d.charge || ''}
                onChange={(e) => set({ charge: Number(e.target.value || 0) })}
                placeholder="0"
                className={`h-10 w-full rounded-lg border-2 bg-white px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none transition ${t.focus}`} />
            </div>
            {!d.byRider && <div>
              <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-0.5">Rider ko diya</div>
              <input type="number" min={0} value={d.riderCost || ''}
                onChange={(e) => set({ riderCost: Number(e.target.value || 0) })}
                placeholder="0"
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-slate-400 transition" />
            </div>}
          </div>

          <div className="flex gap-1">
            {QUICK.map((v) => (
              <button key={v} type="button" onClick={() => set({ charge: v })}
                className={['flex-1 h-8 rounded-lg text-[11px] font-extrabold transition border-2',
                  d.charge === v ? `${t.btn} text-white shadow border-transparent` : `bg-white ${t.chip}`].join(' ')}>
                {v}
              </button>
            ))}
          </div>

          {!compact && (
            <input value={d.address} onChange={(e) => set({ address: e.target.value })}
              placeholder="Address ya landmark (receipt par chhapega)"
              className={`h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2.5 text-xs font-bold focus:outline-none transition ${t.focus}`} />
          )}

          {amount > 0 && d.byRider && (
            <div className="rounded-lg bg-white border-2 border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
              Customer {formatPKR(amount)} seedha rider ko dega — bill par likha aayega, lekin dukaan ki sale aur drawer me nahi judega.
            </div>
          )}
          {amount > 0 && !d.byRider && (
            <div className="rounded-lg bg-white border-2 border-slate-200 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600">Delivery ka apna munafa</span>
              <span className={['text-xs font-extrabold tabular-nums',
                profit >= 0 ? 'text-emerald-700' : 'text-rose-600'].join(' ')}>
                {formatPKR(profit)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
