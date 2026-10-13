/**
 * Readers for every kind of risky event: voided bills, refunds, hand
 * discounts, sales below cost, PIN use, drawer differences, cash taken out,
 * stock written off, damage, transfers that arrived short, deleted expenses,
 * settings and team changes, and failed or new-device logins. Each reader
 * returns plain events with the reasons that make them stand out.
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditContext, AuditEvent, isAfterHours, num, r2, within } from './audit-context';
import type { AuditType, Severity } from './dto/audit.dto';

/** Most rows read per kind of event and period. */
export const CAP = 4000;

const LIVE = Prisma.sql`s.status::text <> 'VOIDED'`;
const LIMIT = Prisma.raw(`LIMIT ${CAP}`);

const PIN_ACTIONS = ['REFUND_PIN_APPROVED', 'PIN_VERIFY_FAILED', 'PIN_RESET_FAILED', 'PIN_RESET', 'PIN_SET', 'PIN_REMOVED', 'PAGE_LOCKS_UPDATED'];
const SETTINGS_ACTIONS = [
  'SETTINGS_UPDATED', 'SETTINGS_RESET', 'INTEGRATION_UPDATED', 'OWNERSHIP_TRANSFERRED', 'TENANT_DELETION_REQUESTED',
  'DATA_EXPORTED', 'SESSION_REVOKED',
];
const SETTINGS_ENTITIES = ['TeamMember', 'Shop'];
const HIGH_SETTINGS = new Set(['SETTINGS_RESET', 'OWNERSHIP_TRANSFERRED', 'TENANT_DELETION_REQUESTED', 'DATA_EXPORTED', 'PIN_REMOVED', 'FORCE_DELETE']);

const ACTION_LABEL: Record<string, string> = {
  REFUND_PIN_APPROVED: 'Wapsi PIN se manzoor',
  PIN_VERIFY_FAILED: 'Ghalat PIN dala',
  PIN_RESET_FAILED: 'PIN reset nakam',
  PIN_RESET: 'Malik ka PIN reset',
  PIN_SET: 'Malik ka PIN badla',
  PIN_REMOVED: 'Malik ka PIN hata diya',
  PAGE_LOCKS_UPDATED: 'Lock wale page badle',
  SETTINGS_UPDATED: 'Settings badli',
  SETTINGS_RESET: 'Settings reset',
  INTEGRATION_UPDATED: 'Integration badli',
  OWNERSHIP_TRANSFERRED: 'Malikana tabdeel',
  TENANT_DELETION_REQUESTED: 'Account band karne ki darkhwast',
  DATA_EXPORTED: 'Poora data download',
  SESSION_REVOKED: 'Login session band kiya',
  EXPENSE_DELETED: 'Kharcha mitaya',
};
const TEAM_LABEL: Record<string, string> = {
  CREATE: 'Naya team member', UPDATE: 'Team member badla', ACTIVATE: 'Team member chalu', DEACTIVATE: 'Team member band', DELETE: 'Team member hataya',
};
const SHOP_LABEL: Record<string, string> = { CREATE: 'Nayi branch', UPDATE: 'Branch badli', DELETE: 'Branch hatayi', FORCE_DELETE: 'Branch data samet hatayi' };

/** Severity from points: 0–1 low, 2–3 medium, 4+ high. */
const level = (points: number): Severity => (points >= 4 ? 'high' : points >= 2 ? 'medium' : 'low');

const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const ago = (ms: number) => (ms >= 86_400_000 ? `${Math.round(ms / 86_400_000)} din` : ms >= 3_600_000 ? `${Math.round(ms / 3_600_000)} ghante` : `${Math.max(1, Math.round(ms / 60_000))} minute`);

/** Narrows rows to the staff member, or to users of the branch for logs without a branch. */
function userFilter(c: AuditContext): string[] | null {
  if (c.staffId) return c.branchUsers && !c.branchUsers.includes(c.staffId) ? [] : [c.staffId];
  return c.branchUsers;
}

