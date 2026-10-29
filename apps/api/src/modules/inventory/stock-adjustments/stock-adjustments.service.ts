/**
 * Stock adjustments: stock in or out by hand, damaged and lost goods, a
 * physical stock count, and several lines at once. Only adjustment types
 * are accepted; staff tied to a branch adjust only that branch; stock never
 * goes below zero unless the shop allows it. Every line records the cost
 * of what moved, so losses and write-offs show in rupees, and its profit
 * effect (reason-codes.ts): loss, gain, or none for a data correction.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { tzParts } from '../../../common/helpers/business-time.helper';
import {
  ShopScope, addToBatch, applyStockDelta, assertShopAccess, putIntoBatches, recacheProductStock, resolveWriteShopId,
} from '../../../common/shop-scope';
import { periodRange } from '../taxonomy/taxonomy.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { REASONS, classify, effectOfType, type ReasonCode } from './reason-codes';
import {
  BatchAdjustmentDto, CreateAdjustmentDto, ListAdjustmentsDto, StockCountDto, type AdjustmentType,
} from './dto/create-adjustment.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Types that add stock. */
const isIn = (t: string) => t === 'ADJUSTMENT_IN' || t === 'OPENING_BALANCE';
/** Opening stock adds stock but is neither a gain nor a loss. */
const isOpening = (t: string) => t === 'OPENING_BALANCE';
const DAY = 86_400_000;

/** Batch details a line may carry (expiry-tracked goods). */
interface LineBatch {
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
}

