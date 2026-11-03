/**
 * A saved bill → the receipt document. `saleToReceipt` reads a full sale
 * from GET /sales/:id (item details, charges, codes, points, returns), the
 * same as the web; `saleRowToReceipt` reads the phone's copy (works offline
 * and for bills still waiting to sync).
 */

import { formatPKR } from '@/core/format';
import type { SaleRow } from '@/core/offline';
import { methodWord, rw, type ReceiptLang } from './words';
import type { ReceiptDoc, ReceiptLineDoc, ReceiptRowDoc } from './types';
import { applyReceiptIndustry } from './industry';

const n = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Receipt lines of a split payment, or nothing for a bill paid one way.
 * Stored cash parts are net of change; the receipt shows what was handed
 * over, so the change goes back on the first cash part.
 */
export function paymentParts(
  lang: ReceiptLang,
  parts: Array<{ method: string; amount: number; note?: string | null }> | undefined,
  change: number,
): { lines?: Array<{ label: string; amount: number }>; label?: string } {
  if (!parts?.length || (parts.length === 1 && parts[0].method !== 'TRADE_IN')) return {};
  let back = Math.max(change, 0);
  const lines = parts.map((p) => {
    const extra = p.method === 'CASH' ? back : 0;
    if (extra) back = 0;
    const name = methodWord(lang, p.method);
    return { label: p.method === 'TRADE_IN' && p.note ? `${name} (${p.note})` : name, amount: n(p.amount) + extra };
  });
  return { lines, label: rw(lang, 'paidWith', { method: [...new Set(parts.map((p) => methodWord(lang, p.method)))].join(' + ') }) };
}

/** "Paid (Cash)" or "Paid (Cash) · Udhaar Rs 500". */
export function paymentLabel(lang: ReceiptLang, method: string, credit: number) {
  const paid = rw(lang, 'paidWith', { method: methodWord(lang, method) });
  return credit > 0 ? `${paid} · ${rw(lang, 'khataPart', { amount: formatPKR(credit) })}` : paid;
}

function itemDetails(it: Record<string, any>, lang: ReceiptLang): string[] {
  const out: string[] = [];
  const v = it.variantLink?.variant;
  if (v) {
    const bits = [v.size && `Size ${v.size}`, v.color && v.color].filter(Boolean);
    if (bits.length) out.push(bits.join(' · '));
  }
  for (const m of it.imeis ?? []) out.push(`IMEI ${m.imei1}${m.imei2 ? ` / ${m.imei2}` : ''}`);
  for (const s of it.serials ?? []) out.push([`S/N ${s.serialNumber}`, s.imei && `IMEI ${s.imei}`].filter(Boolean).join(' · '));
  if (n(it.returnedQty) > 0) out.push(rw(lang, 'returnedQty', { qty: n(it.returnedQty) }));
  return out.filter(Boolean);
}

function stampOf(lang: ReceiptLang, status: string, offline: boolean) {
  if (status === 'VOIDED') return rw(lang, 'stampCancel');
  if (status === 'FULLY_RETURNED') return rw(lang, 'stampReturn');
  return offline ? rw(lang, 'stampOffline') : undefined;
}