const saleWhere = (c: AuditContext, col: Prisma.Sql) => Prisma.sql`s."tenantId" = ${c.tenantId}
  ${c.gte ? Prisma.sql`AND ${col} >= ${c.gte}` : Prisma.empty} AND ${col} < ${c.lt}
  ${c.shopId ? Prisma.sql`AND s."shopId" = ${c.shopId}` : Prisma.empty}
  ${c.staffId ? Prisma.sql`AND COALESCE(s."soldById", s."createdById") = ${c.staffId}` : Prisma.empty}`;

/* ───────────────────────── bills ───────────────────────── */

async function voids(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const rows = await prisma.sale.findMany({
    where: {
      tenantId: c.tenantId, status: 'VOIDED', updatedAt: within(c),
      ...(c.shopId && { shopId: c.shopId }),
      ...(c.staffId && { OR: [{ soldById: c.staffId }, { soldById: null, createdById: c.staffId }] }),
    },
    select: { id: true, saleNumber: true, total: true, paidAmount: true, paymentMethod: true, soldAt: true, updatedAt: true, soldById: true, createdById: true, shopId: true, customerId: true },
    orderBy: { updatedAt: 'desc' },
    take: CAP,
  });
  if (!rows.length) return [];
  const notes = await prisma.stockMovement.findMany({
    where: { tenantId: c.tenantId, reference: { in: rows.map((r) => r.saleNumber) }, note: { startsWith: 'Voided' } },
    select: { reference: true, note: true },
    distinct: ['reference'],
  });
  const reason = new Map(notes.map((n) => [n.reference, (n.note ?? '').replace(/^Voided( carpet sale — manual roll adjustment needed)?:\s*/, '')]));
  // Newer voids are logged with who did it and when; older ones fall back to the seller and updatedAt.
  const logs = await prisma.activityLog.findMany({
    where: { tenantId: c.tenantId, action: 'SALE_VOIDED', entityId: { in: rows.map((r) => r.id) } },
    select: { entityId: true, userId: true, createdAt: true, metadata: true },
  });
  const logOf = new Map(logs.map((l) => [l.entityId, l]));
  return rows.map((s) => {
    const total = num(s.total);
    const log = logOf.get(s.id);
    const at = log?.createdAt ?? s.updatedAt;
    const late = at.getTime() - s.soldAt.getTime();
    const after = isAfterHours(c, at);
    const why = ((log?.metadata as { reason?: string | null } | null)?.reason ?? undefined) || reason.get(s.saleNumber);
    const flags: string[] = [];
    let pts = 1;
    if (total >= c.big) { flags.push(`Bari raqam (${money(total)})`); pts += 3; } else if (total >= c.big / 5) pts += 1;
    if (late > 3_600_000) { flags.push(`Bikri ke ${ago(late)} baad cancel`); pts += 1; }
    if (s.paymentMethod === 'CASH' && num(s.paidAmount) > 0) { flags.push('Cash bill tha'); pts += 1; }
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    if (!why || why === 'No reason') { flags.push('Wajah nahi likhi'); pts += 1; }
    return {
      id: `void:${s.id}`, type: 'void', at, userId: log?.userId ?? s.soldById ?? s.createdById, shopId: s.shopId,
      title: `Bill ${s.saleNumber} void`, detail: why && why !== 'No reason' ? why : null,
      amount: total, flags, severity: level(pts), afterHours: after,
      ref: { kind: 'sale', id: s.id, code: s.saleNumber },
    } satisfies AuditEvent;
  });
}

