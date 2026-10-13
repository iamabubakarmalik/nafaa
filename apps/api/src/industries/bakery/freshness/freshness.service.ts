/**
 * Freshness batches (made goods with a best-before time) and the wastage
 * log. A batch is sold, sold cheap or thrown away; each move is a single
 * conditional update so two counters cannot take more than is left. The
 * wastage log joins thrown batches, failed baking and wasted raw materials
 * for a period of business days, valued at cost.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FreshnessStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { DAY_MS, positive, r2, r3, recipeOf, shopClock, syncBatchesWithStock, writeShopId } from '../bakery-common';

export type WasteSource = 'BATCH' | 'BAKING' | 'RAW' | 'DAMAGE';

export interface WasteRow {
  id: string;
  source: WasteSource;
  at: Date;
  name: string;
  productId: string | null;
  qty: number;
  unit: string;
  reason: string;
  cost: number;
  ref: string | null;
}

/** Marks a damage report filed from a thrown batch, so the wastage log does not count it twice. */
const BATCH_DAMAGE_NOTE = 'Bakery batch';

const LIVE: FreshnessStatus[] = ['FRESH', 'DAY_OLD', 'NEAR_EXPIRY', 'EXPIRED'];

@Injectable()
export class FreshnessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: Record<string, any>) {
    const product = await this.prisma.product.findFirst({ where: { id: String(dto?.productId ?? ''), tenantId: user.tenantId }, select: { id: true, name: true } });
    if (!product) throw new NotFoundException('Cheez maal me nahi mili');
    const qty = Math.round(positive(dto.initialQty, 'Kitne banaye — tadaad likhein'));
    const productionDate = dto.productionDate ? new Date(dto.productionDate) : new Date();
    const bestBefore = new Date(dto.bestBefore);
    if (Number.isNaN(productionDate.getTime()) || Number.isNaN(bestBefore.getTime())) throw new BadRequestException('Date theek nahi');
    if (bestBefore <= productionDate) throw new BadRequestException('"Kab tak theek" banane ke waqt ke baad hona chahiye');
    const expiry = dto.expiryDate ? new Date(dto.expiryDate) : null;
    return this.prisma.bakeryFreshnessLog.create({
      data: {
        tenantId: user.tenantId,
        shopId: await writeShopId(this.prisma, user.tenantId, scope, dto.shopId),
        productId: product.id,
        productName: typeof dto.productName === 'string' && dto.productName.trim() ? dto.productName.trim() : product.name,
        batchNumber: typeof dto.batchNumber === 'string' && dto.batchNumber.trim() ? dto.batchNumber.trim() : null,
        productionDate,
        bestBefore,
        expiryDate: expiry && !Number.isNaN(expiry.getTime()) ? expiry : null,
        initialQty: qty,
        currentQty: Math.min(Math.max(Math.round(Number(dto.currentQty ?? qty)), 0), qty),
      },
    });
  }

  async list(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; productId?: string; active?: string }) {
    const active = params.active === 'true';
    if (active) await syncBatchesWithStock(this.prisma, user.tenantId, scope.whereLoose);
    return this.prisma.bakeryFreshnessLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.whereLoose,
        ...(params.status && { status: params.status as FreshnessStatus }),
        ...(active && !params.status && { status: { in: LIVE }, currentQty: { gt: 0 } }),
        ...(params.productId && { productId: params.productId }),
      },
      orderBy: active ? { bestBefore: 'asc' } : { createdAt: 'desc' },
      take: active ? 500 : 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    return this.mustFind(user, id);
  }

  async recordSale(user: AuthenticatedUser, id: string, qty: number) {
    const n = Math.round(positive(qty, 'Kitne bike — tadaad likhein'));
    await this.mustFind(user, id);
    const done = await this.prisma.bakeryFreshnessLog.updateMany({
      where: { id, tenantId: user.tenantId, currentQty: { gte: n }, status: { not: 'DISCARDED' } },
      data: { soldQty: { increment: n }, currentQty: { decrement: n } },
    });
    if (!done.count) throw new BadRequestException('Itna maal baqi nahi');
    return this.mustFind(user, id);
  }

  /** Throws pieces away. The reason is added to the batch's list of reasons with the count. */
  async discard(user: AuthenticatedUser, id: string, qty: number, reason: string) {
    const n = Math.round(positive(qty, 'Kitne phenke — tadaad likhein'));
    const why = String(reason ?? '').trim() || 'Waqt guzar gaya';
    const log = await this.mustFind(user, id);
    if (log.currentQty < n) throw new BadRequestException(`Sirf ${log.currentQty} baqi hain`);
    const entry = `${n} — ${why}`;
    const done = await this.prisma.bakeryFreshnessLog.updateMany({
      where: { id, tenantId: user.tenantId, currentQty: log.currentQty },
      data: {
        wastedQty: { increment: n },
        currentQty: { decrement: n },
        status: log.currentQty - n <= 0 ? 'DISCARDED' : log.status,
        discardedAt: new Date(),
        discardReason: (log.discardReason ? `${log.discardReason} · ${entry}` : entry).slice(0, 1000),
      },
    });
    if (!done.count) throw new ConflictException('Batch abhi badla gaya — safha taaza kar ke dobara koshish karein');
    return this.mustFind(user, id);
  }

  async discount(user: AuthenticatedUser, id: string, qty: number) {
    const n = Math.round(positive(qty, 'Kitne sasta becha — tadaad likhein'));
    const log = await this.mustFind(user, id);
    if (log.discountedQty + n > log.initialQty) throw new BadRequestException('Bane hue se zyada nahi ho sakta');
    await this.prisma.bakeryFreshnessLog.updateMany({ where: { id, tenantId: user.tenantId }, data: { discountedQty: { increment: n } } });
    return this.mustFind(user, id);
  }

  /** Re-marks live batches by their best-before time. */
  async runExpiryCheck(user: AuthenticatedUser, scope: ShopScope) {
    await syncBatchesWithStock(this.prisma, user.tenantId, scope.whereLoose);
    const now = new Date();
    const soon = new Date(now.getTime() + DAY_MS);
    const base = { tenantId: user.tenantId, ...scope.whereLoose };
    const [expired, nearExpiry, dayOld, checked] = await this.prisma.$transaction([
      this.prisma.bakeryFreshnessLog.updateMany({ where: { ...base, status: { in: ['FRESH', 'DAY_OLD', 'NEAR_EXPIRY'] }, bestBefore: { lt: now } }, data: { status: 'EXPIRED' } }),
      this.prisma.bakeryFreshnessLog.updateMany({ where: { ...base, status: { in: ['FRESH', 'DAY_OLD'] }, bestBefore: { gte: now, lt: soon } }, data: { status: 'NEAR_EXPIRY' } }),
      this.prisma.bakeryFreshnessLog.updateMany({ where: { ...base, status: 'FRESH', bestBefore: { gte: soon }, productionDate: { lt: new Date(now.getTime() - DAY_MS) } }, data: { status: 'DAY_OLD' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { ...base, status: { in: ['FRESH', 'DAY_OLD', 'NEAR_EXPIRY', 'EXPIRED'] } } }),
    ]);
    return { checked, expired: expired.count, nearExpiry: nearExpiry.count, dayOld: dayOld.count };
  }

  async summary(user: AuthenticatedUser, scope: ShopScope) {
    await syncBatchesWithStock(this.prisma, user.tenantId, scope.whereLoose);
    const base = { tenantId: user.tenantId, ...scope.whereLoose };
    const today = (await shopClock(this.tz, user.tenantId)).today();
    const [fresh, dayOld, nearExpiry, expired, todayWaste] = await Promise.all([
      this.prisma.bakeryFreshnessLog.count({ where: { ...base, status: 'FRESH', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.count({ where: { ...base, status: 'DAY_OLD', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.count({ where: { ...base, status: 'NEAR_EXPIRY', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.count({ where: { ...base, status: 'EXPIRED', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.aggregate({ where: { ...base, discardedAt: { gte: today.gte, lt: today.lt } }, _sum: { wastedQty: true } }),
    ]);
    return { fresh, dayOld, nearExpiry, expired, todayWasteQty: todayWaste._sum.wastedQty ?? 0 };
  }

  /**
   * Everything thrown away in a period of business days (this month by
   * default): batches, pieces that failed in baking, wasted raw materials and
   * damage reports of made goods, each valued at cost.
   */
  async wastage(user: AuthenticatedUser, scope: ShopScope, from?: string, to?: string) {
    const clock = await shopClock(this.tz, user.tenantId);
    const todayKey = clock.keyOf(new Date());
    const range = clock.range(from, to) ?? clock.range(`${todayKey.slice(0, 7)}-01`, todayKey)!;
    const when = { gte: range.gte, lt: range.lt };
    const base = { tenantId: user.tenantId, ...scope.whereLoose };

    const [batches, failed, raw, damages, made, baked] = await Promise.all([
      this.prisma.bakeryFreshnessLog.findMany({
        where: { ...base, wastedQty: { gt: 0 }, discardedAt: when },
        select: { id: true, productId: true, productName: true, batchNumber: true, wastedQty: true, discardReason: true, discardedAt: true },
        take: 2000,
      }),
      this.prisma.bakeryProductionItem.findMany({
        where: { failedQty: { gt: 0 }, bakingEndTime: when, plan: base },
        select: { id: true, productId: true, productName: true, failedQty: true, qualityNotes: true, bakingEndTime: true, plan: { select: { planNumber: true } } },
        take: 2000,
      }),
      this.prisma.bakeryIngredientTransaction.findMany({
        where: { tenantId: user.tenantId, transactionType: 'WASTE', createdAt: when },
        select: { id: true, quantity: true, unit: true, totalCost: true, reason: true, createdAt: true, ingredient: { select: { name: true } } },
        take: 2000,
      }),
      this.prisma.damageLog.findMany({
        where: { tenantId: user.tenantId, ...scope.where, status: { in: ['REPORTED', 'APPROVED', 'WRITTEN_OFF'] }, createdAt: when, OR: [{ notes: null }, { NOT: { notes: { startsWith: BATCH_DAMAGE_NOTE } } }] },
        select: { id: true, productId: true, quantity: true, netLoss: true, reason: true, createdAt: true, damageNumber: true, status: true, product: { select: { name: true, unit: true } } },
        take: 2000,
      }),
      this.prisma.bakeryFreshnessLog.aggregate({ where: { ...base, productionDate: when }, _sum: { initialQty: true } }),
      this.prisma.bakeryProductionItem.aggregate({ where: { bakingEndTime: when, plan: base }, _sum: { producedQty: true, failedQty: true } }),
    ]);

    const productIds = [...new Set([...batches.map((b) => b.productId), ...failed.map((f) => f.productId).filter((x): x is string => !!x)])];
    const [products, profiles] = productIds.length
      ? await Promise.all([
        this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: productIds } }, select: { id: true, costPrice: true, unit: true } }),
        this.prisma.bakeryProductProfile.findMany({ where: { tenantId: user.tenantId, productId: { in: productIds } }, select: { productId: true, ingredients: true } }),
      ])
      : [[], []];
    const ingredientIds = [...new Set(profiles.flatMap((p) => recipeOf(p.ingredients)?.lines.map((l) => l.ingredientId) ?? []))];
    const rates = ingredientIds.length
      ? new Map((await this.prisma.bakeryIngredient.findMany({ where: { tenantId: user.tenantId, id: { in: ingredientIds } }, select: { id: true, costPerUnit: true } })).map((i) => [i.id, i.costPerUnit]))
      : new Map<string, number>();
    // Cost of one piece: the product's cost price, or its recipe at today's rates when no cost is set.
    const unitCost = new Map<string, number>();
    const unitOf = new Map<string, string>();
    for (const p of products) { unitCost.set(p.id, p.costPrice); unitOf.set(p.id, p.unit); }
    for (const pr of profiles) {
      const recipe = recipeOf(pr.ingredients);
      if (!recipe || (unitCost.get(pr.productId) ?? 0) > 0) continue;
      unitCost.set(pr.productId, recipe.lines.reduce((s, l) => s + l.qty * (rates.get(l.ingredientId) ?? l.costPerUnit), 0) / recipe.yieldQty);
    }

    const rows: WasteRow[] = [
      ...batches.map((b) => ({
        id: `b:${b.id}`, source: 'BATCH' as const, at: b.discardedAt!, name: b.productName, productId: b.productId, qty: b.wastedQty,
        unit: unitOf.get(b.productId) ?? 'pcs', reason: b.discardReason || 'Phenk diya', cost: r2(b.wastedQty * (unitCost.get(b.productId) ?? 0)), ref: b.batchNumber,
      })),
      ...failed.map((f) => ({
        id: `p:${f.id}`, source: 'BAKING' as const, at: f.bakingEndTime!, name: f.productName, productId: f.productId, qty: f.failedQty,
        unit: f.productId ? unitOf.get(f.productId) ?? 'pcs' : 'pcs', reason: f.qualityNotes || 'Banate waqt kharab', cost: r2(f.failedQty * (f.productId ? unitCost.get(f.productId) ?? 0 : 0)), ref: f.plan.planNumber,
      })),
      ...raw.map((t) => ({
        id: `r:${t.id}`, source: 'RAW' as const, at: t.createdAt, name: t.ingredient.name, productId: null, qty: r3(t.quantity),
        unit: t.unit, reason: t.reason || 'Zaya', cost: r2(Number(t.totalCost) || 0), ref: null,
      })),
      ...damages.map((d) => ({
        id: `d:${d.id}`, source: 'DAMAGE' as const, at: d.createdAt, name: d.product.name, productId: d.productId, qty: r3(d.quantity),
        unit: d.product.unit, reason: d.reason, cost: r2(d.netLoss), ref: d.damageNumber,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    const group = (key: (r: WasteRow) => string) => {
      const m = new Map<string, { key: string; count: number; qty: number; cost: number }>();
      for (const r of rows) {
        const k = key(r);
        const e = m.get(k) ?? { key: k, count: 0, qty: 0, cost: 0 };
        e.count += 1; e.qty = r3(e.qty + r.qty); e.cost = r2(e.cost + r.cost);
        m.set(k, e);
      }
      return [...m.values()].sort((a, b) => b.cost - a.cost || b.qty - a.qty);
    };
    const reasonKey = (r: WasteRow) => {
      // Batch reasons are stored as "count — reason · count — reason"; group by the latest reason.
      const last = r.reason.split(' · ').pop() ?? r.reason;
      return (last.includes(' — ') ? last.split(' — ').slice(1).join(' — ') : last).trim() || 'Bina wajah';
    };
    const madeQty = (Number(made._sum.initialQty) || 0) + (Number(baked._sum.producedQty) || 0) + (Number(baked._sum.failedQty) || 0);
    const wastedPieces = rows.filter((r) => r.source === 'BATCH' || r.source === 'BAKING').reduce((s, r) => s + r.qty, 0);

    return {
      period: { from: clock.keyOf(range.gte), to: clock.keyOf(new Date(range.lt.getTime() - 1)) },
      rows: rows.slice(0, 500),
      totals: {
        count: rows.length,
        cost: r2(rows.reduce((s, r) => s + r.cost, 0)),
        pieces: wastedPieces,
        made: madeQty,
        wastePct: madeQty > 0 ? Math.round((wastedPieces / madeQty) * 1000) / 10 : null,
      },
      bySource: group((r) => r.source),
      byReason: group(reasonKey).slice(0, 12),
      byItem: group((r) => r.name).slice(0, 15),
      byDay: group((r) => clock.keyOf(r.at)).sort((a, b) => a.key.localeCompare(b.key)),
    };
  }

  private async mustFind(user: AuthenticatedUser, id: string) {
    const log = await this.prisma.bakeryFreshnessLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!log) throw new NotFoundException('Batch nahi mila');
    return log;
  }
}
