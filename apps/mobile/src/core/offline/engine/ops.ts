/**
 * Typed offline operations for the screens. Each one:
 *  1. checks what can be checked on the phone (shop rules, stock),
 *  2. applies its result locally at once (stock down, khata up, the bill in
 *     history marked "pending sync"),
 *  3. queues the server call in the outbox (sent at once when online).
 *
 * The server's answer wins after sync: totals are replaced and a small note
 * is kept when they differed.
 */

import { kvGet, kvSet } from './kv';
import { getSale } from './lookups';
import { customerSearchText, getManifest, productSearchText, type Manifest } from './mirror';
import { checkSale, OfflineRuleError, saleTotals, type PaymentMethod, type SaleInput } from './rules';
import { digits } from './text';
import { discardOp, enqueue, getOp, isTempId, mapTempId, newTempId, registerHooks, type Ctx, type EffectInput } from './queue';
import type { OpKind, PriceTier, SaleRow } from './types';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const money = (v: number) => `Rs ${Math.round(v).toLocaleString('en-US')}`;

async function manifestOf(ctx: Ctx): Promise<Manifest | null> {
  return getManifest(ctx.db);
}

async function deviceCode(ctx: Ctx): Promise<string> {
  let code = await kvGet<string>(ctx.db, 'deviceCode');
  if (!code) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    await kvSet(ctx.db, 'deviceCode', code);
  }
  return code;
}

async function nextLocalNumber(ctx: Ctx, prefix: string): Promise<string> {
  const seq = ((await kvGet<number>(ctx.db, `seq:${prefix}`)) ?? 0) + 1;
  await kvSet(ctx.db, `seq:${prefix}`, seq);
  return `${prefix}-${await deviceCode(ctx)}-${String(seq).padStart(4, '0')}`;
}

/* ═════════════ sales ═════════════ */

export interface EnqueuedSale {
  opId: string;
  /** Local id of the bill until the server's id arrives (getSale works with either). */
  saleId: string;
  sale: SaleRow;
}

/**
 * Records a counter sale (cash, card, wallet, split, khata). The bill is in
 * history at once as "pending sync"; stock and khata move at once.
 *
 * Throws OfflineRuleError when a shop rule stops it: `pin_needed` (ask the
 * PIN and pass `managerPin`), `online_needed` (a PIN rule while offline),
 * `stock`, `customer_required`, `customer_for_credit`, `discount_off`, `credit_off`.
 */
export async function enqueueSale(
  ctx: Ctx,
  input: SaleInput,
  opts: { online: boolean; allowOversell?: boolean } = { online: true },
): Promise<EnqueuedSale> {
  const t = ctx.t;
  const manifest = await manifestOf(ctx);
  const check = await checkSale(ctx, manifest, input, { allowOversell: opts.allowOversell });
  if (check.problems.length) {
    const p = check.problems[0];
    throw new OfflineRuleError(p.code, p.message, check.problems);
  }
  if (check.needsPin.length && !input.managerPin) {
    if (!opts.online) {
      throw new OfflineRuleError('online_needed', t('{{what}} needs the owner\'s or manager\'s PIN, which needs internet.', { what: check.needsPin[0] }), check.needsPin);
    }
    throw new OfflineRuleError('pin_needed', t('{{what}} needs the owner\'s or manager\'s PIN.', { what: check.needsPin[0] }), check.needsPin);
  }
  const totals = check.totals;
  const saleId = newTempId(ctx, 'sale');
  const saleNumber = await nextLocalNumber(ctx, 'OFF');
  const soldAt = new Date(ctx.now()).toISOString();

  const customer = input.customerId
    ? await ctx.db.first<{ name: string; phone: string | null }>('SELECT name, phone FROM customers WHERE id = ?', [input.customerId])
    : null;
  const names = new Map<string, { name: string; unit: string }>();
  for (const it of input.items) {
    if (it.productId && !names.has(it.productId)) {
      const p = await ctx.db.first<{ name: string; unit: string }>('SELECT name, unit FROM products WHERE id = ?', [it.productId]);
      if (p) names.set(it.productId, p);
    }
  }

  // The body the server gets: the CreateSaleDto shape, without the phone's own fields.
  const body = {
    shopId: input.shopId,
    customerId: input.customerId || undefined,
    soldById: input.soldById,
    paymentMethod: input.paymentMethod,
    paidAmount: input.paidAmount,
    payments: input.payments?.length ? input.payments : undefined,
    discount: input.discount || 0,
    discountCode: input.discountCode || undefined,
    loyaltyPointsToUse: input.loyaltyPointsToUse || undefined,
    note: input.note,
    receivedByName: input.receivedByName,
    receivedByPhone: input.receivedByPhone,
    receivedByCnic: input.receivedByCnic,
    serviceCharges: input.serviceCharges?.length ? input.serviceCharges : undefined,
    managerPin: input.managerPin,
    items: input.items.map(({ name: _n, variantName: _v, ...it }) => it),
    // When the bill was rung up: the server dates it then (within 72 h), not at sync.
    clientSoldAt: soldAt,
  };

  const effects: EffectInput[] = [];
  for (const it of input.items) {
    if (!it.productId || it.usedPhoneId) continue;
    effects.push({ kind: 'stock', k1: input.shopId, k2: it.productId, k3: it.variantId ?? '', delta: -(Number(it.quantity) || 0) });
  }
  if (input.customerId && totals.creditAmount > 0) effects.push({ kind: 'balance', k1: input.customerId, delta: totals.creditAmount });
  if (input.customerId && input.loyaltyPointsToUse) effects.push({ kind: 'loyalty', k1: input.customerId, delta: -input.loyaltyPointsToUse });

  const local: Record<string, unknown> = {
    id: saleId, saleNumber, shopId: input.shopId, customerId: input.customerId ?? null, customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null, subtotal: totals.subtotal, discount: r2(totals.discount + totals.lineDiscounts),
    total: totals.total, paidAmount: totals.paidAmount, changeAmount: totals.changeAmount, creditAmount: totals.creditAmount,
    paymentMethod: input.paymentMethod, payments: input.payments ?? [], status: 'COMPLETED', soldAt, soldById: input.soldById ?? null,
    items: input.items.map((it, i) => ({
      productId: it.productId ?? null, variantId: it.variantId ?? null,
      name: it.name ?? (it.productId ? names.get(it.productId)?.name : null) ?? t('Item'),
      variantName: it.variantName ?? null, unit: it.productId ? names.get(it.productId)?.unit ?? null : null,
      unitName: it.unitName ?? null, unitQty: it.unitQty ?? null, quantity: it.quantity,
      price: totals.lines[i].unitPrice, total: totals.lines[i].lineTotal,
    })),
  };

  const opId = await enqueue(ctx, {
    kind: 'sale.create', method: 'POST', path: '/sales', body,
    title: t('Bill {{number}}', { number: saleNumber }), amount: totals.total, shopId: input.shopId,
    tempId: saleId, entity: 'sale', effects,
    meta: { saleId, saleNumber, localTotal: totals.total, codeDiscount: input.codeDiscount ?? 0, loyaltyDiscount: input.loyaltyDiscount ?? 0 },
  });
  await ctx.db.run(
    `INSERT INTO sales (id, saleNumber, shopId, customerId, customerName, total, status, soldAt, pending, opId, note, data, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, 1, ?, NULL, ?, ?)`,
    [saleId, saleNumber, input.shopId, input.customerId ?? null, customer?.name ?? null, totals.total, soldAt, opId, JSON.stringify(local), soldAt],
  );
  ctx.emit('sales');
  ctx.emit('stock');
  if (input.customerId) ctx.emit('customers');
  return { opId, saleId, sale: (await getSale(ctx.db, saleId))! };
}