@Injectable()
export class StockAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async allowNegative(tenantId: string) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { allowNegativeStock: true } });
    return !!s?.allowNegativeStock;
  }

  private async branch(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const id = await resolveWriteShopId(this.prisma, user.tenantId, scope, shopId);
    assertShopAccess(user, id, 'Stock adjustment');
    return id;
  }

  /**
   * A phone whose stock follows its IMEIs changes only through an IMEI (damaged,
   * lost, found); a plain count would leave stock and the IMEI list apart.
   * Electronics serial units are not blocked: their write-off is a plain line,
   * and the unit's status is set on the serials page.
   */
  private async assertNotImeiDriven(db: Prisma.TransactionClient, tenantId: string, productId: string, name?: string) {
    const phone = await db.productImei.findFirst({ where: { tenantId, productId }, select: { id: true } });
    if (phone) {
      throw new BadRequestException(`${name ? `${name}: ` : ''}is phone ka stock IMEI se chalta hai — IMEI chun kar badlein (IMEI stock page)`);
    }
  }

  /** A data correction changes stock without touching profit; only people allowed to may do it. */
  private assertMayCorrect(user: AuthenticatedUser, code?: ReasonCode | null, correction?: boolean) {
    if ((code === 'CORRECTION' || correction) && !hasPermission(user.role, user.permissions, PERMISSIONS.STOCK_ADJUSTMENTS_CORRECT)) {
      throw new ForbiddenException('"Galti theek karna" sirf malik ya manager kar sakta hai (stock_adjustments.correct)');
    }
  }

  private ref() {
    return `ADJ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }

  /* ───────────────────────── single line ───────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateAdjustmentDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product nahi mila');
    this.assertMayCorrect(user, dto.reasonCode);
    const shopId = await this.branch(user, scope, dto.shopId);
    if (dto.carpetRollId) return this.adjustCarpetRoll(user, shopId, dto, product);
    if (dto.imeiId) return this.adjustImei(user, shopId, dto, product);
    const allowNegative = await this.allowNegative(user.tenantId);
    return this.prisma.$transaction((tx) => this.plainLine(tx, user, shopId, {
      productId: product.id, variantId: dto.variantId ?? null, type: dto.type, baseQty: dto.quantity,
      reason: dto.reason, reasonCode: dto.reasonCode, note: dto.note, ref: this.ref(), allowNegative,
      batch: { batchId: dto.batchId, batchNumber: dto.batchNumber, expiryDate: dto.expiryDate, manufactureDate: dto.manufactureDate },
    }));
  }

  /** One product or variant line, inside a transaction. */
  private async plainLine(tx: Prisma.TransactionClient, user: AuthenticatedUser, shopId: string, l: {
    productId: string; variantId: string | null; type: AdjustmentType; baseQty: number; reason: string; note?: string;
    ref: string; allowNegative: boolean; groupRef?: string; systemQty?: number; countedQty?: number; batch?: LineBatch;
    reasonCode?: ReasonCode | null;
    /** Overrides the profit effect (stock count: gain, loss or a correction). */
    effect?: 'LOSS' | 'GAIN' | 'NONE';
  }) {
    // The reason code fixes the stock type and the profit effect (reason-codes.ts).
    const cls = classify(l.type, l.reasonCode);
    if (isIn(cls.type) !== isIn(l.type)) {
      throw new BadRequestException(`"${cls.label}" se stock ${isIn(cls.type) ? 'barhta' : 'ghatta'} hai — sahi reason chunein`);
    }
    l = { ...l, type: cls.type, reason: l.reason?.trim() || cls.label || l.reason };
    const effect = l.effect ?? cls.effect;
    const product = await tx.product.findFirst({ where: { id: l.productId, tenantId: user.tenantId }, select: { id: true, name: true, costPrice: true, hasVariants: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    await this.assertNotImeiDriven(tx, user.tenantId, product.id, product.name);
    let cost = Number(product.costPrice) || 0;
    let label = product.name;
    if (l.variantId) {
      const v = await tx.productVariant.findFirst({ where: { id: l.variantId, productId: product.id }, select: { name: true, costPrice: true } });
      if (!v) throw new NotFoundException('Variant is product ka nahi');
      cost = Number(v.costPrice) || cost;
      label = `${product.name} (${v.name})`;
    }
    const delta = isIn(l.type) ? l.baseQty : -l.baseQty;
    const batch = l.batch?.batchId
      ? await tx.productBatch.findFirst({ where: { id: l.batch.batchId, tenantId: user.tenantId, shopId, productId: product.id, variantId: l.variantId } })
      : null;
    if (l.batch?.batchId && !batch) throw new NotFoundException('Batch is item ka nahi ya is shop me nahi');
    // Goods written off from a batch are valued at that batch's cost.
    if (batch && delta < 0 && Number(batch.costPrice) > 0) cost = Number(batch.costPrice);
    await applyStockDelta({
      tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: l.variantId, delta, movementType: l.type,
      reference: l.ref, note: `${l.reason}${l.note ? ` — ${l.note}` : ''}`, preventNegative: !l.allowNegative && delta < 0,
      label, userId: user.id, unitCost: cost, batchId: batch?.id ?? null,
    });
    // Stock in goes into the named batch, or a new/existing one by number and expiry.
    if (delta > 0 && batch) {
      await putIntoBatches(tx, [{ batchId: batch.id, quantity: delta }]);
    } else if (delta > 0 && l.batch?.batchNumber?.trim()) {
      await addToBatch(tx, {
        tenantId: user.tenantId, shopId, productId: product.id, variantId: l.variantId, batchNumber: l.batch.batchNumber,
        expiryDate: l.batch.expiryDate ? new Date(l.batch.expiryDate) : null,
        manufactureDate: l.batch.manufactureDate ? new Date(l.batch.manufactureDate) : null,
        costPrice: cost, quantity: delta, notes: l.reason,
      });
    }
    return tx.stockAdjustment.create({
      data: {
        tenantId: user.tenantId, shopId, productId: product.id, variantId: l.variantId, createdById: user.id, type: l.type,
        quantity: l.baseQty, reason: l.reason, note: l.note, unitCost: cost, value: r2(l.baseQty * cost),
        groupRef: l.groupRef ?? l.ref, systemQty: l.systemQty, countedQty: l.countedQty,
        reasonCode: l.reasonCode ?? null, profitEffect: effect,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        variant: { select: { id: true, name: true, color: true, colorHex: true, size: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  }

  /* ───────────────────────── many lines ───────────────────────── */

  /** Several products at once (e.g. a delivery that came short, a damaged carton). */
  async batch(user: AuthenticatedUser, scope: ShopScope, dto: BatchAdjustmentDto) {
    for (const it of dto.items) this.assertMayCorrect(user, it.reasonCode ?? dto.reasonCode);
    const shopId = await this.branch(user, scope, dto.shopId);
    const allowNegative = await this.allowNegative(user.tenantId);
    const groupRef = this.ref();
    return this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const it of dto.items) {
        const baseQty = r2(it.quantity * (it.conversionRate ?? 1)) || it.quantity * (it.conversionRate ?? 1);
        rows.push(await this.plainLine(tx, user, shopId, {
          productId: it.productId, variantId: it.variantId ?? null, type: it.type, baseQty,
          reason: it.reason?.trim() || dto.reason, reasonCode: it.reasonCode ?? dto.reasonCode,
          note: [it.unitName && (it.conversionRate ?? 1) !== 1 ? `${it.quantity} ${it.unitName}` : '', dto.note].filter(Boolean).join(' · ') || undefined,
          ref: groupRef, groupRef, allowNegative,
          batch: { batchId: it.batchId, batchNumber: it.batchNumber, expiryDate: it.expiryDate, manufactureDate: it.manufactureDate },
        }));
      }
      return { groupRef, count: rows.length, value: r2(rows.reduce((s, r) => s + r.value, 0)) };
    }, { timeout: 60_000 });
  }

  /**
   * Physical count: for each line, what the system shows in this branch
   * against what was counted; the difference is booked in or out.
   */
  async count(user: AuthenticatedUser, scope: ShopScope, dto: StockCountDto) {
    this.assertMayCorrect(user, null, dto.correction);
    const shopId = await this.branch(user, scope, dto.shopId);
    const groupRef = this.ref().replace('ADJ', 'CNT');
    return this.prisma.$transaction(async (tx) => {
      let up = 0; let down = 0; let value = 0; let lines = 0;
      for (const it of dto.items) {
        const row = await tx.shopStock.findFirst({ where: { shopId, productId: it.productId, variantId: it.variantId ?? null }, select: { stock: true } });
        const system = Number(row?.stock ?? 0);
        const diff = r2(it.counted - system);
        if (Math.abs(diff) < 0.0001) continue;
        const a = await this.plainLine(tx, user, shopId, {
          productId: it.productId, variantId: it.variantId ?? null, type: diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', baseQty: Math.abs(diff),
          reason: dto.reason?.trim() || (dto.correction ? REASONS.CORRECTION.label : 'Stock ginti'),
          note: dto.note ? `Gina ${it.counted}, system ${system} · ${dto.note}` : `Gina ${it.counted}, system ${system}`,
          ref: groupRef, groupRef, allowNegative: true, systemQty: system, countedQty: it.counted,
          // Counted extra is a gain, counted short a loss, at cost; a correction counts in neither.
          reasonCode: dto.correction ? 'CORRECTION' : null, effect: dto.correction ? 'NONE' : diff > 0 ? 'GAIN' : 'LOSS',
        });
        lines++;
        if (diff > 0) up += a.value; else down += a.value;
        value += diff > 0 ? a.value : -a.value;
      }
      return { groupRef, checked: dto.items.length, changed: lines, gained: r2(up), lost: r2(down), net: r2(value), correction: !!dto.correction };
    }, { timeout: 120_000 });
  }

  /* ───────────────────────── carpet roll ───────────────────────── */

  private async adjustCarpetRoll(user: AuthenticatedUser, fallbackShopId: string, dto: CreateAdjustmentDto, product: { id: string; costPrice: number }) {
    const roll = await this.prisma.carpetRoll.findFirst({ where: { id: dto.carpetRollId!, tenantId: user.tenantId, productId: product.id } });
    if (!roll) throw new NotFoundException('Carpet roll nahi mila');
    const shopId = roll.shopId ?? fallbackShopId;
    assertShopAccess(user, shopId, 'Stock adjustment');
    const action = dto.rollAction || 'ADJUST_LENGTH';
    if (action === 'MARK_DAMAGED' && roll.status === 'DAMAGED') throw new BadRequestException('Roll pehle hi kharab darj hai');
    if (action === 'MARK_LOST' && roll.status === 'FINISHED') throw new BadRequestException('Roll pehle hi khatam/gum darj hai');
    if (action === 'RESTORE' && roll.status === 'ACTIVE') throw new BadRequestException('Roll pehle hi chalu hai');
    const ref = this.ref();

    return this.prisma.$transaction(async (tx) => {
      let updated = roll;
      let change = 0;
      let note = '';
      if (action === 'MARK_DAMAGED') {
        change = -roll.remainingSqft;
        updated = await tx.carpetRoll.update({ where: { id: roll.id }, data: { status: 'DAMAGED' } });
        note = `Roll ${roll.rollNumber} kharab (${roll.remainingSqft.toFixed(2)} sqft)`;
      } else if (action === 'MARK_LOST') {
        change = -roll.remainingSqft;
        updated = await tx.carpetRoll.update({ where: { id: roll.id }, data: { status: 'FINISHED' } });
        note = `Roll ${roll.rollNumber} gum (${roll.remainingSqft.toFixed(2)} sqft)`;
      } else if (action === 'RESTORE') {
        change = roll.remainingSqft;
        updated = await tx.carpetRoll.update({ where: { id: roll.id }, data: { status: 'ACTIVE' } });
        note = `Roll ${roll.rollNumber} wapas chalu`;
      } else {
        const lengthFt = (dto.lengthFt ?? dto.quantity ?? 0) + (dto.lengthInch ?? 0) / 12;
        const changeFt = isIn(dto.type) ? lengthFt : -lengthFt;
        const remFt = roll.remainingLengthFt + roll.remainingLengthInch / 12 + changeFt;
        if (remFt < 0) throw new BadRequestException(`${lengthFt.toFixed(2)}ft nahi nikal sakte — roll me ${roll.remainingLengthFt}ft ${roll.remainingLengthInch}in baqi hai`);
        const width = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
        const sqft = remFt * width;
        change = sqft - roll.remainingSqft;
        const ft = Math.floor(remFt);
        updated = await tx.carpetRoll.update({
          where: { id: roll.id },
          data: { remainingLengthFt: ft, remainingLengthInch: Math.round((remFt - ft) * 1200) / 100, remainingSqft: sqft, status: sqft <= 0 ? 'FINISHED' : roll.status },
        });
        note = `Roll ${roll.rollNumber}: ${changeFt > 0 ? '+' : ''}${changeFt.toFixed(2)}ft (${change > 0 ? '+' : ''}${change.toFixed(2)} sqft)`;
      }
      const cost = Number(roll.costPerSqft) || Number(product.costPrice) || 0;
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId, shopId, productId: product.id, carpetRollId: roll.id, createdById: user.id, type: dto.type,
          quantity: Math.abs(change), reason: dto.reason, note: `[Roll: ${roll.rollNumber}] ${action}${dto.note ? ` — ${dto.note}` : ''}`,
          unitCost: cost, value: r2(Math.abs(change) * cost), groupRef: ref,
          reasonCode: dto.reasonCode ?? null, profitEffect: dto.reasonCode ? REASONS[dto.reasonCode].effect : effectOfType(dto.type),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          carpetRoll: { select: { id: true, rollNumber: true, status: true, remainingSqft: true, remainingLengthFt: true, remainingLengthInch: true, widthFt: true, widthInch: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });
      const width = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
      await tx.carpetRollMovement.create({
        data: {
          rollId: roll.id, tenantId: user.tenantId, type: dto.type === 'DAMAGE' ? 'DAMAGE' : 'ADJUSTMENT',
          lengthFt: width > 0 ? change / width : 0, sqft: change,
          balanceLengthAfter: updated.remainingLengthFt + updated.remainingLengthInch / 12, balanceSqftAfter: updated.remainingSqft,
          reference: ref, note, createdById: user.id,
        },
      });
      if (Math.abs(change) > 0.0001) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: null, delta: change, movementType: dto.type,
          reference: ref, note: `${note} — ${dto.reason}`, userId: user.id, unitCost: cost,
        });
      }
      return adjustment;
    });
  }

  /* ───────────────────────── IMEI ───────────────────────── */

  private async adjustImei(user: AuthenticatedUser, fallbackShopId: string, dto: CreateAdjustmentDto, product: { id: string; costPrice: number }) {
    const imei = await this.prisma.productImei.findFirst({ where: { id: dto.imeiId!, tenantId: user.tenantId, productId: product.id } });
    if (!imei) throw new NotFoundException('IMEI nahi mila');
    const shopId = imei.shopId ?? fallbackShopId;
    assertShopAccess(user, shopId, 'Stock adjustment');
    const ref = this.ref();

    return this.prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: it may have been sold a moment ago.
      const now = await tx.productImei.findUniqueOrThrow({ where: { id: imei.id } });
      if (now.status === 'SOLD') throw new BadRequestException(`IMEI ${now.imei1} bik chuka hai`);
      let status: 'IN_STOCK' | 'DAMAGED' | 'LOST' = now.status as 'IN_STOCK';
      let change = 0;
      if (dto.type === 'DAMAGE') { if (now.status === 'IN_STOCK') change = -1; status = 'DAMAGED'; }
      else if (dto.type === 'LOSS' || dto.type === 'ADJUSTMENT_OUT') { if (now.status === 'IN_STOCK') change = -1; status = 'LOST'; }
      else { if (now.status !== 'IN_STOCK') change = 1; status = 'IN_STOCK'; }

      await tx.productImei.update({ where: { id: imei.id }, data: { status } });
      const branchCount = await this.syncImeiShopStock(tx, user.tenantId, shopId, product.id, now.variantId);
      const cost = Number(now.costPrice) || Number(product.costPrice) || 0;
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId, shopId, productId: product.id, variantId: now.variantId, imeiId: imei.id, createdById: user.id, type: dto.type,
          quantity: 1, reason: dto.reason, note: `[IMEI: ${now.imei1}] ${now.status} → ${status}${dto.note ? ` — ${dto.note}` : ''}`,
          unitCost: cost, value: cost, groupRef: ref,
          reasonCode: dto.reasonCode ?? null, profitEffect: dto.reasonCode ? REASONS[dto.reasonCode].effect : effectOfType(dto.type),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          variant: { select: { id: true, name: true } },
          imei: { select: { id: true, imei1: true, imei2: true, status: true, color: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });
      if (change !== 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId, shopId, productId: product.id, variantId: now.variantId, type: dto.type, quantity: change,
            balanceAfter: branchCount, reference: ref, note: `IMEI ${now.imei1}: ${now.status} → ${status} — ${dto.reason}`,
            createdById: user.id, unitCost: cost,
          },
        });
      }
      return adjustment;
    });
  }

  /** Sets a branch's serialised stock to the live IMEI count; returns it. */
  private async syncImeiShopStock(tx: Prisma.TransactionClient, tenantId: string, shopId: string, productId: string, variantId: string | null) {
    const count = await tx.productImei.count({ where: { tenantId, productId, shopId, status: 'IN_STOCK', variantId } });
    const existing = await tx.shopStock.findFirst({ where: { shopId, productId, variantId }, select: { id: true } });
    if (existing) await tx.shopStock.update({ where: { id: existing.id }, data: { stock: count } });
    else await tx.shopStock.create({ data: { tenantId, shopId, productId, variantId, stock: count, isActive: true } });
    await recacheProductStock(tx, productId, variantId);
    return count;
  }

  /* ───────────────────────── reading ───────────────────────── */

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListAdjustmentsDto): Promise<Prisma.StockAdjustmentWhereInput> {
    const range = await periodRange(this.tz, user.tenantId, q.from, q.to);
    return {
      tenantId: user.tenantId, ...scope.where, createdAt: range,
      ...(q.type && q.type !== 'all' && { type: q.type as AdjustmentType }),
      ...(q.reason && { reason: { equals: q.reason, mode: 'insensitive' as const } }),
      ...(q.productId && { productId: q.productId }),
      ...(q.search?.trim() && {
        OR: [
          { product: { name: { contains: q.search.trim(), mode: 'insensitive' as const } } },
          { product: { sku: { contains: q.search.trim(), mode: 'insensitive' as const } } },
          { reason: { contains: q.search.trim(), mode: 'insensitive' as const } },
          { note: { contains: q.search.trim(), mode: 'insensitive' as const } },
        ],
      }),
    };
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: ListAdjustmentsDto = {}) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [items, total, byType, effects] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          variant: { select: { id: true, name: true, color: true, colorHex: true, size: true } },
          carpetRoll: { select: { id: true, rollNumber: true, status: true, remainingSqft: true, widthFt: true, widthInch: true } },
          imei: { select: { id: true, imei1: true, status: true, color: true } },
          createdBy: { select: { id: true, fullName: true } },
          shop: { select: { id: true, name: true, isMain: true } },
        },
      }),
      this.prisma.stockAdjustment.count({ where }),
      this.prisma.stockAdjustment.groupBy({ by: ['type'], where, _sum: { quantity: true, value: true }, _count: { _all: true } }),
      this.prisma.stockAdjustment.groupBy({ by: ['type', 'profitEffect'], where, _sum: { value: true } }),
    ]);
    // Profit effect: saved on the row, else by type (business-math.helper uses the same rule).
    const byEffect = { LOSS: 0, GAIN: 0, NONE: 0 };
    for (const g of effects) byEffect[g.profitEffect ?? effectOfType(g.type)] += Number(g._sum.value ?? 0);
    const t = (k: string) => byType.find((b) => b.type === k);
    const v = (k: string) => Number(t(k)?._sum.value ?? 0);
    return {
      items, total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        count: total,
        inValue: r2(v('ADJUSTMENT_IN')), outValue: r2(v('ADJUSTMENT_OUT')), damageValue: r2(v('DAMAGE')), lossValue: r2(v('LOSS')),
        openingValue: r2(v('OPENING_BALANCE')),
        // Opening stock is left out: it is not a gain or a loss.
        net: r2(v('ADJUSTMENT_IN') - v('ADJUSTMENT_OUT') - v('DAMAGE') - v('LOSS')),
        /** Stock nuksan / faida as they count in profit; corrections apart. */
        stockLoss: r2(byEffect.LOSS), stockGain: r2(byEffect.GAIN), correctionValue: r2(byEffect.NONE - v('OPENING_BALANCE')),
        profitNet: r2(byEffect.GAIN - byEffect.LOSS),
      },
    };
  }

  /** Where stock goes: by type, reason, product, person and day. */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListAdjustmentsDto = {}) {
    const where = await this.where(user, scope, { ...q, page: undefined, limit: undefined });
    const { tz } = await this.tz.clock(user.tenantId);
    const rows = await this.prisma.stockAdjustment.findMany({
      where,
      select: {
        type: true, quantity: true, value: true, reason: true, createdAt: true, productId: true, profitEffect: true,
        product: { select: { name: true, unit: true } }, createdBy: { select: { fullName: true } },
      },
    });
    const sign = (t: string) => (isIn(t) ? 1 : -1);
    const group = <K extends string>(key: (r: typeof rows[number]) => K) => {
      const m = new Map<K, { key: K; count: number; value: number; qty: number }>();
      for (const r of rows) {
        const k = key(r);
        const g = m.get(k) ?? { key: k, count: 0, value: 0, qty: 0 };
        g.count++; g.value += r.value * sign(r.type); g.qty += r.quantity * sign(r.type);
        m.set(k, g);
      }
      return [...m.values()].map((g) => ({ ...g, value: r2(g.value), qty: r2(g.qty) }));
    };
    const byDay = new Map<string, { key: string; in: number; out: number }>();
    for (const r of rows) {
      const p = tzParts(r.createdAt, tz);
      const k = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      const d = byDay.get(k) ?? { key: k, in: 0, out: 0 };
      if (isOpening(r.type)) continue;
      if (isIn(r.type)) d.in += r.value; else d.out += r.value;
      byDay.set(k, d);
    }
    const effectOf = (r: typeof rows[number]) => r.profitEffect ?? effectOfType(r.type);
    const losses = rows.filter((r) => effectOf(r) === 'LOSS');
    const products = new Map<string, { name: string; unit: string; qty: number; value: number; count: number }>();
    for (const r of losses) {
      const g = products.get(r.productId) ?? { name: r.product.name, unit: r.product.unit, qty: 0, value: 0, count: 0 };
      g.qty += r.quantity; g.value += r.value; g.count++;
      products.set(r.productId, g);
    }
    return {
      totals: {
        count: rows.length,
        gained: r2(rows.filter((r) => effectOf(r) === 'GAIN').reduce((s, r) => s + r.value, 0)),
        lost: r2(losses.reduce((s, r) => s + r.value, 0)),
        corrected: r2(rows.filter((r) => effectOf(r) === 'NONE' && !isOpening(r.type)).reduce((s, r) => s + r.value, 0)),
        opening: r2(rows.filter((r) => isOpening(r.type)).reduce((s, r) => s + r.value, 0)),
      },
      byType: group((r) => r.type),
      byReason: group((r) => r.reason || '—').sort((a, b) => a.value - b.value).slice(0, 10),
      byPerson: group((r) => r.createdBy?.fullName ?? '—').sort((a, b) => b.count - a.count).slice(0, 8),
      trend: [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ ...d, in: r2(d.in), out: r2(d.out) })),
      topLosses: [...products.values()].sort((a, b) => b.value - a.value).slice(0, 10).map((p) => ({ ...p, qty: r2(p.qty), value: r2(p.value) })),
      days: Math.round(((where.createdAt as { gte: Date; lt: Date }).lt.getTime() - (where.createdAt as { gte: Date; lt: Date }).gte.getTime()) / DAY),
    };
  }

  /** Reasons used before, most used first, for quick picking. */
  async reasons(user: AuthenticatedUser) {
    const rows = await this.prisma.stockAdjustment.groupBy({ by: ['reason'], where: { tenantId: user.tenantId }, _count: { _all: true }, orderBy: { _count: { reason: 'desc' } }, take: 12 });
    return rows.map((r) => r.reason);
  }

  /** Variants, rolls and IMEIs of a product, with this branch's stock. */
  async getAdjustmentOptions(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, name: true, unit: true, stock: true, sku: true, costPrice: true, hasVariants: true, lowStockAlert: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const [variants, carpetRolls, imeis, branch] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { productId, isActive: true },
        select: { id: true, name: true, sku: true, color: true, colorHex: true, size: true, stock: true, unit: true, imageUrl: true, costPrice: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.carpetRoll.findMany({
        where: { productId, tenantId: user.tenantId, status: { in: ['ACTIVE', 'DAMAGED', 'RESERVED'] }, ...(scope.shopId && { shopId: scope.shopId }) },
        select: {
          id: true, rollNumber: true, designCode: true, status: true, widthFt: true, widthInch: true,
          remainingLengthFt: true, remainingLengthInch: true, remainingSqft: true, originalSqft: true, salePricePerSqft: true, rackNumber: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productImei.findMany({
        where: { productId, tenantId: user.tenantId, status: { in: ['IN_STOCK', 'DAMAGED', 'RETURNED', 'LOST'] }, ...(scope.shopId && { shopId: scope.shopId }) },
        select: { id: true, imei1: true, imei2: true, status: true, color: true, costPrice: true, warrantyMonths: true, variant: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      scope.shopId ? this.prisma.shopStock.findMany({ where: { shopId: scope.shopId, productId }, select: { variantId: true, stock: true } }) : Promise.resolve([]),
    ]);
    const at = (v: string | null) => branch.find((b) => b.variantId === v)?.stock;
    return {
      product: { ...product, branchStock: scope.shopId ? Number(at(null) ?? 0) : null },
      variants: variants.map((v) => ({ ...v, branchStock: scope.shopId ? Number(at(v.id) ?? 0) : null })),
      carpetRolls, imeis,
    };
  }
}
