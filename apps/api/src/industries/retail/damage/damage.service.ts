/**
 * Damage and wastage for every industry. Staff report damaged, expired or
 * spoilt goods; a manager approves or rejects. Approval books the stock-out
 * as a stock adjustment (DAMAGE, or LOSS for theft) with a stock movement in
 * one transaction, so it shows on the Adjustments page and in loss reports.
 * Quantities are stored in base units; cost is per base unit.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DamageReasonCode, DamageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, dateKeyTz } from '../../../common/helpers/business-time.helper';
import { ShopScope, applyStockDelta, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { periodRange } from '../../../modules/inventory/taxonomy/taxonomy.helper';
import { CreateDamageDto } from './dto/create-damage.dto';
import { ListDamageDto } from './dto/approve-damage.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;
const HOUR = 3_600_000;
/** Reports waiting longer than this are flagged as old. */
const AGING_HOURS = 48;

const LIST_INCLUDE = {
  product: {
    select: {
      id: true, name: true, sku: true, unit: true,
      category: { select: { id: true, name: true } },
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  },
  variant: { select: { id: true, name: true, color: true, colorHex: true, size: true } },
  batch: { select: { id: true, batchNumber: true, expiryDate: true } },
} satisfies Prisma.DamageLogInclude;

type DamageRow = Prisma.DamageLogGetPayload<{ include: typeof LIST_INCLUDE }>;

@Injectable()
export class DamageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── report ───────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateDamageDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
      select: { id: true, name: true, costPrice: true, hasVariants: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    assertShopAccess(user, shopId, 'Damage report');

    const [rolls, imeis, serials] = await Promise.all([
      this.prisma.carpetRoll.count({ where: { tenantId: user.tenantId, productId: product.id, status: 'ACTIVE' } }),
      this.prisma.productImei.count({ where: { tenantId: user.tenantId, productId: product.id, status: 'IN_STOCK' } }),
      this.serialTracked(user.tenantId, product.id),
    ]);
    // Each roll, phone or serial unit is counted on its own; Stock adjustments picks the exact one.
    if (rolls || imeis || serials) {
      throw new BadRequestException('Is product ka har piece alag ginta hai (roll, IMEI ya serial) — kharab maal Stock adjustments se likhein');
    }

    let cost = Number(product.costPrice) || 0;
    if (dto.variantId) {
      const v = await this.prisma.productVariant.findFirst({ where: { id: dto.variantId, productId: product.id }, select: { costPrice: true } });
      if (!v) throw new NotFoundException('Variant is product ka nahi');
      cost = Number(v.costPrice) || cost;
    } else if (product.hasVariants) {
      const count = await this.prisma.productVariant.count({ where: { productId: product.id, isActive: true } });
      if (count) throw new BadRequestException('Is product ke variants hain — type (variant) chunein');
    }

    let rate = 1;
    if (dto.unitId) {
      const unit = await this.prisma.productUnit.findFirst({
        where: { id: dto.unitId, tenantId: user.tenantId, productId: product.id, isActive: true },
        select: { conversionRate: true },
      });
      if (!unit) throw new NotFoundException('Unit is product ka nahi');
      rate = Number(unit.conversionRate) || 1;
    }

    if (dto.batchId) {
      const batch = await this.prisma.productBatch.findFirst({
        where: { id: dto.batchId, tenantId: user.tenantId, productId: product.id, shopId, variantId: dto.variantId ?? null },
        select: { costPrice: true },
      });
      if (!batch) throw new NotFoundException('Batch is item ka nahi ya is shop me nahi');
      cost = Number(batch.costPrice) || cost;
    }

    const quantity = r3(dto.quantity * rate);
    const unitCost = dto.unitCost ?? cost;
    const costImpact = r2(unitCost * quantity);
    const salvageValue = Math.min(dto.salvageValue ?? 0, costImpact);
    const netLoss = r2(Math.max(costImpact - salvageValue, 0));

    // Numbers are per tenant and unique; retry if two reports race for one.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const row = await this.prisma.damageLog.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            productId: product.id,
            variantId: dto.variantId,
            batchId: dto.batchId,
            unitId: dto.unitId,
            reportedById: user.id,
            damageNumber: await this.nextNumber(user.tenantId, attempt),
            quantity,
            unitCost,
            costImpact,
            salvageValue,
            netLoss,
            reason: dto.reason.trim(),
            reasonCode: dto.reasonCode ?? 'OTHER',
            photos: dto.photos ?? [],
            notes: dto.notes?.trim() || null,
            supplierClaim: dto.supplierClaim ?? false,
            claimAmount: dto.claimAmount ?? 0,
            status: 'REPORTED',
          },
          include: LIST_INCLUDE,
        });
        return (await this.decorate(user.tenantId, [row]))[0];
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new BadRequestException('Report number nahi bana — dobara koshish karein');
  }

  /** An electronics product sold by serial unit, or one with units on the shelf. */
  private async serialTracked(tenantId: string, productId: string) {
    const [profile, units] = await Promise.all([
      this.prisma.electronicsProductProfile.findFirst({ where: { tenantId, productId }, select: { requiresSerial: true, hasImei: true } }),
      this.prisma.electronicsSerialTracking.count({ where: { tenantId, productId, status: 'IN_STOCK' } }),
    ]);
    return !!(profile?.requiresSerial || profile?.hasImei || units > 0);
  }

  private async nextNumber(tenantId: string, bump: number) {
    // The shop's year, not the server's (UTC) one.
    const year = dateKeyTz(new Date()).slice(0, 4);
    const prefix = `DMG-${year}-`;
    const last = await this.prisma.damageLog.findFirst({
      where: { tenantId, damageNumber: { startsWith: prefix } },
      orderBy: { damageNumber: 'desc' },
      select: { damageNumber: true },
    });
    const n = Number(last?.damageNumber.slice(prefix.length)) || 0;
    return `${prefix}${String(n + 1 + bump).padStart(4, '0')}`;
  }

  /* ───────────────────────── decide ───────────────────────── */

  /**
   * Approve one report: claim it (so a second approve cannot run), take the
   * stock out of its branch and record the adjustment, all in one transaction.
   */
  async approve(user: AuthenticatedUser, scope: ShopScope, id: string, notes?: string) {
    const damage = await this.prisma.damageLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!damage) throw new NotFoundException('Damage report nahi mili');
    if (damage.status !== 'REPORTED') throw new BadRequestException('Is report ka faisla pehle hi ho chuka hai');
    const shopId = damage.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
    assertShopAccess(user, shopId, 'Damage manzoori');
    const allowNegative = !!(await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } }))?.allowNegativeStock;
    const product = await this.prisma.product.findUnique({ where: { id: damage.productId }, select: { name: true } });
    const type = damage.reasonCode === 'THEFT' ? 'LOSS' : 'DAMAGE';
    const note = notes?.trim();

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.damageLog.updateMany({
        where: { id, tenantId: user.tenantId, status: 'REPORTED' },
        data: {
          status: 'APPROVED', approvedById: user.id, approvedAt: new Date(), shopId,
          ...(note && { notes: `${damage.notes ? `${damage.notes}\n` : ''}[Manzoori] ${note}` }),
        },
      });
      if (!claimed.count) throw new BadRequestException('Is report ka faisla pehle hi ho chuka hai');

      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: damage.productId, variantId: damage.variantId, delta: -damage.quantity,
        movementType: type, reference: damage.damageNumber, note: damage.reason, preventNegative: !allowNegative,
        label: product?.name, userId: user.id, unitCost: damage.unitCost,
        // From the reported batch first, then the earliest expiry.
        batchId: damage.batchId,
      });
      await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId, shopId, productId: damage.productId, variantId: damage.variantId, createdById: user.id, type,
          quantity: damage.quantity, reason: damage.reason, note: `Damage report ${damage.damageNumber}${note ? ` — ${note}` : ''}`,
          unitCost: damage.unitCost, value: r2(damage.quantity * damage.unitCost), groupRef: damage.damageNumber,
        },
      });
      return tx.damageLog.findUniqueOrThrow({ where: { id }, include: LIST_INCLUDE });
    }).then(async (row) => (await this.decorate(user.tenantId, [row]))[0]);
  }

  /** Approve several; each in its own transaction, failures reported per report. */
  async approveMany(user: AuthenticatedUser, scope: ShopScope, ids: string[], notes?: string) {
    const failed: Array<{ id: string; message: string }> = [];
    let approved = 0;
    for (const id of [...new Set(ids)]) {
      try { await this.approve(user, scope, id, notes); approved++; } catch (e) {
        failed.push({ id, message: e instanceof Error ? e.message : 'Approve nahi hua' });
      }
    }
    return { approved, failed };
  }

  /** Reject: no stock moves. `approvedById` records who decided. */
  async reject(user: AuthenticatedUser, id: string, reason?: string) {
    const damage = await this.prisma.damageLog.findFirst({ where: { id, tenantId: user.tenantId }, select: { shopId: true, status: true } });
    if (!damage) throw new NotFoundException('Damage report nahi mili');
    if (damage.shopId) assertShopAccess(user, damage.shopId, 'Damage faisla');
    const done = await this.prisma.damageLog.updateMany({
      where: { id, tenantId: user.tenantId, status: 'REPORTED' },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason?.trim() || null, approvedById: user.id },
    });
    if (!done.count) throw new BadRequestException('Is report ka faisla pehle hi ho chuka hai');
    return this.decorate(user.tenantId, [await this.prisma.damageLog.findUniqueOrThrow({ where: { id }, include: LIST_INCLUDE })]).then((r) => r[0]);
  }

  /* ───────────────────────── reading ───────────────────────── */

  private async range(tenantId: string, from?: string, to?: string) {
    if (from && to && KEY.test(from) && KEY.test(to)) return periodRange(this.tz, tenantId, from, to);
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to) : undefined;
    const ok = (d?: Date) => d && !Number.isNaN(d.getTime());
    if (!ok(gte) && !ok(lte)) return undefined;
    return { ...(ok(gte) && { gte }), ...(ok(lte) && { lte }) };
  }

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListDamageDto, withStatus = true): Promise<Prisma.DamageLogWhereInput> {
    const createdAt = await this.range(user.tenantId, q.from, q.to);
    const s = q.search?.trim();
    return {
      tenantId: user.tenantId,
      ...(q.shopId ? { shopId: q.shopId } : scope.where),
      ...(createdAt && { createdAt }),
      ...(withStatus && q.status && { status: q.status }),
      ...(q.reasonCode && { reasonCode: q.reasonCode }),
      ...(q.productId && { productId: q.productId }),
      ...(s && {
        OR: [
          { product: { name: { contains: s, mode: 'insensitive' as const } } },
          { product: { sku: { contains: s, mode: 'insensitive' as const } } },
          { damageNumber: { contains: s, mode: 'insensitive' as const } },
          { reason: { contains: s, mode: 'insensitive' as const } },
        ],
      }),
    };
  }

  /** Adds reporter / decider names, branch and unit to each row. */
  private async decorate(tenantId: string, rows: DamageRow[]) {
    const userIds = [...new Set(rows.flatMap((r) => [r.reportedById, r.approvedById]).filter((x): x is string => !!x))];
    const shopIds = [...new Set(rows.map((r) => r.shopId).filter((x): x is string => !!x))];
    const unitIds = [...new Set(rows.map((r) => r.unitId).filter((x): x is string => !!x))];
    const [users, shops, units] = await Promise.all([
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds }, tenantId }, select: { id: true, fullName: true } }) : [],
      shopIds.length ? this.prisma.shop.findMany({ where: { id: { in: shopIds }, tenantId }, select: { id: true, name: true, isMain: true } }) : [],
      unitIds.length ? this.prisma.productUnit.findMany({ where: { id: { in: unitIds }, tenantId }, select: { id: true, unitName: true, conversionRate: true } }) : [],
    ]);
    const u = new Map(users.map((x) => [x.id, x]));
    const sh = new Map(shops.map((x) => [x.id, x]));
    const un = new Map(units.map((x) => [x.id, x]));
    return rows.map((r) => ({
      ...r,
      reportedBy: u.get(r.reportedById) ?? null,
      decidedBy: r.approvedById ? u.get(r.approvedById) ?? null : null,
      shop: r.shopId ? sh.get(r.shopId) ?? null : null,
      unit: r.unitId ? un.get(r.unitId) ?? null : null,
    }));
  }

  async findAll(user: AuthenticatedUser, scope: ShopScope, q: ListDamageDto = {}) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [rows, total, byStatus] = await Promise.all([
      this.prisma.damageLog.findMany({
        where, include: LIST_INCLUDE, skip: (page - 1) * limit, take: limit,
        orderBy: q.status === 'REPORTED' ? { createdAt: 'asc' } : { createdAt: 'desc' },
      }),
      this.prisma.damageLog.count({ where }),
      this.prisma.damageLog.groupBy({ by: ['status'], where: await this.where(user, scope, q, false), _count: { _all: true }, _sum: { netLoss: true, costImpact: true } }),
    ]);
    const st = (k: DamageStatus) => byStatus.find((b) => b.status === k);
    return {
      items: await this.decorate(user.tenantId, rows),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        reported: st('REPORTED')?._count._all ?? 0,
        approved: st('APPROVED')?._count._all ?? 0,
        rejected: st('REJECTED')?._count._all ?? 0,
        pendingValue: r2(Number(st('REPORTED')?._sum.costImpact ?? 0)),
        lost: r2(Number(st('APPROVED')?._sum.netLoss ?? 0) + Number(st('WRITTEN_OFF')?._sum.netLoss ?? 0)),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const damage = await this.prisma.damageLog.findFirst({ where: { id, tenantId: user.tenantId }, include: LIST_INCLUDE });
    if (!damage) throw new NotFoundException('Damage report nahi mili');
    return (await this.decorate(user.tenantId, [damage]))[0];
  }

  /** Approval queue for the active branch: how many wait, their value, how many are old. */
  async queue(user: AuthenticatedUser, scope: ShopScope) {
    const where = { tenantId: user.tenantId, ...scope.where, status: 'REPORTED' as const };
    const [agg, old, oldest] = await Promise.all([
      this.prisma.damageLog.aggregate({ where, _count: { _all: true }, _sum: { costImpact: true } }),
      this.prisma.damageLog.count({ where: { ...where, createdAt: { lt: new Date(Date.now() - AGING_HOURS * HOUR) } } }),
      this.prisma.damageLog.findFirst({ where, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);
    return { pending: agg._count._all, pendingValue: r2(Number(agg._sum.costImpact ?? 0)), aging: old, agingHours: AGING_HOURS, oldestAt: oldest?.createdAt ?? null };
  }

  /** Older summary shape, kept for existing callers. */
  async summary(user: AuthenticatedUser, scope: ShopScope, params: { from?: string; to?: string }) {
    const createdAt = await this.range(user.tenantId, params.from, params.to);
    const where = { tenantId: user.tenantId, ...scope.where, ...(createdAt && { createdAt }) };
    const [totalReported, totalApproved, byReason, totalLoss] = await Promise.all([
      this.prisma.damageLog.count({ where: { ...where, status: 'REPORTED' } }),
      this.prisma.damageLog.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.damageLog.groupBy({ by: ['reasonCode'], where, _sum: { netLoss: true, quantity: true }, _count: { _all: true } }),
      this.prisma.damageLog.aggregate({ where: { ...where, status: 'APPROVED' }, _sum: { netLoss: true, costImpact: true, salvageValue: true } }),
    ]);
    return {
      totalReported,
      totalApproved,
      totalNetLoss: totalLoss._sum.netLoss ?? 0,
      totalCostImpact: totalLoss._sum.costImpact ?? 0,
      totalSalvageValue: totalLoss._sum.salvageValue ?? 0,
      byReason,
    };
  }

  /**
   * Where the loss comes from in the period: by reason, product, category,
   * reporter and business day. Values are approved net loss; pending is
   * shown apart; rejected reports count nowhere.
   */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListDamageDto = {}) {
    const where = await this.where(user, scope, { ...q, status: undefined, page: undefined, limit: undefined }, false);
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const rows = await this.prisma.damageLog.findMany({
      where: { ...where, status: { not: 'REJECTED' } },
      select: {
        status: true, quantity: true, costImpact: true, netLoss: true, salvageValue: true, reason: true, reasonCode: true, createdAt: true,
        productId: true, reportedById: true,
        product: { select: { name: true, unit: true, category: { select: { name: true } } } },
      },
    });
    const rejected = await this.prisma.damageLog.count({ where: { ...where, status: 'REJECTED' } });
    const done = rows.filter((r) => r.status === 'APPROVED' || r.status === 'WRITTEN_OFF');
    const pending = rows.filter((r) => r.status === 'REPORTED');

    type Bucket = { key: string; label: string; count: number; qty: number; value: number; pending: number };
    const group = (key: (r: typeof rows[number]) => [string, string]) => {
      const m = new Map<string, Bucket>();
      for (const r of rows) {
        const [k, label] = key(r);
        const g = m.get(k) ?? { key: k, label, count: 0, qty: 0, value: 0, pending: 0 };
        g.count++;
        if (r.status === 'REPORTED') g.pending += r.costImpact;
        else { g.value += r.netLoss; g.qty += r.quantity; }
        m.set(k, g);
      }
      return [...m.values()]
        .map((g) => ({ ...g, value: r2(g.value), qty: r3(g.qty), pending: r2(g.pending) }))
        .sort((a, b) => b.value - a.value || b.pending - a.pending);
    };

    const names = new Map((await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.reportedById))] }, tenantId: user.tenantId }, select: { id: true, fullName: true },
    })).map((x) => [x.id, x.fullName]));

    const days = new Map<string, { key: string; approved: number; pending: number; count: number }>();
    for (const r of rows) {
      const k = businessDayKey(r.createdAt, tz, dayStartHour);
      const d = days.get(k) ?? { key: k, approved: 0, pending: 0, count: 0 };
      d.count++;
      if (r.status === 'REPORTED') d.pending += r.costImpact; else d.approved += r.netLoss;
      days.set(k, d);
    }

    const reasonKey = (r: typeof rows[number]): [string, string] =>
      r.reasonCode === DamageReasonCode.OTHER ? [`OTHER:${r.reason.trim().toLowerCase()}`, r.reason.trim()] : [r.reasonCode, r.reasonCode];

    return {
      totals: {
        count: rows.length,
        approved: done.length,
        pending: pending.length,
        rejected,
        lost: r2(done.reduce((s, r) => s + r.netLoss, 0)),
        costImpact: r2(done.reduce((s, r) => s + r.costImpact, 0)),
        salvage: r2(done.reduce((s, r) => s + r.salvageValue, 0)),
        pendingValue: r2(pending.reduce((s, r) => s + r.costImpact, 0)),
      },
      byReason: group(reasonKey).slice(0, 12),
      byProduct: group((r) => [r.productId, r.product.name]).slice(0, 10)
        .map((g) => ({ ...g, unit: rows.find((r) => r.productId === g.key)?.product.unit ?? '' })),
      byCategory: group((r) => [r.product.category?.name ?? '—', r.product.category?.name ?? 'Bina category']).slice(0, 10),
      byPerson: group((r) => [r.reportedById, names.get(r.reportedById) ?? '—']).slice(0, 10),
      trend: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ ...d, approved: r2(d.approved), pending: r2(d.pending) })),
    };
  }

  /**
   * What the report form needs for one product: variants and units, open
   * batches (nearest expiry first), stock in the active branch, and whether
   * the product is tracked by roll, IMEI or serial (those go through adjustments).
   */
  async options(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, name: true, unit: true, sku: true, stock: true, costPrice: true, hasVariants: true, expiryTracked: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const [variants, units, batches, branch, rolls, imeis, serials] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { productId, isActive: true },
        select: { id: true, name: true, color: true, colorHex: true, size: true, stock: true, costPrice: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.productUnit.findMany({
        where: { productId, tenantId: user.tenantId, isActive: true },
        select: { id: true, unitName: true, conversionRate: true, variantId: true, barcode: true },
        orderBy: [{ conversionRate: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.productBatch.findMany({
        where: { productId, tenantId: user.tenantId, isActive: true, quantity: { gt: 0 }, ...scope.where },
        select: { id: true, batchNumber: true, expiryDate: true, quantity: true, costPrice: true, variantId: true },
        orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        take: 50,
      }),
      scope.shopId ? this.prisma.shopStock.findMany({ where: { shopId: scope.shopId, productId }, select: { variantId: true, stock: true } }) : Promise.resolve([]),
      this.prisma.carpetRoll.count({ where: { tenantId: user.tenantId, productId, status: 'ACTIVE' } }),
      this.prisma.productImei.count({ where: { tenantId: user.tenantId, productId, status: 'IN_STOCK' } }),
      this.serialTracked(user.tenantId, productId),
    ]);
    const at = (v: string | null) => {
      if (!scope.shopId) return null;
      return Number(branch.find((b) => b.variantId === v)?.stock ?? 0);
    };
    return {
      product: { ...product, branchStock: at(null) },
      variants: variants.map((v) => ({ ...v, branchStock: at(v.id) })),
      units: units.filter((u) => Number(u.conversionRate) !== 1 || u.unitName.toLowerCase() !== (product.unit || '').toLowerCase()),
      batches,
      tracked: rolls > 0 ? 'roll' : imeis > 0 ? 'imei' : serials ? 'serial' : null,
    };
  }
}
