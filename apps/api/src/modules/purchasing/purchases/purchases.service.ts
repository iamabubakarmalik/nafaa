/**
 * Purchases: buying stock and raw materials from suppliers.
 *
 * - Any unit: a line can be in a product unit (carton = 24 pcs) or a
 *   purchase-only unit (bori = 50 kg); stock always moves in base units.
 * - Raw materials: bakery ingredients are bought on the same bill as
 *   products; other industries mark products as raw materials.
 * - Order then receive: a bill can be an order (nothing in stock yet) whose
 *   goods arrive in one go or in parts; the rest can be closed.
 * - Cost: each receipt updates the weighted average cost, with discount,
 *   freight and tax spread over the lines (landed cost).
 * - Returns and cancel take stock back out and settle with the supplier's
 *   khata. Every money change goes through the supplier ledger atomically.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, applyStockDelta, resolveWriteShopId } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { safeDayStart, startOfBusinessDayTz, tzParts, startOfBusinessMonthTz, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { SupplierLedgerService } from '../supplier-ledger/supplier-ledger.service';
import {
  CancelPurchaseDto, CreatePurchaseDto, CreatePurchaseItemDto, ListPurchasesDto, ReceivePurchaseDto, ReturnPurchaseDto,
} from './dto/create-purchase.dto';

type Tx = Prisma.TransactionClient;

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const DAY = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const ACTIVE = ['RECEIVED', 'PARTIAL'] as const;

interface Line {
  dto: CreatePurchaseItemDto;
  productId: string | null;
  variantId: string | null;
  ingredientId: string | null;
  itemName: string;
  unitId: string | null;
  unitName: string;
  rate: number;
  baseQuantity: number;
  total: number;
  isCarpet: boolean;
}

/** Base units and value of one line received now. */
interface Receipt {
  item: { id: string; productId: string | null; variantId: string | null; ingredientId: string | null; itemName: string };
  baseQty: number;
  baseCost: number;
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: SupplierLedgerService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── helpers ───────────────────────── */