async function refunds(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const rows = await prisma.saleReturn.findMany({
    where: { tenantId: c.tenantId, returnedAt: within(c), ...(c.shopId && { shopId: c.shopId }), ...(c.staffId && { createdById: c.staffId }) },
    select: {
      id: true, returnNumber: true, refundAmount: true, refundMethod: true, reason: true, returnedAt: true, createdById: true, shopId: true,
      sale: { select: { id: true, saleNumber: true, soldAt: true, customerId: true, soldById: true, createdById: true } },
    },
    orderBy: { returnedAt: 'desc' },
    take: CAP,
  });
  if (!rows.length) return [];
  const approved = new Set((await prisma.activityLog.findMany({
    where: { tenantId: c.tenantId, action: 'REFUND_PIN_APPROVED', entityType: 'SaleReturn', entityId: { in: rows.map((r) => r.id) } },
    select: { entityId: true },
  })).map((a) => a.entityId));
  return rows.map((r) => {
    const amount = num(r.refundAmount);
    const cash = r.refundMethod === 'CASH';
    const walkIn = !r.sale.customerId;
    const age = r.returnedAt.getTime() - r.sale.soldAt.getTime();
    const own = r.createdById && (r.sale.soldById ?? r.sale.createdById) === r.createdById;
    const after = isAfterHours(c, r.returnedAt);
    const flags: string[] = [];
    let pts = 0;
    if (amount >= c.big) { flags.push(`Bari raqam (${money(amount)})`); pts += 3; } else if (amount >= c.big / 5) pts += 1;
    if (cash) flags.push('Cash wapas diya');
    if (cash && walkIn) { flags.push('Bina customer ka bill'); pts += 2; }
    if (age > 30 * 86_400_000) { flags.push(`${ago(age)} purana bill`); pts += 1; }
    if (own && cash) { flags.push('Apne hi bill ki cash wapsi'); pts += 1; }
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    if (!r.reason?.trim()) { flags.push('Wajah nahi likhi'); pts += 1; }
    if (approved.has(r.id)) { flags.push('Malik ke PIN se manzoor'); pts = Math.max(0, pts - 1); }
    return {
      id: `refund:${r.id}`, type: 'refund', at: r.returnedAt, userId: r.createdById, shopId: r.shopId,
      title: `Return ${r.returnNumber} · bill ${r.sale.saleNumber}`, detail: r.reason?.trim() || null,
      amount, flags, severity: level(pts), afterHours: after,
      ref: { kind: 'return', id: r.id, code: r.returnNumber },
    } satisfies AuditEvent;
  });
}

async function discounts(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string; saleNumber: string; subtotal: number; manual: number; total: number; soldAt: Date; uid: string | null; shopId: string | null; customerId: string | null;
  }>>`
    SELECT s.id, s."saleNumber", s.subtotal, (s.discount - s."codeDiscount" - s."loyaltyDiscount") AS manual, s.total, s."soldAt",
      COALESCE(s."soldById", s."createdById") AS uid, s."shopId", s."customerId"
    FROM "Sale" s
    WHERE ${saleWhere(c, Prisma.sql`s."soldAt"`)} AND ${LIVE} AND s.subtotal > 0
      AND (s.discount - s."codeDiscount" - s."loyaltyDiscount") >= GREATEST(s.subtotal * ${c.discountPct / 100}, 1)
    ORDER BY s."soldAt" DESC ${LIMIT}`;
  return rows.map((s) => {
    const off = num(s.manual);
    const pct = (off / num(s.subtotal)) * 100;
    const after = isAfterHours(c, s.soldAt);
    const flags = [`${pct.toFixed(0)}% chhoot`];
    let pts = pct >= Math.max(c.discountPct * 2, 40) ? 4 : pct >= c.discountPct * 1.5 ? 2 : 0;
    if (off >= c.big / 2) { flags.push(`Bari chhoot (${money(off)})`); pts += 3; } else if (off >= c.big / 5) pts += 1;
    if (pct > c.maxDiscountPct) { flags.push(`Had (${c.maxDiscountPct}%) se zyada — PIN se`); pts += 1; }
    if (!s.customerId) { flags.push('Bina customer ka bill'); pts += 1; }
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    return {
      id: `discount:${s.id}`, type: 'discount', at: s.soldAt, userId: s.uid, shopId: s.shopId,
      title: `Bill ${s.saleNumber} par haath ki discount`, detail: `${money(num(s.subtotal))} me se ${money(off)} kam`,
      amount: r2(off), flags, severity: level(pts), afterHours: after,
      ref: { kind: 'sale', id: s.id, code: s.saleNumber },
    } satisfies AuditEvent;
  });
}