registerHooks('sale.create', {
  async done(ctx, op, data) {
    const meta = op.meta as { saleId: string; saleNumber: string; localTotal: number };
    const s = data as Record<string, unknown> & { id: string; saleNumber: string; total: number };
    if (!s?.id) return;
    const row = await ctx.db.first<{ data: string }>('SELECT data FROM sales WHERE id = ?', [meta.saleId]);
    const local = row ? (JSON.parse(row.data) as Record<string, unknown>) : {};
    const serverItems = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
    const merged = {
      ...local,
      id: s.id, saleNumber: s.saleNumber, status: s.status ?? 'COMPLETED',
      subtotal: s.subtotal ?? local.subtotal, discount: s.discount ?? local.discount, total: s.total,
      paidAmount: s.paidAmount ?? local.paidAmount, changeAmount: s.changeAmount ?? local.changeAmount,
      creditAmount: s.creditAmount ?? local.creditAmount, soldAt: s.soldAt ?? local.soldAt,
      payments: Array.isArray(s.payments) ? s.payments : local.payments,
      items: serverItems.length
        ? serverItems.map((it, i) => {
          const before = ((local.items as Array<Record<string, unknown>>) ?? [])[i] ?? {};
          const product = it.product as { name?: string; unit?: string } | undefined;
          return {
            ...before, id: it.id, productId: it.productId ?? before.productId ?? null,
            name: product?.name ?? before.name, unit: product?.unit ?? before.unit,
            quantity: it.quantity ?? before.quantity, returnedQty: it.returnedQty ?? 0, price: it.price ?? before.price, total: it.total ?? before.total,
          };
        })
        : local.items,
    };
    const diff = Math.abs((Number(s.total) || 0) - (Number(meta.localTotal) || 0));
    const note = diff >= 0.5
      ? ctx.t('The server total for bill {{number}} is {{server}} (the phone had {{local}}).', { number: s.saleNumber, server: money(Number(s.total)), local: money(meta.localTotal) })
      : null;
    await ctx.db.run('DELETE FROM sales WHERE id = ? AND id <> ?', [s.id, meta.saleId]);
    await ctx.db.run(
      'UPDATE sales SET id = ?, saleNumber = ?, total = ?, status = ?, soldAt = ?, pending = 0, note = ?, data = ? WHERE id = ?',
      [s.id, s.saleNumber, Number(s.total) || 0, String(s.status ?? 'COMPLETED'), String(merged.soldAt), note, JSON.stringify(merged), meta.saleId],
    );
    await mapTempId(ctx, meta.saleId, s.id, 'sale');
    if (note) await ctx.db.run('INSERT INTO notes (opId, text, createdAt) VALUES (?, ?, ?)', [op.id, note, ctx.now()]);
    ctx.emit('sales');
  },
  async refused(_ctx, op, code) {
    // A code or points accepted offline may be refused now (limit reached, points spent elsewhere).
    // The customer already paid the counter total, so send the same rupees as a plain discount (web rule).
    const body = op.body as Record<string, unknown>;
    const meta = op.meta as { codeDiscount: number; loyaltyDiscount: number };
    if (code === 'stock' || code === 'not_found' || code === 'pin' || code === 'permission') return undefined;
    if (!body.discountCode && !body.loyaltyPointsToUse) return undefined;
    const { discountCode: _c, loyaltyPointsToUse: _p, ...plain } = body;
    return { ...plain, discount: r2(Number(body.discount || 0) + (meta.codeDiscount || 0) + (meta.loyaltyDiscount || 0)) };
  },
  async discarded(ctx, op) {
    const meta = op.meta as { saleId: string };
    await ctx.db.run('DELETE FROM sales WHERE id = ?', [meta.saleId]);
    ctx.emit('sales');
    ctx.emit('stock');
  },
});

/**
 * Cancels a bill. A bill still waiting on this phone is removed here
 * (stock and khata go back) and never reaches the server. A bill already
 * on the server gets a void request; when the shop asks a PIN for voids
 * that needs internet.
 */
