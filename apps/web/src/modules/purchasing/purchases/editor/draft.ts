/**
 * The bill being written: lines in any unit, charges, payment. Kept on the
 * device while typing, so a closed tab or a power cut does not lose it.
 */

import { useEffect, useMemo, useState } from 'react';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { CreatePurchasePayload, LandedMethod } from '../api/purchases.api';
import { toPayload, type LandedDraft } from '../components/LandedCostEditor';
import type { Source, UnitChoice } from './sources';

export interface DraftLine {
  key: string;
  source: Source;
  variant?: { id: string; name: string; cost: number } | null;
  unit: UnitChoice;
  qty: number;
  /** Cost of one unit as bought. */
  cost: number;
  /** New selling price of one base unit; empty = unchanged. */
  salePrice: number | null;
  batchNo: string;
  expiry: string;
  /** Total weight of the line in kg, for landed cost by weight. */
  weightKg?: number | null;
}

export interface DraftBill {
  supplierId: string;
  supplierName: string;
  invoiceNo: string;
  date: string;
  notes: string;
  discount: number;
  otherCharges: number;
  taxAmount: number;
  paymentMethod: PaymentMethod;
  /** null = paid in full. */
  paid: number | null;
  dueDate: string;
  mode: 'receive' | 'order';
  expectedAt: string;
  /** Freight, customs, clearing, transport paid to others (landed cost). */
  landed: LandedDraft[];
  landedMethod: LandedMethod;
}

const STORE = 'nafaa-purchase-draft';
const today = () => new Date().toISOString().slice(0, 10);
export const EMPTY_BILL: DraftBill = {
  supplierId: '', supplierName: '', invoiceNo: '', date: today(), notes: '', discount: 0, otherCharges: 0, taxAmount: 0,
  paymentMethod: 'CASH', paid: null, dueDate: '', mode: 'receive', expectedAt: '', landed: [], landedMethod: 'VALUE',
};

const lineKey = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function load(): { bill: DraftBill; lines: DraftLine[] } | null {
  try { const raw = localStorage.getItem(STORE); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function usePurchaseDraft(initialMode: 'receive' | 'order') {
  const saved = useMemo(load, []);
  const [bill, setBill] = useState<DraftBill>(saved?.bill ? { ...EMPTY_BILL, ...saved.bill } : { ...EMPTY_BILL, mode: initialMode });
  const [lines, setLines] = useState<DraftLine[]>(saved?.lines ?? []);

  useEffect(() => {
    try {
      if (!lines.length && !bill.supplierId) localStorage.removeItem(STORE);
      else localStorage.setItem(STORE, JSON.stringify({ bill, lines }));
    } catch { /* storage full or blocked */ }
  }, [bill, lines]);

  /** Adds a line, or one more of the same item in the same unit. */
  const add = (source: Source, unit: UnitChoice = source.units[0], variant?: DraftLine['variant'], qty = 1) => {
    setLines((ls) => {
      const same = ls.find((l) => l.source.key === source.key && l.unit.name === unit.name && (l.variant?.id ?? '') === (variant?.id ?? ''));
      if (same) return ls.map((l) => (l === same ? { ...l, qty: Number((l.qty + qty).toFixed(3)) } : l));
      const baseCost = variant?.cost || source.cost;
      return [{ key: lineKey(), source, variant: variant ?? null, unit, qty, cost: Number((baseCost * unit.rate).toFixed(2)), salePrice: null, batchNo: '', expiry: '' }, ...ls];
    });
  };
  const patch = (key: string, p: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  /** Changing the unit keeps the cost per base unit. */
  const setUnit = (key: string, unit: UnitChoice) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const perBase = l.cost / (l.unit.rate || 1);
    return { ...l, unit, cost: Number((perBase * unit.rate).toFixed(2)) };
  }));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));
  const reset = () => { setLines([]); setBill({ ...EMPTY_BILL, mode: initialMode }); };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.cost, 0);
  const total = Math.max(subtotal - bill.discount + bill.otherCharges + bill.taxAmount, 0);
  const paid = bill.mode === 'order' ? 0 : Math.min(bill.paid ?? total, total);
  const due = Math.max(total - paid, 0);
  /** Cash paid on a bill dated today comes out of the open drawer. */
  const drawerCash = bill.mode === 'receive' && bill.paymentMethod === 'CASH' && (!bill.date || bill.date === today()) ? paid : 0;

  const payload = (shopId?: string): CreatePurchasePayload => ({
    supplierId: bill.supplierId,
    shopId,
    paymentMethod: bill.paymentMethod,
    discount: bill.discount || undefined,
    otherCharges: bill.otherCharges || undefined,
    taxAmount: bill.taxAmount || undefined,
    paidAmount: bill.mode === 'order' ? undefined : paid,
    notes: bill.notes.trim() || undefined,
    supplierInvoiceNo: bill.invoiceNo.trim() || undefined,
    purchasedAt: bill.date && bill.date !== today() ? `${bill.date}T12:00:00` : undefined,
    dueDate: due > 0 && bill.dueDate ? bill.dueDate : undefined,
    expectedAt: bill.mode === 'order' && bill.expectedAt ? bill.expectedAt : undefined,
    receive: bill.mode === 'receive',
    ...(toPayload(bill.landed).length && { landedCosts: toPayload(bill.landed), landedCostMethod: bill.landedMethod }),
    items: lines.map((l) => ({
      ...(l.source.kind === 'product' ? { productId: l.source.id } : { ingredientId: l.source.id }),
      variantId: l.variant?.id,
      ...(l.unit.id ? { unitId: l.unit.id } : l.unit.rate !== 1 || l.unit.name !== l.source.baseUnit ? { unitName: l.unit.name, conversionRate: l.unit.rate } : {}),
      quantity: l.qty,
      costPrice: l.cost,
      salePrice: l.salePrice ?? undefined,
      batchNo: l.batchNo.trim() || undefined,
      expiryDate: l.expiry || undefined,
      weightKg: l.weightKg != null && l.weightKg > 0 ? l.weightKg : undefined,
    })),
  });

  return { bill, setBill, lines, add, patch, setUnit, remove, reset, subtotal, total, paid, due, drawerCash, payload, restored: !!saved?.lines?.length };
}