async function belowCost(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  if (!c.showCost) return [];
  const rows = await prisma.$queryRaw<Array<{
    id: string; saleNumber: string; soldAt: Date; uid: string | null; shopId: string | null; lines: number; loss: number; value: number; names: string[] | null;
  }>>`
    SELECT s.id, s."saleNumber", s."soldAt", COALESCE(s."soldById", s."createdById") AS uid, s."shopId",
      COUNT(*)::int AS lines, SUM(si."costPrice" * si.quantity - si.total) AS loss, SUM(si.total) AS value,
      (array_agg(COALESCE(p.name, 'Cheez') ORDER BY si."costPrice" * si.quantity - si.total DESC))[1:3] AS names
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    LEFT JOIN "Product" p ON p.id = si."productId"
    WHERE ${saleWhere(c, Prisma.sql`s."soldAt"`)} AND ${LIVE}
      AND si."costPrice" > 0 AND si.quantity > 0 AND si.total < si."costPrice" * si.quantity - 0.5
    GROUP BY s.id
    ORDER BY loss DESC ${LIMIT}`;
  return rows.map((s) => {
    const loss = num(s.loss);
    const after = isAfterHours(c, s.soldAt);
    const pts = loss >= c.big / 2 ? 4 : loss >= c.big / 20 ? 2 : 0;
    const flags = [`${s.lines} cheez lagat se kam`];
    if (after) flags.push('Dukaan ke waqt ke baad');
    return {
      id: `below:${s.id}`, type: 'below_cost', at: s.soldAt, userId: s.uid, shopId: s.shopId,
      title: `Bill ${s.saleNumber}: cost se kam bechi`, detail: (s.names ?? []).join(', ') || null,
      amount: r2(num(s.value)), cost: r2(loss), flags, severity: level(pts + (after ? 1 : 0)), afterHours: after,
      ref: { kind: 'sale', id: s.id, code: s.saleNumber },
    } satisfies AuditEvent;
  });
}

/* ───────────────────────── money ───────────────────────── */