  private async number(prefix: 'PO' | 'PR', tenantId: string, exists: (n: string) => Promise<boolean>) {
    const { tz } = await this.tz.clock(tenantId);
    const p = tzParts(new Date(), tz);
    const day = `${String(p.year).slice(2)}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
    for (let i = 0; i < 6; i++) {
      const n = `${prefix}-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      if (!(await exists(n))) return n;
    }
    return `${prefix}-${day}-${Date.now().toString(36).toUpperCase()}`;
  }

  /** Landed cost of one base unit of a line: its unit cost, plus its share of discount, freight and tax. */
  private baseCost(p: { subtotal: number; total: number }, line: { costPrice: number; conversionRate: number }) {
    const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
    return r4((line.costPrice / (line.conversionRate || 1)) * factor);
  }

  private async allowNegative(tenantId: string) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { allowNegativeStock: true } });
    return !!s?.allowNegativeStock;
  }

  /** Checks every line against the tenant's products, variants, units and raw materials. */
  private async resolveLines(tenantId: string, items: CreatePurchaseItemDto[]): Promise<Line[]> {
    for (const it of items) {
      if (!!it.productId === !!it.ingredientId) throw new BadRequestException('Har line me ya product ho ya raw material — dono nahi');
    }
    const ids = <K extends keyof CreatePurchaseItemDto>(k: K) => [...new Set(items.map((i) => i[k]).filter(Boolean) as string[])];
    const [products, variants, units, ingredients] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: ids('productId') } }, select: { id: true, name: true, unit: true } }),
      this.prisma.productVariant.findMany({ where: { id: { in: ids('variantId') }, product: { tenantId } }, select: { id: true, name: true, productId: true } }),
      this.prisma.productUnit.findMany({ where: { tenantId, id: { in: ids('unitId') } }, select: { id: true, productId: true, unitName: true, conversionRate: true } }),
      this.prisma.bakeryIngredient.findMany({ where: { tenantId, id: { in: ids('ingredientId') } }, select: { id: true, name: true, unit: true } }),
    ]);
    const P = new Map(products.map((x) => [x.id, x]));
    const V = new Map(variants.map((x) => [x.id, x]));
    const U = new Map(units.map((x) => [x.id, x]));
    const I = new Map(ingredients.map((x) => [x.id, x]));

    return items.map((dto) => {
      const product = dto.productId ? P.get(dto.productId) : null;
      const ingredient = dto.ingredientId ? I.get(dto.ingredientId) : null;
      if (dto.productId && !product) throw new NotFoundException('Ek product nahi mila');
      if (dto.ingredientId && !ingredient) throw new NotFoundException('Ek raw material nahi mila');
      const variant = dto.variantId ? V.get(dto.variantId) : null;
      if (dto.variantId && (!variant || variant.productId !== dto.productId)) throw new BadRequestException('Variant is product ka nahi');
      const unit = dto.unitId ? U.get(dto.unitId) : null;
      if (dto.unitId && (!unit || unit.productId !== dto.productId)) throw new BadRequestException('Unit is product ka nahi');

      const baseUnit = product?.unit ?? ingredient?.unit ?? 'pcs';
      const rate = unit ? Number(unit.conversionRate) || 1 : dto.conversionRate ?? 1;
      const unitName = unit?.unitName ?? (dto.unitName?.trim() || baseUnit);
      return {
        dto,
        productId: product?.id ?? null,
        variantId: variant?.id ?? null,
        ingredientId: ingredient?.id ?? null,
        itemName: product ? (variant ? `${product.name} (${variant.name})` : product.name) : ingredient!.name,
        unitId: unit?.id ?? null,
        unitName,
        rate,
        baseQuantity: r4(dto.quantity * rate),
        total: r2(dto.quantity * dto.costPrice),
        isCarpet: !!product && CARPET_UNITS.has(product.unit),
      };
    });
  }

  /** Puts received goods into stock and moves costs to the new weighted average. */
  private async stockIn(tx: Tx, user: AuthenticatedUser, ctx: { shopId: string; reference: string; supplierName: string }, rows: Receipt[], salePrices = new Map<string, number>()) {
    for (const { item, baseQty, baseCost } of rows) {
      if (baseQty <= 0) continue;
      if (item.ingredientId) {
        const ing = await tx.bakeryIngredient.findUniqueOrThrow({ where: { id: item.ingredientId }, select: { currentStock: true, costPerUnit: true, unit: true } });
        const old = Math.max(Number(ing.currentStock), 0);
        const avg = old > 0 ? (old * Number(ing.costPerUnit) + baseQty * baseCost) / (old + baseQty) : baseCost;
        await tx.bakeryIngredient.update({
          where: { id: item.ingredientId },
          data: {
            currentStock: { increment: baseQty }, totalPurchased: { increment: baseQty }, costPerUnit: r4(avg),
            lastPurchaseDate: new Date(), lastPurchasePrice: baseCost, lastVendorName: ctx.supplierName,
          },
        });
        await tx.bakeryIngredientTransaction.create({
          data: {
            tenantId: user.tenantId, ingredientId: item.ingredientId, transactionType: 'PURCHASE', quantity: baseQty, unit: ing.unit,
            costPerUnit: baseCost, totalCost: r2(baseQty * baseCost), performedById: user.id, notes: `${ctx.reference} · ${ctx.supplierName}`,
          },
        });
        continue;
      }
      if (!item.productId) continue;

      // Weighted average over stock in every branch.
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId }, select: { stock: true, costPrice: true } });
      const old = Math.max(Number(product.stock), 0);
      const avg = r4(old > 0 ? (old * Number(product.costPrice) + baseQty * baseCost) / (old + baseQty) : baseCost);
      const sale = salePrices.get(item.id);
      await tx.product.update({ where: { id: item.productId }, data: { costPrice: avg, ...(sale != null && !item.variantId && { price: sale }) } });
      if (item.variantId) {
        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId }, select: { stock: true, costPrice: true } });
        const vOld = Math.max(Number(v.stock), 0);
        const vAvg = r4(vOld > 0 ? (vOld * Number(v.costPrice) + baseQty * baseCost) / (vOld + baseQty) : baseCost);
        await tx.productVariant.update({ where: { id: item.variantId }, data: { costPrice: vAvg, ...(sale != null && { price: sale }) } });
      }
      // Pack units follow the base cost (a carton of 24 costs 24 pieces).
      const units = await tx.productUnit.findMany({ where: { productId: item.productId, variantId: item.variantId }, select: { id: true, conversionRate: true } });
      for (const u of units) await tx.productUnit.update({ where: { id: u.id }, data: { costPrice: r2(avg * (Number(u.conversionRate) || 1)) } });

      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId: ctx.shopId, productId: item.productId, variantId: item.variantId,
        delta: baseQty, movementType: 'PURCHASE_IN', reference: ctx.reference, note: `Purchase: ${ctx.supplierName}`,
      });
    }
  }

  /** Takes goods back out of stock (return or cancel). */
  private async stockOut(tx: Tx, user: AuthenticatedUser, ctx: { shopId: string; reference: string; note: string; allowNegative: boolean }, rows: Array<{ item: Receipt['item']; baseQty: number }>) {
    for (const { item, baseQty } of rows) {
      if (baseQty <= 0) continue;
      if (item.ingredientId) {
        const ok = await tx.bakeryIngredient.updateMany({
          where: { id: item.ingredientId, ...(!ctx.allowNegative && { currentStock: { gte: baseQty - 0.0001 } }) },
          data: { currentStock: { decrement: baseQty }, totalPurchased: { decrement: baseQty } },
        });
        if (!ok.count) throw new BadRequestException(`${item.itemName} itna stock me nahi — pehle istemal ho chuka`);
        await tx.bakeryIngredientTransaction.create({
          data: { tenantId: user.tenantId, ingredientId: item.ingredientId, transactionType: 'RETURN', quantity: -baseQty, unit: '', performedById: user.id, notes: `${ctx.reference} · ${ctx.note}` },
        });
        continue;
      }
      if (!item.productId) continue;
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId: ctx.shopId, productId: item.productId, variantId: item.variantId,
        delta: -baseQty, movementType: 'PURCHASE_RETURN', reference: ctx.reference, note: ctx.note,
        preventNegative: !ctx.allowNegative, label: item.itemName,
      });
    }
  }

  /* ───────────────────────── create ───────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreatePurchaseDto) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId: user.tenantId } });
    if (!supplier) throw new NotFoundException('Supplier nahi mila');

    const lines = await this.resolveLines(user.tenantId, dto.items);
    const receive = dto.receive !== false;
    const subtotal = r2(lines.reduce((s, l) => s + l.total, 0));
    const discount = dto.discount ?? 0;
    if (discount > subtotal) throw new BadRequestException('Discount bill se zyada nahi ho sakta');
    const otherCharges = dto.otherCharges ?? 0;
    const taxAmount = dto.taxAmount ?? 0;
    const total = r2(Math.max(subtotal - discount + otherCharges + taxAmount, 0));
    const paidAmount = receive ? r2(Math.min(Math.max(dto.paidAmount ?? total, 0), total)) : 0;
    if (receive && (dto.paidAmount ?? 0) > total + 0.01) throw new BadRequestException('Diya gaya paisa bill se zyada hai');

    const purchaseNumber = await this.number('PO', user.tenantId, async (n) =>
      !!(await this.prisma.purchase.findFirst({ where: { tenantId: user.tenantId, purchaseNumber: n }, select: { id: true } })));

    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          tenantId: user.tenantId, shopId, supplierId: supplier.id, createdById: user.id, purchaseNumber,
          subtotal, discount, otherCharges, taxAmount, total, paidAmount, paymentMethod: dto.paymentMethod,
          notes: dto.notes, supplierInvoiceNo: dto.supplierInvoiceNo || null,
          purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          status: receive ? 'RECEIVED' : 'PENDING',
          receivedValue: receive ? total : 0,
          receivedAt: receive ? new Date() : null,
          items: {
            create: lines.map((l) => ({
              productId: l.productId, variantId: l.variantId, ingredientId: l.ingredientId, itemName: l.itemName,
              unitId: l.unitId, unitName: l.unitName, conversionRate: l.rate,
              quantity: l.dto.quantity, costPrice: l.dto.costPrice, total: l.total, baseQuantity: l.baseQuantity,
              receivedQty: receive ? l.baseQuantity : 0,
              batchNo: l.dto.batchNo || null, expiryDate: l.dto.expiryDate ? new Date(l.dto.expiryDate) : null,
            })),
          },
        },
        include: { items: { orderBy: { createdAt: 'asc' } }, supplier: true },
      });

      if (!receive) return { ...purchase, createdRollsByItem: {} };

      const ctx = { shopId, reference: purchase.purchaseNumber, supplierName: supplier.name };
      const sale = new Map<string, number>();
      purchase.items.forEach((it, i) => { if (lines[i].dto.salePrice != null) sale.set(it.id, lines[i].dto.salePrice!); });
      await this.stockIn(tx, user, ctx, purchase.items.map((it) => ({ item: it, baseQty: it.baseQuantity, baseCost: this.baseCost(purchase, it) })), sale);

      await tx.supplier.update({ where: { id: supplier.id }, data: { totalPurchased: { increment: total } } });
      const credit = r2(total - paidAmount);
      if (credit > 0) {
        await this.ledger.post(user, supplier.id, 'PURCHASE_CREDIT', credit, { reference: purchase.purchaseNumber, note: 'Udhaar par maal liya', shopId }, tx);
      }

      const createdRollsByItem = await this.createRolls(tx, user, purchase, lines, shopId, supplier.name);
      return { ...purchase, createdRollsByItem };
    }, { timeout: 30_000 });
  }

  /** Carpet rolls for lines that carry them. */
  private async createRolls(tx: Tx, user: AuthenticatedUser, purchase: { id: string; purchaseNumber: string; items: Array<{ id: string; productId: string | null; costPrice: number }> }, lines: Line[], shopId: string, supplierName: string) {
    const out: Record<string, any[]> = {};
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const item = purchase.items[li];
      if (!line.isCarpet || !line.dto.rolls?.length || !item.productId) continue;
      const created: any[] = [];
      for (let i = 0; i < line.dto.rolls.length; i++) {
        const roll = line.dto.rolls[i];
        const widthFt = Number(roll.widthFt);
        const widthInch = Number(roll.widthInch ?? 0);
        const lengthFt = Number(roll.lengthFt);
        const sqft = Number(((widthFt + widthInch / 12) * lengthFt).toFixed(2));
        const rollNumber = roll.rollNumber?.trim() || `CR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${i + 1}`;
        const r = await tx.carpetRoll.create({
          data: {
            tenantId: user.tenantId, shopId, productId: item.productId, variantId: roll.variantId ?? null, rollNumber,
            designCode: roll.designCode ?? null, widthFt, widthInch, originalLengthFt: lengthFt, remainingLengthFt: lengthFt,
            originalSqft: sqft, remainingSqft: sqft, costPerSqft: Number(roll.costPerSqft ?? item.costPrice),
            salePricePerSqft: Number(roll.salePricePerSqft ?? 0),
            wholesalePricePerSqft: roll.wholesalePricePerSqft ? Number(roll.wholesalePricePerSqft) : null,
            status: 'ACTIVE', sourceType: 'PURCHASE', purchaseId: purchase.id, rackNumber: roll.rackNumber ?? null,
            quality: roll.quality ?? null, pile: roll.pile ?? null, notes: roll.notes ?? null, createdById: user.id,
          },
        });
        await tx.carpetRollMovement.create({
          data: {
            rollId: r.id, tenantId: user.tenantId, type: 'OPENING', lengthFt, sqft, balanceLengthAfter: lengthFt, balanceSqftAfter: sqft,
            reference: purchase.purchaseNumber, note: `Roll received from ${supplierName}`, createdById: user.id,
          },
        });
        created.push(r);
      }
      out[item.productId] = created;
    }
    return out;
  }

  /* ───────────────────────── order lifecycle ───────────────────────── */

  private async own(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const p = await this.prisma.purchase.findFirst({
      where: { id, tenantId: user.tenantId, ...scope.where },
      include: { items: true, supplier: { select: { id: true, name: true } } },
    });
    if (!p) throw new NotFoundException('Purchase nahi mili');
    if (!p.shopId) throw new BadRequestException('Is purchase par branch darj nahi');
    return p;
  }

  /** Goods of an order arrive (all or part); `close` ends the order with what came. */
  async receive(user: AuthenticatedUser, scope: ShopScope, id: string, dto: ReceivePurchaseDto) {
    const p = await this.own(user, scope, id);
    if (p.status !== 'PENDING' && p.status !== 'PARTIAL') throw new BadRequestException('Yeh order pehle hi mukammal ya cancel hai');
    const byId = new Map(p.items.map((i) => [i.id, i]));
    const rows: Receipt[] = [];
    for (const q of dto.items) {
      const item = byId.get(q.itemId);
      if (!item) throw new BadRequestException('Line is order ki nahi');
      const left = item.baseQuantity - item.receivedQty;
      const baseQty = r4(Math.min(q.quantity * item.conversionRate, left));
      if (baseQty > 0) rows.push({ item, baseQty, baseCost: this.baseCost(p, item) });
    }
    const value = r2(rows.reduce((s, r) => s + r.baseQty * r.baseCost, 0));
    if (value <= 0 && !dto.close) throw new BadRequestException('Kuch bhi nahi aaya — quantity likhein');
    const paid = r2(Math.min(Math.max(dto.paidAmount ?? 0, 0), value));

    return this.prisma.$transaction(async (tx) => {
      await this.stockIn(tx, user, { shopId: p.shopId!, reference: p.purchaseNumber, supplierName: p.supplier.name }, rows);
      for (const r of rows) await tx.purchaseItem.update({ where: { id: r.item.id }, data: { receivedQty: { increment: r.baseQty } } });
      const items = await tx.purchaseItem.findMany({ where: { purchaseId: p.id }, select: { baseQuantity: true, receivedQty: true } });
      const complete = items.every((i) => i.receivedQty >= i.baseQuantity - 0.0001);
      const receivedValue = r2(p.receivedValue + value);
      const done = complete || !!dto.close;
      await tx.purchase.update({
        where: { id: p.id },
        data: {
          receivedValue, paidAmount: { increment: paid }, receivedAt: new Date(),
          ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
          status: done ? 'RECEIVED' : 'PARTIAL',
          // A closed order is worth only what arrived.
          ...(done && !complete && { total: receivedValue }),
        },
      });
      if (value > 0) {
        await tx.supplier.update({ where: { id: p.supplierId }, data: { totalPurchased: { increment: value } } });
        const credit = r2(value - paid);
        if (credit > 0) await this.ledger.post(user, p.supplierId, 'PURCHASE_CREDIT', credit, { reference: p.purchaseNumber, note: 'Order ka maal aaya', shopId: p.shopId! }, tx);
      }
      return { received: value, status: done ? 'RECEIVED' : 'PARTIAL' };
    }, { timeout: 30_000 });
  }

  /** Sends goods back; the supplier's due goes down by their landed cost. */
  async returnGoods(user: AuthenticatedUser, scope: ShopScope, id: string, dto: ReturnPurchaseDto) {
    const p = await this.own(user, scope, id);
    if (p.status !== 'RECEIVED' && p.status !== 'PARTIAL') throw new BadRequestException('Sirf aaye hue maal ki return ho sakti hai');
    const byId = new Map(p.items.map((i) => [i.id, i]));
    const rows = dto.items.map((q) => {
      const item = byId.get(q.itemId);
      if (!item) throw new BadRequestException('Line is purchase ki nahi');
      const baseQty = r4(q.quantity * item.conversionRate);
      if (baseQty > item.receivedQty - item.returnedQty + 0.0001) throw new BadRequestException(`${item.itemName}: itna wapas nahi ho sakta`);
      return { item, baseQty, amount: r2(baseQty * this.baseCost(p, item)) };
    }).filter((r) => r.baseQty > 0);
    const total = r2(rows.reduce((s, r) => s + r.amount, 0));
    if (total <= 0) throw new BadRequestException('Kuch wapas nahi chuna');
    const allowNegative = await this.allowNegative(user.tenantId);
    const returnNumber = await this.number('PR', user.tenantId, async (n) =>
      !!(await this.prisma.purchaseReturn.findFirst({ where: { tenantId: user.tenantId, returnNumber: n }, select: { id: true } })));

    return this.prisma.$transaction(async (tx) => {
      await this.stockOut(tx, user, { shopId: p.shopId!, reference: returnNumber, note: `Wapas: ${p.supplier.name}`, allowNegative }, rows);
      const ret = await tx.purchaseReturn.create({
        data: {
          tenantId: user.tenantId, purchaseId: p.id, supplierId: p.supplierId, shopId: p.shopId, createdById: user.id,
          returnNumber, total, reason: dto.reason || null,
          items: { create: rows.map((r) => ({ purchaseItemId: r.item.id, quantity: r.baseQty, amount: r.amount })) },
        },
      });
      for (const r of rows) await tx.purchaseItem.update({ where: { id: r.item.id }, data: { returnedQty: { increment: r.baseQty } } });
      await tx.purchase.update({ where: { id: p.id }, data: { returnedAmount: { increment: total } } });
      await tx.supplier.update({ where: { id: p.supplierId }, data: { totalPurchased: { decrement: total } } });
      await this.ledger.post(user, p.supplierId, 'PURCHASE_RETURN', total, { reference: `${p.purchaseNumber} · ${returnNumber}`, note: dto.reason || 'Maal wapas kiya', shopId: p.shopId! }, tx);
      return ret;
    }, { timeout: 30_000 });
  }

  /**
   * Cancels an order, or a received bill with no returns: stock comes back
   * out and the supplier's khata is reversed (money already paid becomes
   * an amount the supplier owes back).
   */
  async cancel(user: AuthenticatedUser, scope: ShopScope, id: string, dto: CancelPurchaseDto) {
    const p = await this.own(user, scope, id);
    if (p.status === 'CANCELLED') throw new BadRequestException('Pehle hi cancel hai');
    if (p.returnedAmount > 0) throw new BadRequestException('Is bill ki return ho chuki — cancel ki jagah baqi maal wapas karein');
    const allowNegative = await this.allowNegative(user.tenantId);
    return this.prisma.$transaction(async (tx) => {
      const rows = p.items.map((item) => ({ item, baseQty: item.receivedQty }));
      await this.stockOut(tx, user, { shopId: p.shopId!, reference: p.purchaseNumber, note: `Cancel: ${dto.reason}`, allowNegative }, rows);
      await tx.purchaseItem.updateMany({ where: { purchaseId: p.id }, data: { receivedQty: 0 } });
      await tx.purchase.update({ where: { id: p.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: dto.reason } });
      if (p.receivedValue > 0) {
        await tx.supplier.update({ where: { id: p.supplierId }, data: { totalPurchased: { decrement: p.receivedValue } } });
        await this.ledger.post(user, p.supplierId, 'PURCHASE_RETURN', p.receivedValue, {
          reference: p.purchaseNumber,
          note: `Bill cancel: ${dto.reason}${p.paidAmount > 0 ? ` · ${r2(p.paidAmount)} diye the, supplier se wapas lene hain` : ''}`,
          shopId: p.shopId!,
        }, tx);
      }
      return { cancelled: true };
    }, { timeout: 30_000 });
  }

  /* ───────────────────────── reading ───────────────────────── */

  async findOne(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId: user.tenantId, ...scope.where },
      include: {
        supplier: true,
        shop: { select: { id: true, name: true, address: true, phone: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: { select: { id: true, name: true, sku: true, barcode: true, unit: true, price: true, stock: true, images: { take: 1, select: { url: true } } } },
            ingredient: { select: { id: true, name: true, unit: true, currentStock: true } },
          },
        },
        returns: { orderBy: { createdAt: 'desc' }, include: { items: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Purchase nahi mili');
    const rolls = await this.prisma.carpetRoll.findMany({
      where: { tenantId: user.tenantId, purchaseId: id },
      include: { product: { select: { id: true, name: true } }, variant: { select: { id: true, name: true, color: true, colorHex: true } } },
    });
    return { ...purchase, carpetRolls: rolls };
  }

  private async dayBound(tenantId: string, key: string, end: boolean) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const [y, m, d] = key.split('-').map(Number);
    const start = zonedToUtc(y, m, d, safeDayStart(dayStartHour), 0, 0, tz);
    return end ? new Date(start.getTime() + DAY) : start;
  }

  /** Bills with filters, a page at a time, and totals for the whole filter. */
  async list(user: AuthenticatedUser, scope: ShopScope, q: ListPurchasesDto) {
    const where: Prisma.PurchaseWhereInput = { tenantId: user.tenantId, ...scope.where };
    const key = /^\d{4}-\d{2}-\d{2}$/;
    if (q.from && q.to && key.test(q.from) && key.test(q.to)) {
      where.purchasedAt = { gte: await this.dayBound(user.tenantId, q.from, false), lt: await this.dayBound(user.tenantId, q.to, true) };
    }
    if (q.supplierId) where.supplierId = q.supplierId;
    if (q.status === 'credit') {
      // Bills not fully paid when received (two columns compared, so raw SQL).
      const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Purchase" WHERE "tenantId" = ${user.tenantId}
          AND "status" IN ('RECEIVED', 'PARTIAL') AND "receivedValue" - "paidAmount" > 0.01`;
      where.id = { in: ids.map((r) => r.id) };
    }
    else if (q.status === 'returned') where.returnedAmount = { gt: 0 };
    else if (q.status && q.status !== 'all') where.status = q.status as any;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { purchaseNumber: { contains: s, mode: 'insensitive' } },
        { supplierInvoiceNo: { contains: s, mode: 'insensitive' } },
        { supplier: { name: { contains: s, mode: 'insensitive' } } },
        { items: { some: { itemName: { contains: s, mode: 'insensitive' } } } },
      ];
    }
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [rows, count, agg] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        orderBy: { purchasedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true, isMain: true } },
          items: { select: { id: true, itemName: true, quantity: true, unitName: true, productId: true, ingredientId: true, baseQuantity: true, receivedQty: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.aggregate({ where: { ...where, status: where.status ?? { in: [...ACTIVE] } }, _sum: { receivedValue: true, paidAmount: true, returnedAmount: true } }),
    ]);
    return {
      items: rows,
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
      totals: {
        value: r2(Number(agg._sum.receivedValue ?? 0)),
        paid: r2(Number(agg._sum.paidAmount ?? 0)),
        returned: r2(Number(agg._sum.returnedAmount ?? 0)),
      },
    };
  }

  /** Older screens still read the plain list. */
  async findAll(user: AuthenticatedUser, scope: ShopScope) {
    return (await this.list(user, scope, { limit: 100 })).items;
  }

  async summary(user: AuthenticatedUser, scope: ShopScope) {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    const today = startOfBusinessDayTz(now, tz, dayStartHour);
    const yesterday = new Date(today.getTime() - DAY);
    const parts = tzParts(now, tz);
    const month = startOfBusinessMonthTz(parts.year, parts.month, tz, dayStartHour);
    const lastMonth = startOfBusinessMonthTz(parts.month === 1 ? parts.year - 1 : parts.year, parts.month === 1 ? 12 : parts.month - 1, tz, dayStartHour);
    const week = new Date(today.getTime() - 6 * DAY);
    const base = { tenantId, ...scope.where, status: { in: [...ACTIVE] } } as Prisma.PurchaseWhereInput;
    const sum = (w: Prisma.PurchaseWhereInput) => this.prisma.purchase.aggregate({ where: { ...base, ...w }, _sum: { receivedValue: true, paidAmount: true }, _count: { _all: true } });

    const [todayA, yA, monthA, lastA, allA, due, open, last7, methods, topSup, topItems, recent] = await Promise.all([
      sum({ purchasedAt: { gte: today } }),
      sum({ purchasedAt: { gte: yesterday, lt: today } }),
      sum({ purchasedAt: { gte: month } }),
      sum({ purchasedAt: { gte: lastMonth, lt: month } }),
      sum({}),
      this.prisma.supplier.aggregate({ where: { tenantId, outstandingDue: { gt: 0 } }, _sum: { outstandingDue: true }, _count: { _all: true } }),
      this.prisma.purchase.aggregate({ where: { tenantId, ...scope.where, status: { in: ['PENDING', 'PARTIAL'] } }, _sum: { total: true, receivedValue: true }, _count: { _all: true } }),
      this.prisma.purchase.findMany({ where: { ...base, purchasedAt: { gte: week } }, select: { purchasedAt: true, receivedValue: true } }),
      this.prisma.purchase.groupBy({ by: ['paymentMethod'], where: { ...base, purchasedAt: { gte: month } }, _sum: { paidAmount: true }, _count: { _all: true } }),
      this.prisma.purchase.groupBy({ by: ['supplierId'], where: base, _sum: { receivedValue: true }, _count: { _all: true }, orderBy: { _sum: { receivedValue: 'desc' } }, take: 5 }),
      this.prisma.purchaseItem.groupBy({
        by: ['itemName'], where: { purchase: { ...base, purchasedAt: { gte: month } } },
        _sum: { baseQuantity: true, total: true }, _count: { _all: true }, orderBy: { _sum: { total: 'desc' } }, take: 5,
      }),
      this.prisma.purchase.findMany({
        where: { tenantId, ...scope.where }, orderBy: { purchasedAt: 'desc' }, take: 5,
        include: { supplier: { select: { name: true } }, shop: { select: { id: true, name: true, isMain: true } } },
      }),
    ]);

    const trend = Array.from({ length: 7 }, (_, i) => {
      const from = new Date(week.getTime() + i * DAY);
      const to = new Date(from.getTime() + DAY);
      const rows = last7.filter((p) => p.purchasedAt >= from && p.purchasedAt < to);
      const p = tzParts(from, tz);
      return { date: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, total: r2(rows.reduce((s, r) => s + r.receivedValue, 0)), orders: rows.length };
    });
    const suppliers = await this.prisma.supplier.findMany({ where: { id: { in: topSup.map((s) => s.supplierId) } }, select: { id: true, name: true, phone: true, totalPurchased: true, outstandingDue: true } });
    const S = new Map(suppliers.map((s) => [s.id, s]));
    const v = (a: typeof todayA) => Number(a._sum.receivedValue ?? 0);
    const growth = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);

    return {
      todayPurchases: v(todayA), todayCount: todayA._count._all, todayPaid: Number(todayA._sum.paidAmount ?? 0),
      yesterdayPurchases: v(yA), growthVsYesterday: growth(v(todayA), v(yA)),
      monthPurchases: v(monthA), monthCount: monthA._count._all, monthPaid: Number(monthA._sum.paidAmount ?? 0),
      lastMonthPurchases: v(lastA), growthVsLastMonth: growth(v(monthA), v(lastA)),
      totalPurchases: v(allA), totalPaid: Number(allA._sum.paidAmount ?? 0), totalCount: allA._count._all,
      outstandingDue: Number(due._sum.outstandingDue ?? 0), suppliersWithDue: due._count._all,
      openOrders: open._count._all, openOrdersValue: r2(Number(open._sum.total ?? 0) - Number(open._sum.receivedValue ?? 0)),
      salesTrend7Days: trend,
      paymentBreakdown: methods.map((m) => ({ paymentMethod: m.paymentMethod, total: Number(m._sum.paidAmount ?? 0), count: m._count._all })),
      topSuppliers: topSup.map((s) => ({ supplierId: s.supplierId, supplier: S.get(s.supplierId), totalSpent: Number(s._sum.receivedValue ?? 0), orderCount: s._count._all })),
      topProducts: topItems.map((t) => ({ name: t.itemName, quantityPurchased: Number(t._sum.baseQuantity ?? 0), totalSpent: Number(t._sum.total ?? 0), orderCount: t._count._all })),
      recentPurchases: recent.map((p) => ({ id: p.id, purchaseNumber: p.purchaseNumber, total: p.receivedValue || p.total, status: p.status, supplierName: p.supplier?.name, shop: p.shop, purchasedAt: p.purchasedAt })),
    };
  }
}