export async function enqueueVoid(
  ctx: Ctx,
  saleId: string,
  input: { reason?: string; managerPin?: string; online: boolean },
): Promise<{ cancelledLocally: boolean; opId: string | null }> {
  const t = ctx.t;
  const sale = await getSale(ctx.db, saleId);
  if (!sale) throw new OfflineRuleError('not_found', t('This bill is not on this phone.'));
  if (sale.pending && sale.opId) {
    const op = await getOp(ctx, sale.opId);
    if (op?.status === 'sending') throw new OfflineRuleError('busy', t('This bill is being sent right now. Try again in a moment.'));
    if (op && op.status !== 'done') {
      await discardOp(ctx, op.id);
      return { cancelledLocally: true, opId: null };
    }
  }
  if (isTempId(sale.id)) throw new OfflineRuleError('not_synced', t('This bill has not reached the server yet. Try again after sync.'));
  const manifest = await manifestOf(ctx);
  if (manifest?.settings?.requirePinForVoid && !input.managerPin) {
    if (!input.online) throw new OfflineRuleError('online_needed', t('Cancelling a bill needs the manager\'s PIN, which needs internet.'));
    throw new OfflineRuleError('pin_needed', t('Cancelling a bill needs the owner\'s or manager\'s PIN.'));
  }
  const effects: EffectInput[] = [];
  for (const it of sale.items) {
    if (!it.productId) continue;
    const left = (it.quantity || 0) - (it.returnedQty || 0);
    if (left > 0) effects.push({ kind: 'stock', k1: sale.shopId ?? '', k2: it.productId, k3: it.variantId ?? '', delta: left });
  }
  if (sale.customerId && sale.creditAmount > 0) effects.push({ kind: 'balance', k1: sale.customerId, delta: -sale.creditAmount });
  const opId = await enqueue(ctx, {
    kind: 'sale.void', method: 'POST', path: `/sales/${sale.id}/void`,
    body: { reason: input.reason, managerPin: input.managerPin },
    title: t('Cancel bill {{number}}', { number: sale.saleNumber }), amount: sale.total, shopId: sale.shopId, effects,
    meta: { saleId: sale.id, previousStatus: sale.status },
  });
  await setSaleStatus(ctx, sale.id, 'VOIDED');
  return { cancelledLocally: false, opId };
}

async function setSaleStatus(ctx: Ctx, id: string, status: string) {
  const row = await ctx.db.first<{ data: string }>('SELECT data FROM sales WHERE id = ?', [id]);
  if (!row) return;
  const data = { ...JSON.parse(row.data), status };
  await ctx.db.run('UPDATE sales SET status = ?, data = ? WHERE id = ?', [status, JSON.stringify(data), id]);
  ctx.emit('sales');
}

registerHooks('sale.void', {
  async discarded(ctx, op) {
    const meta = op.meta as { saleId: string; previousStatus: string };
    await setSaleStatus(ctx, meta.saleId, meta.previousStatus);
  },
});

export interface ReturnInput {
  saleId: string;
  items: Array<{ saleItemId: string; quantity: number; restock?: boolean; isDamaged?: boolean }>;
  refundMethod: PaymentMethod | 'CREDIT';
  reason?: string;
  notes?: string;
  managerPin?: string;
  online: boolean;
}

/** Return of items from a bill that is on the server. With the shop's refund PIN rule (on by default) it needs internet. */
export async function enqueueReturn(ctx: Ctx, input: ReturnInput): Promise<string> {
  const t = ctx.t;
  const sale = await getSale(ctx.db, input.saleId);
  if (!sale) throw new OfflineRuleError('not_found', t('This bill is not on this phone.'));
  if (sale.pending || isTempId(sale.id)) throw new OfflineRuleError('not_synced', t('This bill has not reached the server yet. Try again after sync.'));
  const manifest = await manifestOf(ctx);
  if (manifest?.settings?.requirePinForRefund !== false && !input.managerPin) {
    if (!input.online) throw new OfflineRuleError('online_needed', t('Returns need the manager\'s PIN in this shop, which needs internet.'));
    throw new OfflineRuleError('pin_needed', t('Returns need the owner\'s or manager\'s PIN.'));
  }
  const effects: EffectInput[] = [];
  let refund = 0;
  for (const r of input.items) {
    const line = sale.items.find((i) => i.id === r.saleItemId);
    if (!line) throw new OfflineRuleError('not_found', t('An item of this return is not on the bill.'));
    refund += (line.price || 0) * r.quantity;
    if (line.productId && r.restock !== false && !r.isDamaged) {
      effects.push({ kind: 'stock', k1: sale.shopId ?? '', k2: line.productId, k3: line.variantId ?? '', delta: r.quantity });
    }
  }
  if (input.refundMethod === 'CREDIT' && sale.customerId) effects.push({ kind: 'balance', k1: sale.customerId, delta: -r2(refund) });
  return enqueue(ctx, {
    kind: 'sale.return', method: 'POST', path: '/returns',
    body: { saleId: sale.id, items: input.items, refundMethod: input.refundMethod, reason: input.reason, notes: input.notes, managerPin: input.managerPin },
    title: t('Return on bill {{number}}', { number: sale.saleNumber }), amount: r2(refund), shopId: sale.shopId, effects,
  });
}

/* ═════════════ customers and khata ═════════════ */

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  cnic?: string;
  address?: string;
  city?: string;
  area?: string;
  notes?: string;
  creditLimit?: number;
  isVip?: boolean;
  priceTier?: PriceTier | null;
  [extra: string]: unknown;
}

/** New customer, usable at once (a bill for them can be made right away; it is sent after the customer). */
export async function enqueueCustomerCreate(ctx: Ctx, input: CustomerInput): Promise<{ opId: string; customerId: string }> {
  const id = newTempId(ctx, 'customer');
  const { search, skel } = customerSearchText(input);
  const opId = await enqueue(ctx, {
    kind: 'customer.create', method: 'POST', path: '/customers', body: input,
    title: ctx.t('New customer: {{name}}', { name: input.name }), tempId: id, entity: 'customer',
    meta: { customerId: id },
  });
  await ctx.db.run(
    `INSERT INTO customers (id, name, phone, phoneDigits, email, cnic, address, city, area, priceTier, creditLimit, balance, loyaltyPoints,
       totalSpent, isVip, isActive, search, skel, local, dirty, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 1, ?, ?, 1, 0, ?)`,
    [id, input.name, input.phone ?? null, digits(input.phone), input.email ?? null, input.cnic ?? null, input.address ?? null, input.city ?? null,
      input.area ?? null, input.priceTier ?? null, input.creditLimit ?? null, input.isVip ? 1 : 0, search, skel, new Date(ctx.now()).toISOString()],
  );
  ctx.emit('customers');
  return { opId, customerId: id };
}