async function drawers(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const staff = c.staffId ? { OR: [{ closedById: c.staffId }, { closedById: null, openedById: c.staffId }] } : {};
  const [closed, stale] = await Promise.all([
    prisma.cashRegister.findMany({
      where: { tenantId: c.tenantId, status: 'CLOSED', closedAt: within(c), ...(c.shopId && { shopId: c.shopId }), OR: [{ difference: { lt: -0.5 } }, { difference: { gt: 0.5 } }], ...(c.staffId && { AND: [staff] }) },
      select: { id: true, registerNumber: true, difference: true, expectedBalance: true, closingBalance: true, closedAt: true, openedById: true, closedById: true, shopId: true, notes: true },
      orderBy: { closedAt: 'desc' },
      take: CAP,
    }),
    prisma.cashRegister.findMany({
      where: { tenantId: c.tenantId, status: 'OPEN', openedAt: { ...within(c), lt: new Date(Math.min(c.lt.getTime(), Date.now() - 86_400_000)) }, ...(c.shopId && { shopId: c.shopId }), ...(c.staffId && { openedById: c.staffId }) },
      select: { id: true, registerNumber: true, openedAt: true, openedById: true, shopId: true },
      take: 200,
    }),
  ]);
  const out: AuditEvent[] = closed.map((r) => {
    const diff = num(r.difference);
    const short = diff < 0;
    const size = Math.abs(diff);
    const at = r.closedAt ?? new Date();
    const after = isAfterHours(c, at);
    const big = Math.max(1000, c.big / 5);
    const pts = short ? (size >= big ? 4 : size >= 100 ? 2 : 1) : size >= big ? 2 : 0;
    const flags = [short ? `${money(size)} kam nikle` : `${money(size)} zyada nikle`];
    if (!short) flags.push('Zyada paisa — shayad koi bill nahi bana');
    if (!r.notes?.trim()) flags.push('Farq ki wajah nahi likhi');
    return {
      id: `drawer:${r.id}`, type: 'drawer', at, userId: r.closedById ?? r.openedById, shopId: r.shopId,
      title: `Drawer ${r.registerNumber} ${short ? 'kam' : 'zyada'}`, detail: `Hona chahiye ${money(num(r.expectedBalance))} · gine ${money(num(r.closingBalance))}${r.notes?.trim() ? ` · ${r.notes.trim()}` : ''}`,
      amount: r2(diff), flags, severity: level(pts + (!r.notes?.trim() && size >= 100 ? 1 : 0)), afterHours: after,
      ref: { kind: 'register', id: r.id, code: r.registerNumber },
    } satisfies AuditEvent;
  });
  for (const r of stale) {
    out.push({
      id: `drawer-open:${r.id}`, type: 'drawer', at: r.openedAt, userId: r.openedById, shopId: r.shopId,
      title: `Drawer ${r.registerNumber} band nahi hua`, detail: `${ago(Date.now() - r.openedAt.getTime())} se khula hai`,
      amount: 0, flags: ['24 ghante se zyada khula'], severity: 'low', afterHours: false,
      ref: { kind: 'register', id: r.id, code: r.registerNumber },
    });
  }
  return out;
}

async function cashOuts(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const rows = await prisma.cashTransaction.findMany({
    where: {
      tenantId: c.tenantId, type: 'CASH_OUT', createdAt: within(c),
      ...(c.shopId && { cashRegister: { shopId: c.shopId } }), ...(c.staffId && { createdById: c.staffId }),
    },
    select: { id: true, amount: true, reason: true, note: true, createdAt: true, createdById: true, cashRegister: { select: { id: true, registerNumber: true, shopId: true } } },
    orderBy: { createdAt: 'desc' },
    take: CAP,
  });
  return rows.map((t) => {
    const amount = num(t.amount);
    const after = isAfterHours(c, t.createdAt);
    const why = [t.reason, t.note].filter((x) => x?.trim()).join(' · ');
    const flags: string[] = [];
    let pts = 0;
    if (amount >= c.big) { flags.push(`Bari raqam (${money(amount)})`); pts += 4; } else if (amount >= c.big / 5) pts += 2;
    if (!why) { flags.push('Wajah nahi likhi'); pts += 2; }
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    return {
      id: `cashout:${t.id}`, type: 'cash_out', at: t.createdAt, userId: t.createdById, shopId: t.cashRegister.shopId,
      title: `Galle se ${money(amount)} nikale`, detail: why || null,
      amount, flags, severity: level(pts), afterHours: after,
      ref: { kind: 'register', id: t.cashRegister.id, code: t.cashRegister.registerNumber },
    } satisfies AuditEvent;
  });
}

/* ───────────────────────── stock ───────────────────────── */

