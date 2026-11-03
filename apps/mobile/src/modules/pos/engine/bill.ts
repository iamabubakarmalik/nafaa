/**
 * The bill on the counter: lines, customer, discount, code, points,
 * delivery and charges, receiver, seller and the price tier. One store so
 * the catalog, the cart sheet, checkout and the tablet side panel all work
 * on the same bill, and an unfinished bill survives leaving the POS tab.
 */

import { create } from 'zustand';
import {
  emptyDelivery, retier, type DeliveryState, type PosCartLine, type PosDiscountMode, type PriceTier, type ServiceChargeItem,
} from '@nafaa/core/pos';
import type { CustomerRow } from '@/core/offline';
import { kv } from '@/core/storage/kv';

export interface Promo {
  code: string;
  discount: number;
  /** Checked against codes saved on the phone (no internet). */
  offline?: boolean;
}

export interface BillState {
  lines: PosCartLine[];
  customer: CustomerRow | null;
  discountMode: PosDiscountMode;
  discountPct: number;
  discountRs: number;
  promo: Promo | null;
  pointsWanted: number;
  delivery: DeliveryState;
  /** Other charges (tax, service charge, fitting). */
  charges: ServiceChargeItem[];
  receiverName: string;
  receiverPhone: string;
  soldById: string | null;
  note: string;
  tier: PriceTier;
  /** The line last added or changed. */
  lastLineId: string | null;
}

const RIDER_KEY = 'nafaa.pos.deliveryByRider';

export const emptyBill = (tier: PriceTier = 'RETAIL'): BillState => ({
  lines: [], customer: null, discountMode: 'pct', discountPct: 0, discountRs: 0, promo: null, pointsWanted: 0,
  delivery: emptyDelivery(kv.get<boolean>(RIDER_KEY, false)), charges: [], receiverName: '', receiverPhone: '',
  soldById: null, note: '', tier, lastLineId: null,
});

interface BillActions {
  setLines: (fn: (lines: PosCartLine[]) => PosCartLine[], lastLineId?: string | null) => void;
  setCustomer: (c: CustomerRow | null) => void;
  setDiscount: (mode: PosDiscountMode, pct: number, rs: number) => void;
  setPromo: (p: Promo | null) => void;
  setPointsWanted: (n: number) => void;
  setDelivery: (d: DeliveryState) => void;
  setCharges: (c: ServiceChargeItem[]) => void;
  setReceiver: (name: string, phone: string) => void;
  setSoldBy: (id: string | null) => void;
  setNote: (note: string) => void;
  /** Re-prices every line that follows the bill's tier. */
  setTier: (tier: PriceTier) => void;
  /** Puts a whole bill on the counter (resume a held bill). */
  load: (b: Partial<BillState>) => void;
  clear: (tier?: PriceTier) => void;
}

export const useBill = create<BillState & BillActions>((set, get) => ({
  ...emptyBill(),
  setLines: (fn, lastLineId) => set((s) => ({ lines: fn(s.lines), ...(lastLineId !== undefined && { lastLineId }) })),
  // A new customer starts without the previous customer's receiver and points.
  setCustomer: (customer) => set((s) => (s.customer?.id === customer?.id ? { customer } : { customer, receiverName: '', receiverPhone: '', pointsWanted: 0 })),
  setDiscount: (discountMode, discountPct, discountRs) => set({ discountMode, discountPct, discountRs }),
  setPromo: (promo) => set({ promo }),
  setPointsWanted: (pointsWanted) => set({ pointsWanted }),
  setDelivery: (delivery) => {
    if (delivery.byRider !== get().delivery.byRider) kv.set(RIDER_KEY, !!delivery.byRider);
    set({ delivery });
  },
  setCharges: (charges) => set({ charges }),
  setReceiver: (receiverName, receiverPhone) => set({ receiverName, receiverPhone }),
  setSoldBy: (soldById) => set({ soldById }),
  setNote: (note) => set({ note }),
  setTier: (tier) => set((s) => (s.tier === tier ? {} : { tier, lines: s.lines.map((l) => retier(l, tier)) })),
  load: (b) => set({ ...emptyBill(get().tier), ...b }),
  clear: (tier) => set(emptyBill(tier ?? 'RETAIL')),
}));

/** What a held bill keeps (everything but the per-session line focus). */
export type HeldBillData = Omit<BillState, 'lastLineId'>;

export function snapshotBill(): HeldBillData {
  const { lastLineId: _l, ...rest } = useBill.getState();
  const { setLines: _a, setCustomer: _b, setDiscount: _c, setPromo: _d, setPointsWanted: _e, setDelivery: _f, setCharges: _g,
    setReceiver: _h, setSoldBy: _i, setNote: _j, setTier: _k, load: _m, clear: _n, ...data } = rest as typeof rest & BillActions;
  return data;
}
