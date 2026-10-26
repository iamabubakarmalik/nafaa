/**
 * Turns a sale from GET /sales/:id (or an offline sale) into the receipt
 * document: item details (variant, IMEI, serial, warranty, used phone),
 * returns, service charges, discounts, khata and a status stamp.
 */

import type { PayAccount, ReceiptDoc, ReceiptLineDoc, ReceiptRowDoc } from '@core/receipt/types';
import { PAY_KIND_LABEL } from '@core/receipt/html';
import { formatPKR } from '@core/lib/format';

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank', RAAST: 'Raast',
  CREDIT: 'Udhaar', CHEQUE: 'Cheque', MIXED: 'Mixed', OTHER: 'Other', TRADE_IN: 'Trade-in',
};

/**
 * Receipt lines of a split payment, or nothing for a bill paid one way.
 * Stored cash parts are net of change; the receipt shows what was handed
 * over, so the change goes back on the first cash part.
 */
export function paymentParts(
  parts: Array<{ method: string; amount: number; note?: string | null }> | undefined,
  change: number,
): { lines?: Array<{ label: string; amount: number }>; label?: string } {
  if (!parts?.length || (parts.length === 1 && parts[0].method !== 'TRADE_IN')) return {};
  let back = Math.max(change, 0);
  const lines = parts.map((p) => {
    const extra = p.method === 'CASH' ? back : 0;
    if (extra) back = 0;
    const name = PAYMENT_LABELS[p.method] ?? p.method;
    return { label: p.method === 'TRADE_IN' && p.note ? `${name} (${p.note})` : name, amount: n(p.amount) + extra };
  });
  return { lines, label: `Paid (${[...new Set(parts.map((p) => PAYMENT_LABELS[p.method] ?? p.method))].join(' + ')})` };
}
import { isPriceTier, PRICE_TIER_FIELD, type PriceTier } from '@core/lib/priceTiers';

const PTA: Record<string, string> = { APPROVED: 'PTA approved', NON_PTA: 'Non-PTA', PATCH: 'PTA patched', PENDING: 'PTA pending' };
const n = (v: unknown) => Number(v ?? 0) || 0;
const day = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

function itemDetails(it: any): string[] {
  const out: string[] = [];
  const v = it.variantLink?.variant;
  if (v) {
    const bits = [v.size && `Size ${v.size}`, v.color && `Rang ${v.color}`].filter(Boolean);
    if (bits.length) out.push(bits.join(' · '));
  }
  for (const m of it.imeis ?? []) {
    out.push(`IMEI ${m.imei1}${m.imei2 ? ` / ${m.imei2}` : ''}`);
    const extra = [m.serialNumber && `S/N ${m.serialNumber}`, m.ptaStatus && PTA[m.ptaStatus], m.color].filter(Boolean);
    if (extra.length) out.push(extra.join(' · '));
    if (m.warrantyExpiry) out.push(`Warranty ${day(m.warrantyExpiry)} tak`);
    else if (m.warrantyMonths) out.push(`Warranty ${m.warrantyMonths} mahine`);
  }
  for (const s of it.serials ?? []) {
    out.push([`S/N ${s.serialNumber}`, s.imei && `IMEI ${s.imei}`, s.macAddress && `MAC ${s.macAddress}`].filter(Boolean).join(' · '));
    if (s.warrantyEndDate) out.push(`Warranty ${day(s.warrantyEndDate)} tak`);
    if (s.physicalCondition && s.physicalCondition !== 'NEW') out.push(`Halat: ${String(s.physicalCondition).toLowerCase()}`);
  }
  for (const a of it.applianceSerials ?? []) {
    out.push(`S/N ${a.serialNumber}${a.warrantyEndDate ? ` · Warranty ${day(a.warrantyEndDate)} tak` : ''}`);
  }
  const u = it.usedPhone;
  if (u) {
    out.push([u.usedPhoneCode, u.imei1 && `IMEI ${u.imei1}`].filter(Boolean).join(' · '));
    const spec = [u.storage, u.ram && `${u.ram} RAM`, u.color, u.ptaStatus && PTA[u.ptaStatus], u.condition && `Halat ${String(u.condition).toLowerCase()}`].filter(Boolean);
    if (spec.length) out.push(spec.join(' · '));
    if (u.warrantyExpiryDate) out.push(`Warranty ${day(u.warrantyExpiryDate)} tak`);
  }
  if (n(it.returnedQty) > 0) out.push(`${n(it.returnedQty)} wapas ho chuka`);
  return out.filter(Boolean);
}

function lineName(it: any) {
  if (it.usedPhone) return `${it.usedPhone.brand ?? ''} ${it.usedPhone.model ?? ''}`.trim() || 'Phone';
  const base = it.product?.name ?? it.productName ?? it.name ?? 'Cheez';
  const v = it.variantLink?.variant?.name;
  return v ? `${base} (${v})` : base;
}

/**
 * Prints how the bill was priced (Settings → POS counter → tier on receipt):
 * one "Rate" row when every line used the same tier, otherwise the tier under
 * each line. Lines without a stored tier (older bills) add nothing.
 */
export function addTierToReceipt(doc: ReceiptDoc, tiers: Array<string | null | undefined>) {
  const known = tiers.map((t) => (isPriceTier(t) ? t : null));
  const used = [...new Set(known.filter(Boolean))] as PriceTier[];
  if (!used.length) return doc;
  if (used.length === 1 && known.every(Boolean)) {
    doc.infoRows = [...(doc.infoRows ?? []), { label: 'Rate', value: PRICE_TIER_FIELD[used[0]] }];
    return doc;
  }
  doc.lines = doc.lines.map((l, i) => {
    const t = known[i];
    return t ? { ...l, details: [...(l.details ?? []), PRICE_TIER_FIELD[t]] } : l;
  });
  return doc;
}