async function stockLoss(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  // Approved damage reports also write an adjustment (groupRef = DMG-…); those are read from the damage log.
  const rows = await prisma.$queryRaw<Array<{
    g: string; lastAt: Date; uid: string | null; shopId: string | null; lines: number; counted: number; cost: number; types: string; reason: string | null; names: string[] | null;
  }>>`
    SELECT COALESCE(a."groupRef", a.id) AS g, MAX(a."createdAt") AS "lastAt", a."createdById" AS uid, a."shopId",
      COUNT(*)::int AS lines,
      SUM(CASE WHEN a."countedQty" IS NOT NULL THEN 1 ELSE 0 END)::int AS counted,
      SUM(ABS(a.value)) AS cost, string_agg(DISTINCT a.type::text, ',') AS types, MAX(a.reason) AS reason,
      (array_agg(p.name ORDER BY ABS(a.value) DESC))[1:3] AS names
    FROM "StockAdjustment" a
    LEFT JOIN "Product" p ON p.id = a."productId"
    WHERE a."tenantId" = ${c.tenantId} AND a.type::text IN ('ADJUSTMENT_OUT', 'LOSS', 'DAMAGE')
      AND (a."groupRef" IS NULL OR a."groupRef" NOT LIKE 'DMG-%')
      ${c.gte ? Prisma.sql`AND a."createdAt" >= ${c.gte}` : Prisma.empty} AND a."createdAt" < ${c.lt}
      ${c.shopId ? Prisma.sql`AND a."shopId" = ${c.shopId}` : Prisma.empty}
      ${c.staffId ? Prisma.sql`AND a."createdById" = ${c.staffId}` : Prisma.empty}
    GROUP BY 1, a."createdById", a."shopId"
    ORDER BY "lastAt" DESC ${LIMIT}`;
  return rows.map((a) => {
    const cost = num(a.cost);
    const after = isAfterHours(c, a.lastAt);
    const loss = a.types.split(',').includes('LOSS');
    const flags: string[] = [];
    let pts = cost >= c.big ? 4 : cost >= c.big / 5 ? 2 : 0;
    if (loss) { flags.push('Gum / chori likha'); pts += 1; }
    if (a.counted) flags.push(`Stock ginti me ${a.counted} cheez kam`);
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    const names = (a.names ?? []).filter(Boolean);
    return {
      id: `stock:${a.g}`, type: 'stock_loss', at: a.lastAt, userId: a.uid, shopId: a.shopId,
      title: a.counted ? `Stock ginti: ${a.lines} cheezein kam` : `Stock kam kiya: ${a.lines} cheez`,
      detail: [a.reason, names.join(', ')].filter(Boolean).join(' · ') || null,
      amount: 0, cost: r2(cost), flags, severity: level(pts), afterHours: after,
      ref: { kind: 'adjustment', id: null, code: a.g },
    } satisfies AuditEvent;
  });
}