/** A full sale from the server. */
export function saleToReceipt(sale: Record<string, any>, lang: ReceiptLang): ReceiptDoc {
  const lines: ReceiptLineDoc[] = (sale.items ?? []).map((it: Record<string, any>) => {
    const qty = n(it.quantity);
    const price = n(it.price ?? it.unitPrice);
    const total = n(it.total ?? qty * price);
    const discount = Math.max(Number((qty * price - total).toFixed(2)), 0);
    const base = it.usedPhone ? `${it.usedPhone.brand ?? ''} ${it.usedPhone.model ?? ''}`.trim() : it.product?.name ?? it.name ?? 'Item';
    const variant = it.variantLink?.variant?.name ?? it.variantName;
    return {
      name: variant ? `${base} (${variant})` : base, qty, unit: it.product?.unit ?? it.unit ?? 'pcs', price, total,
      discount: discount || undefined, note: it.note || undefined, details: itemDetails(it, lang),
      sku: it.variantLink?.variant?.sku || it.product?.sku || undefined,
    };
  });
  const charges: Array<Record<string, any>> = Array.isArray(sale.serviceChargesBreakdown) ? sale.serviceChargesBreakdown : [];
  const shown = charges.filter((c) => !c?.passThrough);
  const rider = charges.filter((c) => c?.passThrough).reduce((s, c) => s + n(c.amount), 0);
  const service = shown.reduce((s, c) => s + n(c.amount), 0);
  const subtotal = n(sale.subtotal) || lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = n(sale.total);
  const discount = Math.max(Number((subtotal + service - total).toFixed(2)), 0);
  const extraRows: ReceiptRowDoc[] = [
    ...shown.map((c) => ({ label: c.label || 'Service', value: `+${formatPKR(n(c.amount))}` })),
    ...(sale.discountCode ? [{ label: rw(lang, 'code', { code: sale.discountCode }), value: n(sale.codeDiscount) ? `−${formatPKR(n(sale.codeDiscount))}` : '✓' }] : []),
    ...(n(sale.loyaltyUsed) > 0 ? [{ label: rw(lang, 'pointsUsed', { points: n(sale.loyaltyUsed) }), value: `−${formatPKR(n(sale.loyaltyDiscount))}` }] : []),
    ...(n(sale.loyaltyEarned) > 0 ? [{ label: rw(lang, 'pointsEarned'), value: `+${n(sale.loyaltyEarned)}` }] : []),
    ...(n(sale.refundedAmount) > 0 ? [{ label: rw(lang, 'refunded'), value: `−${formatPKR(n(sale.refundedAmount))}`, bold: true }] : []),
  ];
  const credit = n(sale.creditAmount);
  const balance = n(sale.customer?.balance);
  const split = paymentParts(lang, sale.payments, n(sale.changeAmount));
  return applyReceiptIndustry({
    saleNumber: sale.saleNumber ?? String(sale.id ?? '').slice(-8).toUpperCase(),
    date: new Date(sale.soldAt ?? sale.createdAt ?? Date.now()),
    stamp: stampOf(lang, sale.status, false),
    branchName: sale.shop?.name ?? null,
    branchAddress: sale.shop?.address ?? null,
    branchPhone: sale.shop?.phone ?? null,
    customerName: sale.customer?.name ?? sale.customerName ?? undefined,
    customerPhone: sale.customer?.phone ?? sale.customerPhone ?? undefined,
    customerAddress: [sale.customer?.address, sale.customer?.area, sale.customer?.city].filter(Boolean).join(', ') || undefined,
    customerTaxId: sale.customer?.ntn || sale.customer?.cnic || undefined,
    receivedByName: sale.receivedByName || undefined,
    receivedByPhone: sale.receivedByPhone || undefined,
    cashierName: sale.createdBy?.fullName ?? undefined,
    lines, subtotal, discount,
    riderDelivery: rider || undefined,
    extraRows, total,
    paid: n(sale.paidAmount),
    paymentLabel: split.label ?? paymentLabel(lang, sale.paymentMethod ?? 'CASH', 0),
    payments: split.lines,
    previousDue: sale.customer ? Math.max(balance - credit, 0) : 0,
  }, { lang, sale, row: null });
}

/** The phone's copy of a bill (also a bill waiting to sync). */
export function saleRowToReceipt(sale: SaleRow & { customerPhone?: string | null }, lang: ReceiptLang, previousDue = 0): ReceiptDoc {
  const lines: ReceiptLineDoc[] = sale.items.map((it) => {
    const packed = it.unitName && it.unitQty ? { qty: it.unitQty, unit: it.unitName, price: it.unitQty > 0 ? (it.price * it.quantity) / it.unitQty : it.price } : null;
    return {
      name: it.variantName ? `${it.name} (${it.variantName})` : it.name,
      qty: packed?.qty ?? it.quantity,
      unit: packed?.unit ?? it.unit ?? 'pcs',
      price: packed?.price ?? it.price,
      total: it.total,
      details: it.returnedQty ? [rw(lang, 'returnedQty', { qty: it.returnedQty })] : undefined,
    };
  });
  const split = paymentParts(lang, sale.payments, sale.changeAmount);
  return applyReceiptIndustry({
    saleNumber: sale.saleNumber,
    date: new Date(sale.soldAt || Date.now()),
    stamp: stampOf(lang, sale.status, sale.pending),
    customerName: sale.customerName ?? undefined,
    customerPhone: sale.customerPhone ?? undefined,
    lines,
    subtotal: sale.subtotal || lines.reduce((s, l) => s + l.total, 0),
    discount: sale.discount,
    total: sale.total,
    paid: sale.paidAmount,
    paymentLabel: split.label ?? paymentLabel(lang, sale.paymentMethod, sale.creditAmount),
    payments: split.lines,
    previousDue,
  }, { lang, sale: null, row: sale });
}
