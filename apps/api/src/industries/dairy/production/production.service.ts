/**
 * Making dahi, butter, lassi or khoa from milk. One batch takes the milk out
 * of branch stock and puts what was made in, at the cost of the milk used
 * (split over the outputs by their sale value), so every kg of dahi sold
 * carries its real cost into the profit report.
 *
 * A batch is its stock movements: they share a `DPR-` reference, so no
 * table of its own is needed. Both moves are ADJUSTMENT movements without a
 * stock adjustment row: goods change form, nothing is written off. A wrong
 * batch is cancelled by the reverse moves under `<ref>-X`.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, applyStockDelta, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { dayKey, dayRange, milkProduct, r2, r3 } from '../dairy-common';
import { CreateProductionDto } from './dto/production.dto';

const PREFIX = 'DPR-';
const UNDO = '-X';

export interface Line { productId: string; name: string; unit: string; quantity: number; unitCost: number }
export interface ProductionBatch {
  reference: string;
  date: string;
  shopId: string | null;
  shopName: string | null;
  note: string | null;
  source: Line | null;
  outputs: Line[];
  /** Output quantity per unit of milk, in percent. */
  yieldPct: number | null;
  cost: number;
  cancelled: boolean;
}

@Injectable()
export class DairyProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateProductionDto) {
    const source = await milkProduct(this.prisma, user.tenantId, dto.sourceProductId);
    if (!source) throw new BadRequestException('Doodh ka product nahi mila — pehle Products me doodh banayein');
    if (source.hasVariants) throw new BadRequestException('Is product ki variants hain — variant wala maal yahan se nahi banta');
    const ids = dto.outputs.map((o) => o.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Ek cheez do dafa likhi hai');
    if (ids.includes(source.id)) throw new BadRequestException('Jo doodh lagaya wahi cheez dobara nahi ban sakti');
    const outputs = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: ids }, isActive: true },
      select: { id: true, name: true, unit: true, price: true, hasVariants: true },
    });
    if (outputs.length !== ids.length) throw new BadRequestException('Banne wali cheez nahi mili');
    if (outputs.some((o) => o.hasVariants)) throw new BadRequestException('Variant wala maal yahan se nahi banta');

    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    assertShopAccess(user, shopId, 'Maal banana');
    const used = r3(dto.sourceQty);
    const qtyOf = new Map(dto.outputs.map((o) => [o.productId, r3(o.quantity)]));

    const result = await this.prisma.$transaction(async (tx) => {
      const milk = await tx.product.findUniqueOrThrow({ where: { id: source.id }, select: { costPrice: true } });
      const branch = await tx.shopStock.findFirst({ where: { shopId, productId: source.id, variantId: null }, select: { stock: true } });
      const have = Number(branch?.stock ?? 0);
      const milkCost = Number(milk.costPrice) || 0;
      const total = r2(milkCost * used);
      const reference = `${PREFIX}${dayKey().replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const note = dto.notes?.trim() || null;

      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: source.id, delta: -used, movementType: 'ADJUSTMENT_OUT',
        reference, note: `Production: ${outputs.map((o) => o.name).join(', ')}${note ? ` — ${note}` : ''}`,
        userId: user.id, unitCost: milkCost, batchMode: 'cap',
      });

      // Cost goes to the outputs by sale value; by quantity when no price is set.
      const value = outputs.map((o) => ({ o, q: qtyOf.get(o.id)!, v: (Number(o.price) || 0) * qtyOf.get(o.id)! }));
      const byValue = value.every((x) => x.v > 0);
      const base = value.reduce((s, x) => s + (byValue ? x.v : x.q), 0);
      for (const { o, q, v } of value) {
        const share = base > 0 ? (byValue ? v : q) / base : 0;
        const unitCost = q > 0 ? r2((total * share) / q) : 0;
        const before = await tx.product.findUniqueOrThrow({ where: { id: o.id }, select: { stock: true, costPrice: true } });
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: o.id, delta: q, movementType: 'ADJUSTMENT_IN',
          reference, note: `Production: ${used} ${source.unit || 'liter'} ${source.name} se${note ? ` — ${note}` : ''}`,
          userId: user.id, unitCost,
        });
        if (unitCost > 0) {
          const oldQty = Math.max(Number(before.stock) || 0, 0);
          const oldCost = Number(before.costPrice) || 0;
          const avg = oldQty > 0 && oldCost > 0 ? r2((oldQty * oldCost + q * unitCost) / (oldQty + q)) : unitCost;
          await tx.product.update({ where: { id: o.id }, data: { costPrice: avg } });
        }
      }
      return { reference, short: have < used ? r3(used - have) : 0 };
    }, { timeout: 20_000 });

    const batch = await this.getOne(user, result.reference);
    return { ...batch, warnings: result.short > 0 ? [`Stock me ${result.short} ${source.unit || 'liter'} doodh kam tha — branch ka stock manfi ho gaya, collection entry check karein`] : [] };
  }

  private async movements(tenantId: string, where: { reference?: string; from?: string; to?: string; shopId?: string | null }) {
    const range = dayRange(where.from, where.to);
    return this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        type: { in: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] },
        reference: where.reference ? { in: [where.reference, where.reference + UNDO] } : { startsWith: PREFIX },
        ...(range && { createdAt: range }),
        ...(where.shopId && { shopId: where.shopId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 1500,
      select: { reference: true, type: true, quantity: true, unitCost: true, note: true, createdAt: true, shopId: true, productId: true, product: { select: { name: true, unit: true } }, shop: { select: { name: true } } },
    });
  }

  private group(rows: Awaited<ReturnType<DairyProductionService['movements']>>): ProductionBatch[] {
    const out = new Map<string, ProductionBatch>();
    const undone = new Set(rows.filter((r) => r.reference?.endsWith(UNDO)).map((r) => r.reference!.slice(0, -UNDO.length)));
    for (const m of rows) {
      const ref = m.reference!;
      if (ref.endsWith(UNDO)) continue;
      let b = out.get(ref);
      if (!b) {
        b = { reference: ref, date: m.createdAt.toISOString(), shopId: m.shopId, shopName: m.shop?.name ?? null, note: null, source: null, outputs: [], yieldPct: null, cost: 0, cancelled: undone.has(ref) };
        out.set(ref, b);
      }
      const line: Line = { productId: m.productId, name: m.product.name, unit: m.product.unit, quantity: r3(Math.abs(m.quantity)), unitCost: r2(m.unitCost ?? 0) };
      if (m.type === 'ADJUSTMENT_OUT') {
        b.source = line;
        b.cost = r2(line.quantity * line.unitCost);
        const extra = m.note?.split(' — ')[1];
        if (extra) b.note = extra;
      } else b.outputs.push(line);
    }
    for (const b of out.values()) {
      const made = b.outputs.reduce((s, o) => s + o.quantity, 0);
      b.yieldPct = b.source && b.source.quantity > 0 ? Math.round((made / b.source.quantity) * 1000) / 10 : null;
    }
    return [...out.values()];
  }

  async list(user: AuthenticatedUser, scope: ShopScope, params: { from?: string; to?: string }) {
    const batches = this.group(await this.movements(user.tenantId, { from: params.from, to: params.to, shopId: scope.shopId }));
    const live = batches.filter((b) => !b.cancelled);
    const milk = r3(live.reduce((s, b) => s + (b.source?.quantity ?? 0), 0));
    const byProduct = new Map<string, { name: string; unit: string; quantity: number }>();
    for (const b of live) for (const o of b.outputs) {
      const p = byProduct.get(o.productId) ?? { name: o.name, unit: o.unit, quantity: 0 };
      p.quantity = r3(p.quantity + o.quantity);
      byProduct.set(o.productId, p);
    }
    return {
      items: batches,
      totals: { batches: live.length, milkUsed: milk, cost: r2(live.reduce((s, b) => s + b.cost, 0)), made: [...byProduct.values()] },
    };
  }

  async getOne(user: AuthenticatedUser, reference: string) {
    const [batch] = this.group(await this.movements(user.tenantId, { reference }));
    if (!batch) throw new NotFoundException('Production entry nahi mili');
    return batch;
  }

  /** Puts the milk back and takes the made goods out again. */
  async cancel(user: AuthenticatedUser, reference: string, reason?: string) {
    const batch = await this.getOne(user, reference);
    if (batch.cancelled) return batch;
    if (!batch.shopId) throw new BadRequestException('Is entry ki branch nahi mili');
    assertShopAccess(user, batch.shopId, 'Production cancel');
    const why = reason?.trim() ? ` — ${reason.trim()}` : '';
    await this.prisma.$transaction(async (tx) => {
      const again = await tx.stockMovement.count({ where: { tenantId: user.tenantId, reference: reference + UNDO } });
      if (again) return;
      for (const o of batch.outputs) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: batch.shopId!, productId: o.productId, delta: -o.quantity, movementType: 'ADJUSTMENT_OUT',
          reference: reference + UNDO, note: `Production cancel${why}`, userId: user.id, unitCost: o.unitCost, batchMode: 'cap',
        });
      }
      if (batch.source) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: batch.shopId!, productId: batch.source.productId, delta: batch.source.quantity, movementType: 'ADJUSTMENT_IN',
          reference: reference + UNDO, note: `Production cancel${why}`, userId: user.id, unitCost: batch.source.unitCost,
        });
      }
    });
    return this.getOne(user, reference);
  }
}
