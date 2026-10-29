/**
 * Money on an online order: advance received (payment links and advances
 * the shop records by hand), the COD the courier still has to collect, and
 * who keeps the delivery charge. Pure functions, so the order panel, the
 * courier booking and the tests read the same numbers.
 *
 * Manual advances live in `metadata.payments` next to payment links, with
 * provider "MANUAL" and status "PAID", so everything that already sums paid
 * links (courier COD, link due, auto "paid") counts them too.
 */

export const ADVANCE_METHODS = ['JAZZCASH', 'EASYPAISA', 'BANK', 'CASH', 'OTHER'] as const;
export type AdvanceMethod = (typeof ADVANCE_METHODS)[number];

export interface ManualAdvance {
  ref: string;
  provider: 'MANUAL';
  method: AdvanceMethod;
  amount: number;
  kind: 'FULL' | 'ADVANCE';
  status: 'PAID';
  reference: string | null;
  createdAt: string;
  paidAt: string;
  by: string | null;
}

type PaymentRow = { status?: string; amount?: unknown; provider?: string; ref?: string };
const rows = (metadata: unknown): PaymentRow[] => {
  const list = (metadata as any)?.payments;
  return Array.isArray(list) ? list : [];
};

/** Advance already received: every paid payment link and manual advance. */
export const paidAdvance = (metadata: unknown) =>
  rows(metadata).filter((p) => p.status === 'PAID').reduce((s, p) => s + (Number(p.amount) || 0), 0);

export type DeliveryMode = 'CUSTOMER' | 'FREE' | 'RIDER';

/**
 * The money summary shown on an order. `deliveryFeeMode` is the channel
 * setting when known; after accept, `metadata.riderDelivery` is the record.
 */
export function orderMoney(
  o: { total: unknown; deliveryFee?: unknown; paymentStatus?: string | null; metadata?: unknown },
  deliveryFeeMode?: 'SHOP' | 'RIDER' | null,
) {
  const total = Number(o.total) || 0;
  const fee = Number(o.deliveryFee) || 0;
  const meta = (o.metadata ?? {}) as any;
  const advance = Math.round(paidAdvance(o.metadata) * 100) / 100;
  const riderDelivery = Number(meta.riderDelivery ?? 0) || 0;
  // A choice made on the order (before its bill) wins over the channel setting.
  const choice = meta.deliveryChoice as DeliveryMode | undefined;
  const deliveryMode: DeliveryMode = choice === 'FREE' ? 'FREE'
    : choice === 'CUSTOMER' ? (fee > 0 ? 'CUSTOMER' : 'FREE')
      : riderDelivery > 0 || (deliveryFeeMode === 'RIDER' && fee > 0) ? 'RIDER' : fee > 0 ? 'CUSTOMER' : 'FREE';
  // The website's delivery charge, also when the shop made it free here.
  const originalFee = Number(meta.deliveryOriginal?.fee ?? fee) || 0;
  const codDue = o.paymentStatus === 'PAID' ? 0 : Math.max(0, Math.round((total - advance) * 100) / 100);
  return { advance, codDue, deliveryMode, deliveryFee: fee, originalFee };
}

/**
 * Validates a hand-recorded advance and builds its row. `due` is what the
 * shop can still receive on the order. Returns an error message for bad input.
 */
export function buildManualAdvance(
  body: { amount?: unknown; method?: unknown; reference?: unknown },
  ctx: { due: number; ref: string; userId: string | null; now?: Date },
): { entry: ManualAdvance } | { error: string } {
  const amount = Math.round(Number(body?.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 1) return { error: 'Advance kam az kam Rs 1' };
  if (amount > ctx.due + 0.5) return { error: `Baqi sirf Rs ${Math.round(ctx.due).toLocaleString('en-PK')} hai` };
  const method = String(body?.method ?? '').toUpperCase() as AdvanceMethod;
  if (!ADVANCE_METHODS.includes(method)) return { error: 'Paisa kaise aaya — JazzCash, Easypaisa, bank, cash ya doosra chunein' };
  const reference = typeof body?.reference === 'string' && body.reference.trim() ? body.reference.trim().slice(0, 80) : null;
  const at = (ctx.now ?? new Date()).toISOString();
  return {
    entry: {
      ref: ctx.ref, provider: 'MANUAL', method, amount: Math.min(amount, Math.round(ctx.due * 100) / 100),
      kind: amount + 0.5 >= ctx.due ? 'FULL' : 'ADVANCE', status: 'PAID', reference, createdAt: at, paidAt: at, by: ctx.userId,
    },
  };
}
