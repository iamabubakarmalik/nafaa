/** The jewelry counter bill, kept while the cashier moves between screens. */

import { create } from 'zustand';
import { metalOf, type OldGoldRecord, type Purity, type billTotals } from '@nafaa/core/industries/jewelry';
import type { PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';

export interface Line {
  key: string;
  productId?: string;
  name: string;
  category: string;
  purity: Purity | 'OTHER';
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  /** Banwai for the piece in rupees (per-gram, fixed and percent folded together). */
  making: number;
  wastagePct: number;
  wastageGrams: number;
  stones: number;
  other: number;
  hallmark?: string;
  qty: number;
  stock?: number | null;
  /** A plain product with no jewelry profile: sold at its own price. */
  plain?: boolean;
}

interface BillState {
  lines: Line[];
  discount: number;
  customer: PickedCustomer | null;
  golds: OldGoldRecord[];
  notes: string;
  add: (line: Line) => void;
  patch: (key: string, p: Partial<Line>) => void;
  remove: (key: string) => void;
  setDiscount: (v: number) => void;
  setCustomer: (c: PickedCustomer | null) => void;
  addGold: (g: OldGoldRecord) => void;
  removeGold: (code: string) => void;
  setNotes: (v: string) => void;
  reset: () => void;
}

const EMPTY = { lines: [] as Line[], discount: 0, customer: null as PickedCustomer | null, golds: [] as OldGoldRecord[], notes: '' };

export const useJewelryBill = create<BillState>((set) => ({
  ...EMPTY,
  add: (line) => set((s) => ({ lines: [...s.lines, line] })),
  patch: (key, p) => set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, ...p } : l)) })),
  remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
  setDiscount: (discount) => set({ discount }),
  setCustomer: (customer) => set({ customer }),
  addGold: (g) => set((s) => ({ golds: [...s.golds, g] })),
  removeGold: (code) => set((s) => ({ golds: s.golds.filter((g) => g.code !== code) })),
  setNotes: (notes) => set({ notes }),
  reset: () => set(EMPTY),
}));

export const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Body of the jewelry bill (web JewelryPosPage sell): pieces, discount, money and old gold as TRADE_IN payments. */
export function buildSaleBody(
  bill: Pick<BillState, 'lines' | 'customer' | 'notes'>, totals: ReturnType<typeof billTotals>, pay: { paymentMethod: string; paidAmount: number },
) {
  const money = pay.paidAmount > 0 ? [{ method: pay.paymentMethod, amount: pay.paidAmount }] : [];
  const gold = totals.tradeIns.filter((g) => g.amount > 0).map((g) => ({ method: 'TRADE_IN', amount: g.amount, reference: g.code }));
  return {
    customerId: bill.customer?.id, customerName: bill.customer?.name, customerPhone: bill.customer?.phone ?? undefined,
    items: bill.lines.map((l) => ({
      productId: l.productId, productName: l.name, category: l.category, metalType: l.plain ? 'OTHER' : metalOf(l.purity), purity: l.purity, ratePerGram: l.ratePerGram,
      grossWeight: l.grossWeight, netWeight: l.netWeight, makingChargeFixed: l.making, wastagePct: l.wastagePct, wastageGrams: l.wastageGrams, polishCharges: l.other,
      stoneValue: l.stones, quantity: l.qty, hallmarkNumber: l.hallmark,
    })),
    discount: totals.discount || undefined, paymentMethod: pay.paymentMethod, paidAmount: pay.paidAmount,
    ...(gold.length ? { payments: [...money, ...gold] } : {}), customerNotes: bill.notes || undefined,
  };
}