async function damage(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const rows = await prisma.damageLog.findMany({
    where: {
      tenantId: c.tenantId, createdAt: within(c), ...(c.shopId && { shopId: c.shopId }),
      ...(c.staffId && { OR: [{ reportedById: c.staffId }, { approvedById: c.staffId }] }),
    },
    select: {
      id: true, damageNumber: true, quantity: true, netLoss: true, reason: true, reasonCode: true, status: true, createdAt: true,
      reportedById: true, approvedById: true, shopId: true, product: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: CAP,
  });
  return rows.map((d) => {
    const cost = num(d.netLoss);
    const after = isAfterHours(c, d.createdAt);
    const flags: string[] = [];
    let pts = cost >= c.big ? 4 : cost >= c.big / 5 ? 2 : 0;
    if (d.reasonCode === 'THEFT') { flags.push('Chori'); pts += 3; }
    if (d.approvedById && d.approvedById === d.reportedById && d.status !== 'REJECTED') { flags.push('Khud report, khud manzoor'); pts += 1; }
    if (d.status === 'REPORTED') flags.push('Manzoori baqi');
    if (d.status === 'REJECTED') { flags.push('Rad hui'); pts = Math.max(0, pts - 2); }
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    return {
      id: `damage:${d.id}`, type: 'damage', at: d.createdAt, userId: d.reportedById, shopId: d.shopId,
      title: `${d.damageNumber}: ${d.product.name} × ${Number(num(d.quantity).toFixed(2))}`, detail: d.reason || null,
      amount: 0, cost: r2(cost), flags, severity: level(pts), afterHours: after,
      ref: { kind: 'damage', id: d.id, code: d.damageNumber },
    } satisfies AuditEvent;
  });
}

async function transfersShort(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string; transferNumber: string; receivedAt: Date; uid: string | null; fromShopId: string; toShopId: string; lines: number; qty: number; cost: number;
  }>>`
    SELECT t.id, t."transferNumber", t."receivedAt", COALESCE(t."receivedById", t."createdById") AS uid, t."fromShopId", t."toShopId",
      COUNT(*)::int AS lines, SUM(i.quantity - i."receivedQty") AS qty, SUM((i.quantity - i."receivedQty") * i."unitCost") AS cost
    FROM "StockTransfer" t
    JOIN "StockTransferItem" i ON i."transferId" = t.id
    WHERE t."tenantId" = ${c.tenantId} AND t.status::text = 'RECEIVED' AND t."receivedAt" IS NOT NULL
      ${c.gte ? Prisma.sql`AND t."receivedAt" >= ${c.gte}` : Prisma.empty} AND t."receivedAt" < ${c.lt}
      AND i."receivedQty" < i.quantity - 0.0001
      ${c.shopId ? Prisma.sql`AND (t."toShopId" = ${c.shopId} OR t."fromShopId" = ${c.shopId})` : Prisma.empty}
      ${c.staffId ? Prisma.sql`AND (t."receivedById" = ${c.staffId} OR t."createdById" = ${c.staffId})` : Prisma.empty}
    GROUP BY t.id
    ORDER BY t."receivedAt" DESC ${LIMIT}`;
  return rows.map((t) => {
    const cost = num(t.cost);
    const after = isAfterHours(c, t.receivedAt);
    const pts = (cost >= c.big ? 4 : cost >= c.big / 5 ? 2 : 1) + (after ? 1 : 0);
    return {
      id: `transfer:${t.id}`, type: 'transfer_short', at: t.receivedAt, userId: t.uid, shopId: t.toShopId,
      title: `Transfer ${t.transferNumber} kam pohncha`, detail: `${t.lines} cheez · ${Number(num(t.qty).toFixed(2))} kam`,
      amount: 0, cost: r2(cost), flags: [`${Number(num(t.qty).toFixed(2))} raste me kam`, ...(after ? ['Dukaan ke waqt ke baad'] : [])],
      severity: level(pts), afterHours: after,
      ref: { kind: 'transfer', id: t.id, code: t.transferNumber },
    } satisfies AuditEvent;
  });
}

/* ───────────────────────── logs ───────────────────────── */

/** PIN, settings, team and branch changes: private when the owner made them. */
const SECURITY_LOG: Prisma.ActivityLogWhereInput = {
  OR: [{ action: { in: [...PIN_ACTIONS, ...SETTINGS_ACTIONS] } }, { entityType: { in: SETTINGS_ENTITIES } }],
};