async function adoptCustomer(ctx: Ctx, tempId: string, server: Record<string, unknown> & { id: string }) {
  const exists = await ctx.db.first<{ id: string }>('SELECT id FROM customers WHERE id = ?', [server.id]);
  if (exists) await ctx.db.run('DELETE FROM customers WHERE id = ?', [tempId]);
  else {
    await ctx.db.run('UPDATE customers SET id = ?, local = 0, updatedAt = ? WHERE id = ?', [server.id, String(server.updatedAt ?? ''), tempId]);
  }
  await mapTempId(ctx, tempId, server.id, 'customer');
  ctx.emit('customers');
}

registerHooks('customer.create', {
  async done(ctx, op, data) {
    const meta = op.meta as { customerId: string };
    const c = data as Record<string, unknown> & { id: string };
    if (c?.id) await adoptCustomer(ctx, meta.customerId, c);
  },
  async discarded(ctx, op) {
    const meta = op.meta as { customerId: string };
    await ctx.db.run('DELETE FROM customers WHERE id = ? AND local = 1', [meta.customerId]);
    ctx.emit('customers');
  },
});

/**
 * For a "customer already exists" issue: use the customer that is on the
 * server instead. Bills and payments made for the offline copy go to it.
 */
export async function useExistingCustomer(ctx: Ctx, opId: string, serverCustomerId: string): Promise<void> {
  const op = await getOp(ctx, opId);
  if (!op || op.kind !== 'customer.create' || op.status === 'done') return;
  const meta = op.meta as { customerId: string };
  await ctx.db.tx(async (db) => {
    const tc: Ctx = { ...ctx, db };
    await db.run("UPDATE outbox SET status = 'done', doneAt = ?, issue = NULL, result = ? WHERE id = ?", [ctx.now(), JSON.stringify({ id: serverCustomerId }), opId]);
    await adoptCustomer(tc, meta.customerId, { id: serverCustomerId });
    await db.run("UPDATE outbox SET status = 'pending', issue = NULL WHERE status = 'issue' AND issue = 'waiting'");
  });
  ctx.emit('outbox');
  ctx.emit('issues');
}

/** Edit a customer (also one made offline). The change shows at once. */
export async function enqueueCustomerUpdate(ctx: Ctx, id: string, patch: Partial<CustomerInput>): Promise<string> {
  const before = await ctx.db.first<Record<string, unknown>>('SELECT * FROM customers WHERE id = ?', [id]);
  if (!before) throw new OfflineRuleError('not_found', ctx.t('This customer is not on this phone.'));
  const next = { ...before, ...patch } as CustomerInput & Record<string, unknown>;
  const { search, skel } = customerSearchText(next);
  const cols = ['name', 'phone', 'email', 'cnic', 'address', 'city', 'area', 'priceTier', 'creditLimit'] as const;
  await ctx.db.run(
    `UPDATE customers SET ${cols.map((c) => `${c} = ?`).join(', ')}, isVip = ?, phoneDigits = ?, search = ?, skel = ?, dirty = dirty + 1 WHERE id = ?`,
    [...cols.map((c) => (next[c] as string | number | null | undefined) ?? null), next.isVip ? 1 : 0, digits(next.phone as string), search, skel, id],
  );
  const opId = await enqueue(ctx, {
    kind: 'customer.update', method: 'PATCH', path: `/customers/${id}`, body: patch,
    title: ctx.t('Customer changed: {{name}}', { name: String(next.name) }), meta: { customerId: id, before },
  });
  ctx.emit('customers');
  return opId;
}

async function undirtyCustomer(ctx: Ctx, id: string) {
  await ctx.db.run('UPDATE customers SET dirty = MAX(dirty - 1, 0) WHERE id = ? OR id = (SELECT serverId FROM idmap WHERE tempId = ?)', [id, id]);
}

registerHooks('customer.update', {
  async done(ctx, op) {
    await undirtyCustomer(ctx, (op.meta as { customerId: string }).customerId);
  },
  async discarded(ctx, op) {
    const meta = op.meta as { customerId: string; before: Record<string, unknown> };
    const b = meta.before;
    await ctx.db.run(
      'UPDATE customers SET name = ?, phone = ?, phoneDigits = ?, email = ?, cnic = ?, address = ?, city = ?, area = ?, priceTier = ?, creditLimit = ?, isVip = ?, search = ?, skel = ? WHERE id = ?',
      [b.name as string, (b.phone as string) ?? null, (b.phoneDigits as string) ?? null, (b.email as string) ?? null, (b.cnic as string) ?? null,
        (b.address as string) ?? null, (b.city as string) ?? null, (b.area as string) ?? null, (b.priceTier as string) ?? null,
        (b.creditLimit as number) ?? null, (b.isVip as number) ?? 0, b.search as string, b.skel as string, meta.customerId],
    );
    await undirtyCustomer(ctx, meta.customerId);
    ctx.emit('customers');
  },
});

/** Money received against a customer's khata. The balance drops at once. */
export async function enqueueKhataPayment(
  ctx: Ctx,
  input: { customerId: string; amount: number; paymentMethod?: PaymentMethod; reference?: string; note?: string; shopId?: string | null },
): Promise<string> {
  if (!(input.amount > 0)) throw new OfflineRuleError('empty', ctx.t('Enter an amount.'));
  const c = await ctx.db.first<{ name: string }>('SELECT name FROM customers WHERE id = ?', [input.customerId]);
  const opId = await enqueue(ctx, {
    kind: 'khata.payment', method: 'POST', path: `/customer-ledger/${input.customerId}/payment`,
    body: { amount: input.amount, paymentMethod: input.paymentMethod ?? 'CASH', reference: input.reference, note: input.note },
    title: ctx.t('Payment from {{name}}', { name: c?.name ?? '' }), amount: input.amount, shopId: input.shopId ?? null,
    effects: [{ kind: 'balance', k1: input.customerId, delta: -input.amount }],
  });
  ctx.emit('customers');
  return opId;
}

