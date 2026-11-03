/**
 * The purchase bill being written: lines in any unit, charges, payment and
 * landed costs. Kept on the phone while typing, so closing the app does not
 * lose it. Same rules as the web draft (paid defaults to the full bill;
 * changing a line's unit keeps its cost per base unit).
 */

import { useEffect, useMemo, useState } from 'react';
import { landedPayload, type LandedDraft, type LandedMethod } from '@nafaa/core/inventory';
import { kv } from '@/core/storage/kv';
import type { PaymentMethod, PurchaseInput } from '@/core/offline';
import { todayPk } from '../../lib/meta';

export interface UnitChoice {
  /** ProductUnit id; null for the base unit or a purchase-only unit. */
  id: string | null;
  name: string;
  /** Base units in one of this unit. */
  rate: number;
}

export interface DraftLine {
  key: string;
  productId: string;
  name: string;
  baseUnit: string;
  stock: number;
  /** Cost of one base unit before this bill. */
  was: number;
  price: number;
  isRaw: boolean;
  expiryTracked: boolean;
  image: string | null;
  category: string | null;
  variant: { id: string; name: string } | null;
  units: UnitChoice[];
  unit: UnitChoice;
  qty: number;
  /** Cost of one unit as bought. */
  cost: number;
  /** New selling price of one base unit; null = unchanged. */
  salePrice: number | null;
  batchNo: string;
  expiry: string;
  weightKg: number | null;
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
  landed: LandedDraft[];
  landedMethod: LandedMethod;
  /** Branch when the app is on "All shops". */
  shopId: string | null;
}

const STORE = 'nafaa.purchase-draft';
export const emptyBill = (mode: 'receive' | 'order'): DraftBill => ({
  supplierId: '', supplierName: '', invoiceNo: '', date: todayPk(), notes: '', discount: 0, otherCharges: 0, taxAmount: 0,
  paymentMethod: 'CASH', paid: null, dueDate: '', mode, expectedAt: '', landed: [], landedMethod: 'VALUE', shopId: null,
});

const lineKey = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const r2 = (n: number) => Number(n.toFixed(2));

export type NewLine = Omit<DraftLine, 'key' | 'qty' | 'cost' | 'salePrice' | 'batchNo' | 'expiry' | 'weightKg' | 'unit'> & { unit?: UnitChoice; qty?: number; cost?: number };

export function usePurchaseDraft(initialMode: 'receive' | 'order') {
  const saved = useMemo(() => kv.get<{ bill: DraftBill; lines: DraftLine[] } | null>(STORE, null), []);
  const [bill, setBillState] = useState<DraftBill>(saved?.bill ? { ...emptyBill(initialMode), ...saved.bill } : emptyBill(initialMode));
  const [lines, setLines] = useState<DraftLine[]>(saved?.lines ?? []);

  useEffect(() => {
    if (!lines.length && !bill.supplierId) kv.remove(STORE);
    else kv.set(STORE, { bill, lines });
  }, [bill, lines]);

  const setBill = (patch: Partial<DraftBill>) => setBillState((b) => ({ ...b, ...patch }));

  /** Adds a line, or more of the same item in the same unit. */
  const add = (src: NewLine) => {
    const unit = src.unit ?? src.units[0];
    const qty = src.qty ?? 1;
    setLines((ls) => {
      const same = ls.find((l) => l.productId === src.productId && l.unit.name === unit.name && (l.variant?.id ?? '') === (src.variant?.id ?? ''));
      if (same) return ls.map((l) => (l === same ? { ...l, qty: Number((l.qty + qty).toFixed(3)) } : l));
      return [{ ...src, key: lineKey(), unit, qty, cost: src.cost ?? r2(src.was * unit.rate), salePrice: null, batchNo: '', expiry: '', weightKg: null }, ...ls];
    });
  };
  const patch = (key: string, p: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const setUnit = (key: string, unit: UnitChoice) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const perBase = l.cost / (l.unit.rate || 1);
    return { ...l, unit, units: l.units.some((u) => u.name === unit.name) ? l.units : [...l.units, unit], cost: r2(perBase * unit.rate) };
  }));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));
  const reset = (mode: 'receive' | 'order' = initialMode) => { setLines([]); setBillState(emptyBill(mode)); };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.cost, 0);
  const total = Math.max(subtotal - bill.discount + bill.otherCharges + bill.taxAmount, 0);
  const paid = bill.mode === 'order' ? 0 : Math.min(bill.paid ?? total, total);
  const due = Math.max(total - paid, 0);
  /** Cash paid on a bill dated today comes out of the open drawer. */
  const drawerCash = bill.mode === 'receive' && bill.paymentMethod === 'CASH' && bill.date === todayPk() ? paid : 0;

  const payload = (shopId?: string | null): PurchaseInput => {
    const landed = landedPayload(bill.landed);
    return {
      supplierId: bill.supplierId,
      shopId: shopId ?? undefined,
      paymentMethod: bill.paymentMethod,
      discount: bill.discount || undefined,
      otherCharges: bill.otherCharges || undefined,
      taxAmount: bill.taxAmount || undefined,
      paidAmount: bill.mode === 'order' ? undefined : r2(paid),
      notes: bill.notes.trim() || undefined,
      supplierInvoiceNo: bill.invoiceNo.trim() || undefined,
      purchasedAt: bill.date && bill.date !== todayPk() ? `${bill.date}T12:00:00` : undefined,
      dueDate: due > 0 && bill.dueDate ? bill.dueDate : undefined,
      expectedAt: bill.mode === 'order' && bill.expectedAt ? bill.expectedAt : undefined,
      receive: bill.mode === 'receive',
      ...(landed.length ? { landedCosts: landed, landedCostMethod: bill.landedMethod } : {}),
      items: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variant?.id,
        ...(l.unit.id ? { unitId: l.unit.id, conversionRate: l.unit.rate }
          : l.unit.rate !== 1 || l.unit.name !== l.baseUnit ? { unitName: l.unit.name, conversionRate: l.unit.rate } : {}),
        quantity: l.qty,
        costPrice: l.cost,
        salePrice: l.salePrice ?? undefined,
        batchNo: l.batchNo.trim() || undefined,
        expiryDate: l.expiry || undefined,
        ...(l.weightKg != null && l.weightKg > 0 ? { weightKg: l.weightKg } : {}),
      })),
    };
  };

  return { bill, setBill, lines, add, patch, setUnit, remove, reset, subtotal, total, paid, due, drawerCash, payload, restored: !!saved?.lines?.length };
}