async function activity(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const users = userFilter(c);
  if (users && !users.length) return [];
  const rows = await prisma.activityLog.findMany({
    where: {
      tenantId: c.tenantId, createdAt: within(c),
      OR: [{ action: { in: [...PIN_ACTIONS, ...SETTINGS_ACTIONS, 'EXPENSE_DELETED'] } }, { entityType: { in: SETTINGS_ENTITIES } }],
      ...(users && { userId: { in: users } }),
      ...(c.privateUsers?.length ? { NOT: { AND: [{ userId: { in: c.privateUsers } }, SECURITY_LOG] } } : {}),
    },
    select: { id: true, action: true, entityType: true, entityId: true, description: true, createdAt: true, userId: true, ipAddress: true },
    orderBy: { createdAt: 'desc' },
    take: CAP,
  });
  return rows.map((a) => {
    const after = isAfterHours(c, a.createdAt);
    const type: AuditType = PIN_ACTIONS.includes(a.action) ? 'pin' : a.action === 'EXPENSE_DELETED' ? 'expense_deleted' : 'settings';
    const label = a.entityType === 'TeamMember' ? TEAM_LABEL[a.action] : a.entityType === 'Shop' ? SHOP_LABEL[a.action] : ACTION_LABEL[a.action];
    let pts = HIGH_SETTINGS.has(a.action) ? 4 : 0;
    if (a.action === 'PIN_VERIFY_FAILED' || a.action === 'PIN_RESET_FAILED' || a.action === 'PIN_RESET' || a.action === 'PIN_SET') pts += 2;
    if (a.action === 'EXPENSE_DELETED') pts += 2;
    if (a.entityType === 'TeamMember' && a.action !== 'CREATE') pts += 2;
    if (after) pts += 1;
    return {
      id: `log:${a.id}`, type, at: a.createdAt, userId: a.userId, shopId: null,
      title: label ?? a.action, detail: a.description || null,
      amount: 0, flags: [...(after ? ['Dukaan ke waqt ke baad'] : []), ...(a.ipAddress ? [`IP ${a.ipAddress}`] : [])],
      severity: level(pts), afterHours: after,
      ref: { kind: type === 'pin' && a.entityType === 'SaleReturn' ? 'return' : type === 'expense_deleted' ? 'expense' : 'settings', id: a.entityId, code: null },
    } satisfies AuditEvent;
  });
}

async function logins(prisma: PrismaService, c: AuditContext): Promise<AuditEvent[]> {
  const users = userFilter(c);
  if (users && !users.length) return [];
  const rows = await prisma.loginHistory.findMany({
    where: {
      tenantId: c.tenantId, createdAt: within(c), OR: [{ success: false }, { isNewDevice: true }],
      AND: [users ? { userId: { in: users } } : {}, c.privateUsers?.length ? { userId: { notIn: c.privateUsers } } : {}],
    },
    select: { id: true, userId: true, email: true, success: true, failureReason: true, deviceName: true, location: true, ipAddress: true, isNewDevice: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: CAP,
  });
  return rows.map((l) => {
    const after = isAfterHours(c, l.createdAt);
    const where = [l.deviceName, l.location, l.ipAddress && `IP ${l.ipAddress}`].filter(Boolean).join(' · ');
    const flags: string[] = [];
    let pts = 0;
    if (!l.success) { flags.push(l.failureReason ? `Nakam: ${l.failureReason}` : 'Ghalat password'); pts += 1; }
    if (l.isNewDevice && l.success) { flags.push('Naya device'); pts += 2; }
    if (after) { flags.push('Dukaan ke waqt ke baad'); pts += 1; }
    return {
      id: `login:${l.id}`, type: 'login', at: l.createdAt, userId: l.userId, shopId: null,
      title: l.success ? 'Naye device se login' : 'Login nakam', detail: where || l.email,
      amount: 0, flags, severity: level(pts), afterHours: after,
      ref: { kind: 'login', id: l.id, code: null },
    } satisfies AuditEvent;
  });
}

const READERS: Record<string, (p: PrismaService, c: AuditContext) => Promise<AuditEvent[]>> = {
  void: voids, refund: refunds, discount: discounts, below_cost: belowCost, drawer: drawers, cash_out: cashOuts,
  stock_loss: stockLoss, damage, transfer_short: transfersShort, activity, login: logins,
};

/**
 * Every event of the period, newest first. A reader that fails (for example a
 * table whose migration has not run yet) is skipped and named in `failed`, so
 * the rest of the report still loads.
 */
export async function collectEvents(prisma: PrismaService, c: AuditContext) {
  const names = Object.keys(READERS);
  const results = await Promise.allSettled(names.map((n) => READERS[n](prisma, c)));
  const events: AuditEvent[] = [];
  const failed: string[] = [];
  let capped = false;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value.length >= CAP) capped = true;
      events.push(...r.value);
    } else failed.push(names[i]);
  });
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return { events, failed, capped };
}