/** Credit given without a bill (old hisaab, goods given without a bill). */
export async function enqueueKhataUdhaar(
  ctx: Ctx,
  input: { customerId: string; amount: number; reference?: string; note?: string; shopId?: string | null },
): Promise<string> {
  if (!(input.amount > 0)) throw new OfflineRuleError('empty', ctx.t('Enter an amount.'));
  const c = await ctx.db.first<{ name: string }>('SELECT name FROM customers WHERE id = ?', [input.customerId]);
  const opId = await enqueue(ctx, {
    kind: 'khata.udhaar', method: 'POST', path: `/customer-ledger/${input.customerId}/udhaar`,
    body: { amount: input.amount, reference: input.reference, note: input.note },
    title: ctx.t('Khata for {{name}}', { name: c?.name ?? '' }), amount: input.amount, shopId: input.shopId ?? null,
    effects: [{ kind: 'balance', k1: input.customerId, delta: input.amount }],
  });
  ctx.emit('customers');
  return opId;
}

/* ═════════════ money ═════════════ */

export interface ExpenseInput {
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  categoryId?: string;
  description?: string;
  /** YYYY-MM-DD or ISO; empty means today. */
  expenseDate?: string;
  status?: 'PENDING' | 'PAID';
  shopId?: string;
}

export async function enqueueExpense(ctx: Ctx, input: ExpenseInput): Promise<string> {
  if (!(input.amount > 0)) throw new OfflineRuleError('empty', ctx.t('Enter an amount.'));
  return enqueue(ctx, {
    kind: 'expense.create', method: 'POST', path: '/expenses',
    body: { ...input, expenseDate: input.expenseDate ?? new Date(ctx.now()).toISOString() },
    title: ctx.t('Expense: {{title}}', { title: input.title }), amount: input.amount, shopId: input.shopId ?? null, entity: 'expense',
  });
}

export interface IncomeInput {
  title: string;
  amount: number;
  /** IncomeCategory of the server (e.g. OTHER). */
  category: string;
  categoryId?: string;
  receivedVia: 'CASH_DRAWER' | 'ACCOUNT' | 'SUPPLIER_KHATA';
  moneyAccountId?: string;
  supplierId?: string;
  incomeDate?: string;
  note?: string;
  repeatMonthly?: boolean;
  shopId?: string;
}

export async function enqueueIncome(ctx: Ctx, input: IncomeInput): Promise<string> {
  if (!(input.amount > 0)) throw new OfflineRuleError('empty', ctx.t('Enter an amount.'));
  return enqueue(ctx, {
    kind: 'income.create', method: 'POST', path: '/income',
    body: { ...input, incomeDate: input.incomeDate ?? new Date(ctx.now()).toISOString() },
    title: ctx.t('Other income: {{title}}', { title: input.title }), amount: input.amount, shopId: input.shopId ?? null, entity: 'income',
  });
}

/* ═════════════ stock ═════════════ */

export type AdjustmentType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'OPENING_BALANCE';

export async function enqueueStockAdjustment(
  ctx: Ctx,
  input: { productId: string; variantId?: string; shopId: string; type: AdjustmentType; quantity: number; reason: string; reasonCode?: string; note?: string },
): Promise<string> {
  if (!(input.quantity > 0)) throw new OfflineRuleError('empty', ctx.t('Enter a quantity.'));
  const sign = input.type === 'ADJUSTMENT_IN' || input.type === 'OPENING_BALANCE' ? 1 : -1;
  const p = await ctx.db.first<{ name: string }>('SELECT name FROM products WHERE id = ?', [input.productId]);
  const opId = await enqueue(ctx, {
    kind: 'stock.adjust', method: 'POST', path: '/stock-adjustments', body: input,
    title: ctx.t('Stock {{dir}}: {{name}}', { dir: sign > 0 ? '+' : '-', name: p?.name ?? '' }), amount: null, shopId: input.shopId,
    effects: [{ kind: 'stock', k1: input.shopId, k2: input.productId, k3: input.variantId ?? '', delta: sign * input.quantity }],
  });
  ctx.emit('stock');
  return opId;
}

/** Damage report. Stock moves when the report is approved on the server, so nothing moves here. */
export async function enqueueDamage(
  ctx: Ctx,
  input: { productId: string; variantId?: string; unitId?: string; shopId?: string; quantity: number; reason: string; reasonCode?: string; notes?: string; unitCost?: number; salvageValue?: number; supplierClaim?: boolean; claimAmount?: number },
): Promise<string> {
  if (!(input.quantity > 0)) throw new OfflineRuleError('empty', ctx.t('Enter a quantity.'));
  const p = await ctx.db.first<{ name: string }>('SELECT name FROM products WHERE id = ?', [input.productId]);
  return enqueue(ctx, {
    kind: 'stock.damage', method: 'POST', path: '/retail/damage', body: input,
    title: ctx.t('Damage: {{name}}', { name: p?.name ?? '' }), shopId: input.shopId ?? null,
  });
}

export interface PurchaseInput {
  supplierId: string;
  shopId?: string;
  paymentMethod: PaymentMethod;
  paidAmount?: number;
  discount?: number;
  otherCharges?: number;
  taxAmount?: number;
  notes?: string;
  supplierInvoiceNo?: string;
  purchasedAt?: string;
  dueDate?: string;
  /** false = order only, goods not here yet. Default: received now. */
  receive?: boolean;
  items: Array<{ productId?: string; variantId?: string; unitId?: string; unitName?: string; conversionRate?: number; quantity: number; costPrice: number; salePrice?: number; batchNo?: string; expiryDate?: string }>;
  [extra: string]: unknown;
}