export function saleToReceipt(sale: any): ReceiptDoc {
  const lines: ReceiptLineDoc[] = (sale.items ?? []).map((it: any) => {
    const qty = n(it.quantity);
    const price = n(it.price ?? it.unitPrice);
    const total = n(it.total ?? qty * price);
    const discount = Math.max(Number((qty * price - total).toFixed(2)), 0);
    return {
      name: lineName(it), qty, unit: it.product?.unit ?? it.unit ?? 'pcs', price, total,
      discount: discount || undefined, note: it.note || undefined, details: itemDetails(it),
      sku: it.variantLink?.variant?.sku || it.product?.sku || undefined,
    };
  });

  const charges: any[] = Array.isArray(sale.serviceChargesBreakdown) ? sale.serviceChargesBreakdown : [];
  const shown = charges.filter((c) => !c?.passThrough);
  const rider = charges.filter((c) => c?.passThrough).reduce((s, c) => s + n(c.amount), 0);
  const service = shown.reduce((s, c) => s + n(c.amount), 0);
  const subtotal = n(sale.subtotal) || lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = n(sale.total);
  // Everything that took the bill down (hand, line, code and points discounts).
  const discount = Math.max(Number((subtotal + service - total).toFixed(2)), 0);

  const extraRows: ReceiptRowDoc[] = [
    ...shown.map((c) => ({ label: c.label || 'Service', value: `+${formatPKR(n(c.amount))}` })),
    ...(sale.discountCode ? [{ label: `Code ${sale.discountCode}`, value: n(sale.codeDiscount) ? `−${formatPKR(n(sale.codeDiscount))}` : 'laga' }] : []),
    ...(n(sale.loyaltyUsed) > 0 ? [{ label: `${n(sale.loyaltyUsed)} points istemal`, value: `−${formatPKR(n(sale.loyaltyDiscount))}` }] : []),
    ...(n(sale.loyaltyEarned) > 0 ? [{ label: 'Points mile', value: `+${n(sale.loyaltyEarned)}` }] : []),
    ...(n(sale.refundedAmount) > 0 ? [{ label: 'Wapas kiya', value: `−${formatPKR(n(sale.refundedAmount))}`, bold: true }] : []),
  ];

  const credit = n(sale.creditAmount);
  const balance = n(sale.customer?.balance);
  const split = paymentParts(sale.payments, n(sale.changeAmount));
  const offline = String(sale.id ?? '').startsWith('local_sale') || String(sale.saleNumber ?? '').startsWith('OFFLINE');

  return {
    saleNumber: sale.saleNumber ?? sale.invoiceNumber ?? String(sale.id ?? '').slice(-8).toUpperCase(),
    date: new Date(sale.soldAt ?? sale.createdAt ?? Date.now()),
    stamp: sale.status === 'VOIDED' ? 'CANCEL' : sale.status === 'FULLY_RETURNED' ? 'WAPAS' : offline ? 'OFFLINE' : undefined,
    branchName: sale.shop?.name ?? null,
    branchAddress: sale.shop?.address ?? null,
    branchPhone: sale.shop?.phone ?? null,
    customerName: sale.customer?.name ?? sale.customerName ?? undefined,
    customerPhone: sale.customer?.phone ?? sale.customerPhone ?? undefined,
    customerAddress: [sale.customer?.address, sale.customer?.area, sale.customer?.city].filter(Boolean).join(', ') || undefined,
    customerTaxId: sale.customer?.ntn || sale.customer?.cnic || undefined,
    receivedByName: sale.receivedByName || undefined,
    receivedByPhone: sale.receivedByPhone || undefined,
    cashierName: sale.createdBy?.fullName ?? sale.cashierName ?? undefined,
    lines,
    subtotal,
    discount,
    riderDelivery: rider || undefined,
    extraRows,
    total,
    paid: n(sale.paidAmount),
    paymentLabel: split.label ?? `Paid (${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod ?? 'Cash'})`,
    payments: split.lines,
    // The customer's khata before this bill, as far as today's balance tells.
    previousDue: sale.customer ? Math.max(balance - credit, 0) : 0,
  };
}

/** WhatsApp text of a bill. */
export function receiptText(doc: ReceiptDoc, shopName: string, accounts: PayAccount[] = []): string {
  const due = Math.max(doc.total - doc.paid, 0);
  const owed = due + (doc.previousDue ?? 0);
  const pay = owed > 0 && accounts.length
    ? ['', `*Baqi ${formatPKR(owed)} yahan bhejein:*`, ...accounts.map((a) => `${PAY_KIND_LABEL[a.kind] ?? 'Account'}${a.bank ? ` (${a.bank})` : ''}: ${a.number}${a.title ? ` — ${a.title}` : ''}${a.iban ? `\nIBAN ${a.iban}` : ''}`), `Reference: ${doc.saleNumber}`]
    : [];
  return [
    `*${shopName}*`,
    `Bill ${doc.saleNumber} · ${doc.date.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`,
    '',
    ...doc.lines.map((l) => `${l.qty} ${l.unit} ${l.name} — ${formatPKR(l.total)}`),
    '',
    doc.discount > 0 ? `Discount: −${formatPKR(doc.discount)}` : '',
    `*Total: ${formatPKR(doc.total)}*`,
    ...(doc.payments?.length ? doc.payments.map((p) => `${p.label}: ${formatPKR(p.amount)}`) : [`${doc.paymentLabel}: ${formatPKR(doc.paid)}`]),
    due > 0 ? `Udhaar: ${formatPKR(due)}` : '',
    ...pay,
    '',
    'Shukriya!',
    '_Nafaa POS · 0324-1772933_',
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}