/** Purchase / goods received. Received goods are added to stock at once. */
export async function enqueuePurchase(ctx: Ctx, input: PurchaseInput): Promise<string> {
  if (!input.items.length) throw new OfflineRuleError('empty', ctx.t('Add at least one item.'));
  const effects: EffectInput[] = [];
  if (input.receive !== false && input.shopId) {
    for (const it of input.items) {
      if (!it.productId) continue;
      effects.push({ kind: 'stock', k1: input.shopId, k2: it.productId, k3: it.variantId ?? '', delta: it.quantity * (it.conversionRate || 1) });
    }
  }
  const total = r2(input.items.reduce((s, i) => s + i.quantity * i.costPrice, 0) - (input.discount ?? 0) + (input.otherCharges ?? 0) + (input.taxAmount ?? 0));
  const opId = await enqueue(ctx, {
    kind: 'purchase.create', method: 'POST', path: '/purchases', body: input,
    title: input.receive === false ? ctx.t('Purchase order') : ctx.t('Goods received'), amount: total, shopId: input.shopId ?? null,
    entity: 'purchase', effects,
  });
  if (effects.length) ctx.emit('stock');
  return opId;
}

/* ═════════════ products ═════════════ */

export interface ProductInput {
  name: string;
  price: number;
  costPrice?: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  sku?: string;
  barcode?: string;
  unit?: string;
  categoryId?: string;
  brandId?: string;
  taxRate?: number;
  /** Opening stock in `shopId`. */
  stock?: number;
  lowStockAlert?: number;
  shopId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  expiryTracked?: boolean;
  [extra: string]: unknown;
}

/** New product, sellable at once (scan its barcode, add to a bill); sent before any bill that uses it. */
export async function enqueueProductCreate(ctx: Ctx, input: ProductInput): Promise<{ opId: string; productId: string }> {
  const id = newTempId(ctx, 'product');
  const cat = input.categoryId ? await ctx.db.first<{ name: string; data: string }>("SELECT name, data FROM lookups WHERE type = 'category' AND id = ?", [input.categoryId]) : null;
  const brand = input.brandId ? await ctx.db.first<{ name: string }>("SELECT name FROM lookups WHERE type = 'brand' AND id = ?", [input.brandId]) : null;
  const { search, skel } = productSearchText({ name: input.name, sku: input.sku ?? null, barcode: input.barcode ?? null, brandName: brand?.name ?? null, categoryName: cat?.name ?? null });
  const effects: EffectInput[] = input.stock && input.shopId ? [{ kind: 'stock', k1: input.shopId, k2: id, k3: '', delta: input.stock }] : [];
  const opId = await enqueue(ctx, {
    kind: 'product.create', method: 'POST', path: '/products', body: input,
    title: ctx.t('New product: {{name}}', { name: input.name }), amount: input.price, shopId: input.shopId ?? null,
    tempId: id, entity: 'product', effects, meta: { productId: id },
  });
  await ctx.db.tx(async (db) => {
    await db.run(
      `INSERT INTO products (id, name, sku, barcode, unit, price, costPrice, wholesalePrice, creditPrice, taxRate, lowStockAlert, hasVariants,
         isRawMaterial, expiryTracked, isActive, isFeatured, categoryId, categoryName, brandId, brandName, search, skel, local, dirty, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
      [id, input.name, input.sku ?? null, input.barcode ?? null, input.unit ?? 'pcs', input.price, input.costPrice ?? null, input.wholesalePrice ?? null,
        input.creditPrice ?? null, input.taxRate ?? 0, input.lowStockAlert ?? 0, input.expiryTracked ? 1 : 0, input.isFeatured ? 1 : 0,
        input.categoryId ?? null, cat?.name ?? null, input.brandId ?? null, brand?.name ?? null, search, skel, new Date(ctx.now()).toISOString()],
    );
    for (const c of [input.barcode, input.sku]) {
      if (c?.trim()) await db.run("INSERT OR IGNORE INTO codes (code, productId, variantId, packId, kind) VALUES (?, ?, '', '', 'product')", [c.trim().toLowerCase(), id]);
    }
    if (input.shopId) {
      await db.run("INSERT OR IGNORE INTO stock (shopId, productId, variantId, qty, reserved) VALUES (?, ?, '', 0, 0)", [input.shopId, id]);
    }
  });
  ctx.emit('products');
  return { opId, productId: id };
}

registerHooks('product.create', {
  async done(ctx, op, data) {
    const meta = op.meta as { productId: string };
    const p = data as { id?: string; updatedAt?: string };
    if (!p?.id) return;
    const tempId = meta.productId;
    const exists = await ctx.db.first<{ id: string }>('SELECT id FROM products WHERE id = ?', [p.id]);
    if (exists) {
      await ctx.db.run('DELETE FROM products WHERE id = ?', [tempId]);
      await ctx.db.run('DELETE FROM codes WHERE productId = ?', [tempId]);
    } else {
      await ctx.db.run('UPDATE products SET id = ?, local = 0, updatedAt = ? WHERE id = ?', [p.id, p.updatedAt ?? null, tempId]);
      await ctx.db.run('UPDATE codes SET productId = ? WHERE productId = ?', [p.id, tempId]);
    }
    await ctx.db.run('UPDATE OR IGNORE stock SET productId = ? WHERE productId = ?', [p.id, tempId]);
    await ctx.db.run('DELETE FROM stock WHERE productId = ?', [tempId]);
    await mapTempId(ctx, tempId, p.id, 'product');
    ctx.emit('products');
  },
  async discarded(ctx, op) {
    const meta = op.meta as { productId: string };
    for (const t of ['products', 'codes', 'stock']) await ctx.db.run(`DELETE FROM ${t} WHERE ${t === 'products' ? 'id' : 'productId'} = ?`, [meta.productId]);
    ctx.emit('products');
  },
});

/** Edit a product or change its price. Shows at once; the server's copy replaces it after sync. */
export async function enqueueProductUpdate(ctx: Ctx, id: string, patch: Partial<ProductInput>): Promise<string> {
  const before = await ctx.db.first<Record<string, unknown>>('SELECT * FROM products WHERE id = ?', [id]);
  if (!before) throw new OfflineRuleError('not_found', ctx.t('This product is not on this phone.'));
  const next = { ...before, ...patch } as Record<string, unknown>;
  const { search, skel } = productSearchText({
    name: String(next.name), sku: (next.sku as string) ?? null, barcode: (next.barcode as string) ?? null,
    brandName: (next.brandName as string) ?? null, categoryName: (next.categoryName as string) ?? null,
  });
  const cols = ['name', 'sku', 'barcode', 'unit', 'price', 'costPrice', 'wholesalePrice', 'creditPrice', 'taxRate', 'lowStockAlert', 'categoryId', 'brandId'] as const;
  await ctx.db.tx(async (db) => {
    await db.run(
      `UPDATE products SET ${cols.map((c) => `${c} = ?`).join(', ')}, isActive = ?, isFeatured = ?, search = ?, skel = ?, dirty = dirty + 1 WHERE id = ?`,
      [...cols.map((c) => (next[c] as string | number | null | undefined) ?? null), next.isActive === false || next.isActive === 0 ? 0 : 1,
        next.isFeatured ? 1 : 0, search, skel, id],
    );
    if (patch.barcode !== undefined || patch.sku !== undefined) {
      await db.run("DELETE FROM codes WHERE productId = ? AND kind = 'product'", [id]);
      for (const c of [next.barcode as string | null, next.sku as string | null]) {
        if (c?.trim()) await db.run("INSERT OR IGNORE INTO codes (code, productId, variantId, packId, kind) VALUES (?, ?, '', '', 'product')", [c.trim().toLowerCase(), id]);
      }
    }
  });
  const priceOnly = Object.keys(patch).every((k) => ['price', 'wholesalePrice', 'creditPrice', 'costPrice'].includes(k));
  const opId = await enqueue(ctx, {
    kind: 'product.update', method: 'PATCH', path: `/products/${id}`, body: patch,
    title: priceOnly ? ctx.t('Price change: {{name}}', { name: String(next.name) }) : ctx.t('Product changed: {{name}}', { name: String(next.name) }),
    amount: patch.price ?? null, meta: { productId: id, before },
  });
  ctx.emit('products');
  return opId;
}

async function undirtyProduct(ctx: Ctx, id: string) {
  await ctx.db.run('UPDATE products SET dirty = MAX(dirty - 1, 0) WHERE id = ? OR id = (SELECT serverId FROM idmap WHERE tempId = ?)', [id, id]);
}

registerHooks('product.update', {
  async done(ctx, op) {
    await undirtyProduct(ctx, (op.meta as { productId: string }).productId);
  },
  async discarded(ctx, op) {
    const meta = op.meta as { productId: string; before: Record<string, unknown> };
    const b = meta.before;
    const cols = ['name', 'sku', 'barcode', 'unit', 'price', 'costPrice', 'wholesalePrice', 'creditPrice', 'taxRate', 'lowStockAlert', 'categoryId', 'brandId', 'isActive', 'isFeatured', 'search', 'skel'];
    await ctx.db.run(`UPDATE products SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => (b[c] as string | number | null) ?? null), meta.productId]);
    await undirtyProduct(ctx, meta.productId);
    ctx.emit('products');
  },
});

/* ═════════════ attendance ═════════════ */

export async function enqueueAttendance(
  ctx: Ctx,
  input: { staffId: string; action: 'in' | 'out'; note?: string },
): Promise<string> {
  const at = new Date(ctx.now()).toISOString();
  const staff = await ctx.db.first<{ name: string }>("SELECT name FROM lookups WHERE type = 'staff' AND id = ?", [input.staffId]);
  const kind: OpKind = input.action === 'in' ? 'attendance.checkIn' : 'attendance.checkOut';
  const opId = await enqueue(ctx, {
    kind, method: 'POST', path: `/staff/timesheet/${input.action === 'in' ? 'check-in' : 'check-out'}`,
    body: { staffId: input.staffId, note: input.note, at },
    title: input.action === 'in' ? ctx.t('Check-in: {{name}}', { name: staff?.name ?? '' }) : ctx.t('Check-out: {{name}}', { name: staff?.name ?? '' }),
  });
  const key = `attendance:${at.slice(0, 10)}`;
  const day = (await kvGet<Record<string, { in?: string; out?: string }>>(ctx.db, key)) ?? {};
  day[input.staffId] = { ...day[input.staffId], [input.action]: at };
  await kvSet(ctx.db, key, day);
  return opId;
}

/** Check-in and check-out times recorded on this phone for a day (YYYY-MM-DD, UTC date of the punch). */
export async function attendanceToday(ctx: Ctx, day = new Date(ctx.now()).toISOString().slice(0, 10)) {
  return (await kvGet<Record<string, { in?: string; out?: string }>>(ctx.db, `attendance:${day}`)) ?? {};
}

/* ═════════════ cash register ═════════════ */

export interface RegisterState {
  shopId: string;
  open: boolean;
  registerId: string | null;
  registerNumber: string | null;
  openedAt: string | null;
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  /** Open op still waiting in the outbox. */
  pending: boolean;
}

const regKey = (shopId: string) => `register:${shopId}`;

/** The register as this phone knows it: the server's open register, with offline open/close/cash on top. */
export async function registerState(ctx: Ctx, shopId: string): Promise<RegisterState> {
  const local = await kvGet<RegisterState>(ctx.db, regKey(shopId));
  if (local) return local;
  const m = await manifestOf(ctx);
  const r = m?.registers.find((x) => x.shopId === shopId);
  return {
    shopId, open: !!r, registerId: r?.id ?? null, registerNumber: r?.registerNumber ?? null, openedAt: r?.openedAt ?? null,
    openingBalance: r?.openingBalance ?? 0, cashIn: 0, cashOut: 0, pending: false,
  };
}

export async function enqueueRegisterOpen(ctx: Ctx, input: { shopId: string; openingBalance: number; notes?: string; denominations?: Record<string, number> }): Promise<string> {
  const cur = await registerState(ctx, input.shopId);
  if (cur.open) throw new OfflineRuleError('busy', ctx.t('The register is already open.'));
  const tempId = newTempId(ctx, 'register');
  const opId = await enqueue(ctx, {
    kind: 'register.open', method: 'POST', path: '/cash-register/open', body: { ...input, clientOpenedAt: new Date(ctx.now()).toISOString() },
    title: ctx.t('Register opened'), amount: input.openingBalance, shopId: input.shopId, tempId, entity: 'register', meta: { shopId: input.shopId },
  });
  await kvSet(ctx.db, regKey(input.shopId), {
    shopId: input.shopId, open: true, registerId: tempId, registerNumber: null, openedAt: new Date(ctx.now()).toISOString(),
    openingBalance: input.openingBalance, cashIn: 0, cashOut: 0, pending: true,
  } satisfies RegisterState);
  return opId;
}

registerHooks('register.open', {
  async done(ctx, op, data) {
    const meta = op.meta as { shopId: string };
    const r = data as { id?: string; registerNumber?: string };
    const cur = await kvGet<RegisterState>(ctx.db, regKey(meta.shopId));
    if (cur && r?.id) await kvSet(ctx.db, regKey(meta.shopId), { ...cur, registerId: r.id, registerNumber: r.registerNumber ?? null, pending: false });
    if (r?.id && op.tempId) await mapTempId(ctx, op.tempId, r.id, 'register');
  },
  async discarded(ctx, op) {
    const meta = op.meta as { shopId: string };
    await ctx.db.run('DELETE FROM kv WHERE key = ?', [regKey(meta.shopId)]);
  },
});

/** Cash in or cash out of the drawer. */
export async function enqueueCashMove(ctx: Ctx, input: { shopId: string; type: 'CASH_IN' | 'CASH_OUT'; amount: number; reason: string; note?: string }): Promise<string> {
  if (!(input.amount > 0)) throw new OfflineRuleError('empty', ctx.t('Enter an amount.'));
  const cur = await registerState(ctx, input.shopId);
  if (!cur.open) throw new OfflineRuleError('not_found', ctx.t('Open the register first.'));
  const id = ctx.uuid();
  const opId = await enqueue(ctx, {
    id, kind: 'register.cash', method: 'POST', path: '/cash-register/transaction',
    // The register id is left out: the server uses the branch's open register (also one opened offline).
    body: { type: input.type, amount: input.amount, reason: input.reason, note: input.note, requestId: id },
    title: input.type === 'CASH_IN' ? ctx.t('Cash in: {{reason}}', { reason: input.reason }) : ctx.t('Cash out: {{reason}}', { reason: input.reason }),
    amount: input.amount, shopId: input.shopId, after: await openRegisterOps(ctx, input.shopId),
  });
  await kvSet(ctx.db, regKey(input.shopId), {
    ...cur, cashIn: cur.cashIn + (input.type === 'CASH_IN' ? input.amount : 0), cashOut: cur.cashOut + (input.type === 'CASH_OUT' ? input.amount : 0),
  });
  return opId;
}

export async function enqueueRegisterClose(ctx: Ctx, input: { shopId: string; closingBalance: number; notes?: string; denominations?: Record<string, number> }): Promise<string> {
  const cur = await registerState(ctx, input.shopId);
  if (!cur.open) throw new OfflineRuleError('not_found', ctx.t('The register is not open.'));
  const opId = await enqueue(ctx, {
    kind: 'register.close', method: 'POST', path: '/cash-register/close',
    body: { closingBalance: input.closingBalance, notes: input.notes, denominations: input.denominations, clientClosedAt: new Date(ctx.now()).toISOString() },
    title: ctx.t('Register closed'), amount: input.closingBalance, shopId: input.shopId,
    // Close after every bill and cash move of this phone, so the server counts them in this register.
    after: await pendingIds(ctx, ['register.open', 'register.cash', 'sale.create', 'sale.void', 'sale.return', 'khata.payment', 'expense.create', 'income.create'], input.shopId),
    meta: { shopId: input.shopId, before: cur },
  });
  await kvSet(ctx.db, regKey(input.shopId), { ...cur, open: false, pending: true });
  return opId;
}

registerHooks('register.close', {
  async done(ctx, op) {
    const meta = op.meta as { shopId: string };
    await ctx.db.run('DELETE FROM kv WHERE key = ?', [regKey(meta.shopId)]);
  },
  async discarded(ctx, op) {
    const meta = op.meta as { shopId: string; before: RegisterState };
    await kvSet(ctx.db, regKey(meta.shopId), meta.before);
  },
});

async function openRegisterOps(ctx: Ctx, shopId: string): Promise<string[]> {
  return pendingIds(ctx, ['register.open'], shopId);
}

async function pendingIds(ctx: Ctx, kinds: OpKind[], shopId: string): Promise<string[]> {
  const rows = await ctx.db.all<{ id: string }>(
    `SELECT id FROM outbox WHERE status IN ('pending', 'sending', 'issue') AND kind IN (${kinds.map(() => '?').join(',')}) AND (shopId = ? OR shopId IS NULL)`,
    [...kinds, shopId],
  );
  return rows.map((r) => r.id);
}

/* ═════════════ held bills ═════════════ */

export interface HeldBill<T = unknown> {
  id: string;
  label: string | null;
  shopId: string | null;
  data: T;
  createdAt: number;
}

export const heldBills = {
  async save<T>(ctx: Ctx, bill: { id?: string; label?: string; shopId?: string | null; data: T }): Promise<string> {
    const id = bill.id ?? ctx.uuid();
    await ctx.db.run('INSERT OR REPLACE INTO held_bills (id, label, shopId, data, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, bill.label ?? null, bill.shopId ?? null, JSON.stringify(bill.data), ctx.now()]);
    return id;
  },
  async list<T>(ctx: Ctx, shopId?: string | null): Promise<HeldBill<T>[]> {
    const rows = await ctx.db.all<{ id: string; label: string | null; shopId: string | null; data: string; createdAt: number }>(
      `SELECT * FROM held_bills ${shopId ? 'WHERE shopId = ? OR shopId IS NULL' : ''} ORDER BY createdAt DESC`, shopId ? [shopId] : []);
    return rows.map((r) => ({ ...r, data: JSON.parse(r.data) as T }));
  },
  async remove(ctx: Ctx, id: string): Promise<void> {
    await ctx.db.run('DELETE FROM held_bills WHERE id = ?', [id]);
  },
};

export { saleTotals };
