/**
 * Combos (bundles): several products sold together at one price. Every part
 * is checked against the tenant, its variant and pack unit against the
 * product. Lists carry live figures for the branch in view: how many can be
 * made from stock, cost, profit and margin. Analytics reads the sale lines
 * the POS writes for a combo (one line per part, noted with the combo name).
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { ShopScope } from '../../../common/shop-scope';
import { periodRange } from '../../../modules/inventory/taxonomy/taxonomy.helper';
import { assertCodeFree } from '../product-units/code-clash.helper';
import { ComboItemDto, ComboRangeDto, CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86_400_000;
const LIVE_SALES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;
/** Notes the POS screens put on each part of a sold combo. */
const COMBO_NOTES = ['Combo: ', 'Combo ka hissa: '];

const ITEM_INCLUDE = {
  product: {
    select: {
      id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, stock: true, isActive: true, hasVariants: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      category: { select: { id: true, name: true } },
    },
  },
  variant: { select: { id: true, name: true, price: true, costPrice: true, stock: true, isActive: true } },
  unit: { select: { id: true, unitName: true, unitLabel: true, conversionRate: true, price: true, costPrice: true, isActive: true } },
} satisfies Prisma.ProductComboItemInclude;

const COMBO_INCLUDE = {
  items: { include: ITEM_INCLUDE, orderBy: { sortOrder: 'asc' } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductComboInclude;

type ComboRow = Prisma.ProductComboGetPayload<{ include: typeof COMBO_INCLUDE }>;
type ItemRow = ComboRow['items'][number];

const stockKey = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ''}`;

@Injectable()
export class CombosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ─── Validation ─────────────────────────────────────────── */

  /**
   * Checks every part belongs to the tenant (and its variant and unit to the
   * product) and returns each part's normal price in its own unit.
   */
  private async resolveParts(tenantId: string, items: ComboItemDto[]) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const variantIds = [...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v))];
    const unitIds = [...new Set(items.map((i) => i.unitId).filter((v): v is string => !!v))];
    const [products, variants, units] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, price: true, unit: true } }),
      variantIds.length
        ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, product: { tenantId } }, select: { id: true, productId: true, price: true } })
        : Promise.resolve([]),
      unitIds.length
        ? this.prisma.productUnit.findMany({ where: { id: { in: unitIds }, tenantId }, select: { id: true, productId: true, variantId: true, price: true, unitName: true, conversionRate: true } })
        : Promise.resolve([]),
    ]);
    if (products.length !== productIds.length) throw new NotFoundException('Combo ka koi product nahi mila');
    const product = new Map(products.map((p) => [p.id, p]));
    const variant = new Map(variants.map((v) => [v.id, v]));
    const unit = new Map(units.map((u) => [u.id, u]));

    const seen = new Set<string>();
    return items.map((it, idx) => {
      const p = product.get(it.productId)!;
      const v = it.variantId ? variant.get(it.variantId) : undefined;
      const u = it.unitId ? unit.get(it.unitId) : undefined;
      if (it.variantId && (!v || v.productId !== p.id)) throw new BadRequestException(`"${p.name}" ki qism nahi mili`);
      if (it.unitId && (!u || u.productId !== p.id)) throw new BadRequestException(`"${p.name}" ka pack nahi mila`);
      const key = `${p.id}:${v?.id ?? ''}:${u?.id ?? ''}`;
      if (seen.has(key)) throw new BadRequestException(`"${p.name}" do dafa hai — ek hi line me miqdar barhayein`);
      seen.add(key);
      const rate = u ? Number(u.conversionRate) || 1 : 1;
      const base = v ? Number(v.price) : Number(p.price);
      const current = u && Number(u.price) > 0 ? Number(u.price) : base * rate;
      return {
        productId: p.id,
        variantId: v?.id ?? null,
        unitId: u?.id ?? null,
        quantity: it.quantity,
        unitName: u?.unitName ?? (it.unitName?.trim() || p.unit),
        originalPrice: it.originalPrice && it.originalPrice > 0 ? it.originalPrice : r2(current),
        sortOrder: idx,
      };
    });
  }

  private async checkCategory(tenantId: string, categoryId?: string | null) {
    if (!categoryId) return;
    const ok = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });
    if (!ok) throw new BadRequestException('Category nahi mili');
  }

  private async checkName(tenantId: string, name: string, exceptId?: string) {
    const dup = await this.prisma.productCombo.findFirst({
      where: { tenantId, name: { equals: name.trim(), mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (dup) throw new ConflictException(`"${name.trim()}" naam ka combo pehle se hai`);
  }

  private static checkDates(from?: Date | null, to?: Date | null) {
    if (from && to && to < from) throw new BadRequestException('Khatam hone ki tareekh shuru se pehle nahi ho sakti');
  }

  private static savings(parts: Array<{ quantity: number; originalPrice: number }>, comboPrice: number) {
    const originalTotal = r2(parts.reduce((s, p) => s + p.quantity * p.originalPrice, 0));
    const savingsAmount = r2(Math.max(originalTotal - comboPrice, 0));
    const savingsPercentage = originalTotal > 0 ? r2((savingsAmount / originalTotal) * 100) : 0;
    return { originalTotal, savingsAmount, savingsPercentage };
  }

  private static oneThing(parts: Array<{ quantity: number }>) {
    if (parts.length === 1 && parts[0].quantity <= 1) {
      throw new BadRequestException('Combo me kam az kam do cheezein, ya ek cheez ki ek se zyada miqdar honi chahiye');
    }
  }

  /* ─── Live figures ───────────────────────────────────────── */

  /** Stock of every part in the branch in view, or tenant-wide for "all shops". */
  private async partStock(tenantId: string, scope: ShopScope, items: ItemRow[]) {
    const out = new Map<string, number>();
    if (!items.length) return out;
    if (!scope.shopId) {
      for (const it of items) out.set(stockKey(it.productId, it.variantId), Number(it.variant?.stock ?? it.product.stock) || 0);
      return out;
    }
    const rows = await this.prisma.shopStock.findMany({
      where: { tenantId, shopId: scope.shopId, productId: { in: [...new Set(items.map((i) => i.productId))] } },
      select: { productId: true, variantId: true, stock: true },
    });
    const total = new Map<string, number>();
    for (const r of rows) {
      out.set(stockKey(r.productId, r.variantId), Number(r.stock) || 0);
      total.set(r.productId, (total.get(r.productId) ?? 0) + (Number(r.stock) || 0));
    }
    // A part without a variant on a product kept per variant: count all its variants.
    for (const it of items) {
      const k = stockKey(it.productId, it.variantId);
      if (!out.has(k)) out.set(k, it.variantId ? 0 : total.get(it.productId) ?? 0);
    }
    return out;
  }

  private static figures(c: ComboRow, stock: Map<string, number>) {
    const now = Date.now();
    let cost = 0;
    let available: number | null = null;
    let limitedBy: string | null = null;
    const items = c.items.map((it) => {
      const rate = it.unit ? Number(it.unit.conversionRate) || 1 : 1;
      const baseQuantity = r2(Number(it.quantity) * rate);
      const unitCost = Number(it.variant?.costPrice || it.product.costPrice) || 0;
      const partCost = r2(unitCost * baseQuantity);
      const have = stock.get(stockKey(it.productId, it.variantId)) ?? 0;
      const canMake = baseQuantity > 0 ? Math.max(0, Math.floor(have / baseQuantity + 1e-9)) : 0;
      cost += partCost;
      if (available === null || canMake < available) { available = canMake; limitedBy = it.product.name; }
      const inactive = !it.product.isActive || (it.variant && !it.variant.isActive) || (it.unit && !it.unit.isActive);
      return { ...it, baseQuantity, rate, stock: r2(have), canMake, cost: partCost, inactive: !!inactive };
    });
    if (c.stockAvailable !== null && c.stockAvailable !== undefined && (available === null || c.stockAvailable < available)) {
      available = c.stockAvailable;
      limitedBy = 'limit';
    }
    const price = Number(c.comboPrice) || 0;
    const profit = r2(price - cost);
    const expired = !!c.validTo && c.validTo.getTime() < now;
    const upcoming = !!c.validFrom && c.validFrom.getTime() > now;
    const partsTotal = r2(c.items.reduce((s, it) => {
      const rate = it.unit ? Number(it.unit.conversionRate) || 1 : 1;
      const base = Number(it.variant?.price ?? it.product.price) || 0;
      const unitPrice = it.unit && Number(it.unit.price) > 0 ? Number(it.unit.price) : base * rate;
      return s + Number(it.quantity) * unitPrice;
    }, 0));
    return {
      ...c,
      items,
      cost: r2(cost),
      profit,
      margin: price > 0 ? r2((profit / price) * 100) : 0,
      available: available ?? 0,
      limitedBy,
      partsTotal,
      expired,
      upcoming,
      sellable: c.status === 'ACTIVE' && !expired && !upcoming && items.every((i) => !i.inactive),
    };
  }

  private async withFigures(user: AuthenticatedUser, scope: ShopScope, combos: ComboRow[]) {
    const stock = await this.partStock(user.tenantId, scope, combos.flatMap((c) => c.items));
    return combos.map((c) => CombosService.figures(c, stock));
  }

  /* ─── CRUD ───────────────────────────────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateComboDto) {
    const tenantId = user.tenantId;
    await this.checkName(tenantId, dto.name);
    await this.checkCategory(tenantId, dto.categoryId);
    await assertCodeFree(this.prisma, tenantId, dto.barcode);
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    CombosService.checkDates(validFrom, validTo);
    const parts = await this.resolveParts(tenantId, dto.items);
    CombosService.oneThing(parts);

    const combo = await this.prisma.productCombo.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug ?? null,
        sku: dto.sku ?? null,
        barcode: dto.barcode ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        categoryId: dto.categoryId ?? null,
        comboPrice: dto.comboPrice,
        ...CombosService.savings(parts, dto.comboPrice),
        status: dto.status ?? 'ACTIVE',
        validFrom,
        validTo,
        maxPurchasePerCustomer: dto.maxPurchasePerCustomer ?? null,
        stockAvailable: dto.stockAvailable ?? null,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        tagLine: dto.tagLine ?? null,
        items: { create: parts },
      },
      include: COMBO_INCLUDE,
    });
    return (await this.withFigures(user, scope, [combo]))[0];
  }

  async findAll(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; featured?: boolean; search?: string }) {
    const search = params.search?.trim();
    const combos = await this.prisma.productCombo.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && ['ACTIVE', 'INACTIVE', 'EXPIRED', 'DRAFT'].includes(params.status) && { status: params.status as 'ACTIVE' }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { tagLine: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: COMBO_INCLUDE,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return this.withFigures(user, scope, combos);
  }

  async findOne(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const combo = await this.prisma.productCombo.findFirst({ where: { id, tenantId: user.tenantId }, include: COMBO_INCLUDE });
    if (!combo) throw new NotFoundException('Combo nahi mila');
    return (await this.withFigures(user, scope, [combo]))[0];
  }

  async update(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateComboDto) {
    const tenantId = user.tenantId;
    const existing = await this.prisma.productCombo.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!existing) throw new NotFoundException('Combo nahi mila');

    if (dto.name !== undefined && dto.name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) await this.checkName(tenantId, dto.name, id);
    if (dto.categoryId !== undefined) await this.checkCategory(tenantId, dto.categoryId);
    if (dto.barcode && dto.barcode !== existing.barcode) await assertCodeFree(this.prisma, tenantId, dto.barcode, { comboId: id });

    const validFrom = dto.validFrom === undefined ? existing.validFrom : dto.validFrom ? new Date(dto.validFrom) : null;
    const validTo = dto.validTo === undefined ? existing.validTo : dto.validTo ? new Date(dto.validTo) : null;
    CombosService.checkDates(validFrom, validTo);

    const parts = dto.items ? await this.resolveParts(tenantId, dto.items) : null;
    if (parts) CombosService.oneThing(parts);
    const price = dto.comboPrice ?? existing.comboPrice;
    const pricing = parts || dto.comboPrice !== undefined
      ? CombosService.savings(parts ?? existing.items.map((i) => ({ quantity: i.quantity, originalPrice: i.originalPrice })), price)
      : {};

    const { items: _items, validFrom: _f, validTo: _t, ...fields } = dto;
    const combo = await this.prisma.$transaction(async (tx) => {
      if (parts) await tx.productComboItem.deleteMany({ where: { comboId: id } });
      return tx.productCombo.update({
        where: { id },
        data: {
          ...fields,
          ...pricing,
          ...(dto.validFrom !== undefined && { validFrom }),
          ...(dto.validTo !== undefined && { validTo }),
          ...(parts && { items: { create: parts } }),
        },
        include: COMBO_INCLUDE,
      });
    });
    return (await this.withFigures(user, scope, [combo]))[0];
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.productCombo.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Combo nahi mila');
    await this.prisma.productCombo.delete({ where: { id } });
    return { id };
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const combo = await this.prisma.productCombo.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, isFeatured: true } });
    if (!combo) throw new NotFoundException('Combo nahi mila');
    return this.prisma.productCombo.update({ where: { id }, data: { isFeatured: !combo.isFeatured } });
  }

  /* ─── Analytics ──────────────────────────────────────────── */

  /**
   * Combos sold in a business-day range for the branch in view. The POS
   * splits a combo into one sale line per part, noted "Combo: <name>"; the
   * lines of one combo in one bill are grouped, and the number sold is the
   * part quantity divided by the quantity one combo holds. Returned units
   * are taken off revenue and cost.
   */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ComboRangeDto) {
    const tenantId = user.tenantId;
    const range = await periodRange(this.tz, tenantId, q.from, q.to);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const [combos, lines] = await Promise.all([
      this.prisma.productCombo.findMany({ where: { tenantId }, include: COMBO_INCLUDE }),
      this.prisma.saleItem.findMany({
        where: {
          OR: COMBO_NOTES.map((n) => ({ note: { startsWith: n } })),
          sale: { tenantId, ...scope.where, status: { in: [...LIVE_SALES] }, soldAt: range },
        },
        select: {
          saleId: true, productId: true, quantity: true, returnedQty: true, price: true, costPrice: true, note: true,
          sale: { select: { soldAt: true } },
        },
      }),
    ]);
    const byName = new Map(combos.map((c) => [c.name.trim().toLowerCase(), c]));

    // One group per bill and combo.
    const groups = new Map<string, { name: string; soldAt: Date; parts: Map<string, number>; revenue: number; cost: number }>();
    for (const l of lines) {
      const prefix = COMBO_NOTES.find((n) => l.note!.startsWith(n))!;
      const name = l.note!.slice(prefix.length).trim();
      const key = `${l.saleId}|${name.toLowerCase()}`;
      const g = groups.get(key) ?? { name, soldAt: l.sale.soldAt, parts: new Map<string, number>(), revenue: 0, cost: 0 };
      const kept = Math.max(0, Number(l.quantity) - Number(l.returnedQty || 0));
      if (l.productId) g.parts.set(l.productId, (g.parts.get(l.productId) ?? 0) + kept);
      g.revenue += kept * Number(l.price);
      g.cost += kept * Number(l.costPrice);
      groups.set(key, g);
    }

    const per = new Map<string, { id: string | null; name: string; count: number; revenue: number; cost: number; bills: number }>();
    const trend = new Map<string, { key: string; count: number; revenue: number }>();
    const weekday = Array.from({ length: 7 }, (_, i) => ({ day: i, count: 0, revenue: 0 }));
    const bills = new Set<string>();
    for (const [key, g] of groups) {
      const combo = byName.get(g.name.toLowerCase());
      let count = 1;
      if (combo?.items.length) {
        const ratios = combo.items.map((it) => {
          const base = Number(it.quantity) * (it.unit ? Number(it.unit.conversionRate) || 1 : 1);
          return base > 0 ? (g.parts.get(it.productId) ?? 0) / base : 0;
        });
        count = r2(Math.min(...ratios));
      }
      if (count <= 0 && g.revenue <= 0) continue;
      bills.add(key.split('|')[0]);
      const id = combo?.id ?? null;
      const k = id ?? `name:${g.name.toLowerCase()}`;
      const row = per.get(k) ?? { id, name: combo?.name ?? g.name, count: 0, revenue: 0, cost: 0, bills: 0 };
      row.count += count; row.revenue += g.revenue; row.cost += g.cost; row.bills++;
      per.set(k, row);
      const day = businessDayKey(g.soldAt, tz, dayStartHour);
      const t = trend.get(day) ?? { key: day, count: 0, revenue: 0 };
      t.count += count; t.revenue += g.revenue;
      trend.set(day, t);
      const [y, m, d] = day.split('-').map(Number);
      const wd = weekday[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      wd.count += count; wd.revenue += g.revenue;
    }

    const rows = [...per.values()].map((r) => ({
      id: r.id, name: r.name, count: r2(r.count), bills: r.bills, revenue: r2(r.revenue), cost: r2(r.cost),
      profit: r2(r.revenue - r.cost), margin: r.revenue > 0 ? r2(((r.revenue - r.cost) / r.revenue) * 100) : 0,
    }));
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const soldIds = new Set(rows.map((r) => r.id).filter(Boolean));
    const live = await this.withFigures(user, scope, combos.filter((c) => c.status === 'ACTIVE'));

    return {
      totals: {
        combos: combos.length,
        active: live.filter((c) => c.sellable).length,
        sold: r2(rows.reduce((s, r) => s + r.count, 0)),
        bills: bills.size,
        revenue: r2(revenue),
        cost: r2(cost),
        profit: r2(revenue - cost),
        margin: revenue > 0 ? r2(((revenue - cost) / revenue) * 100) : 0,
        savingsGiven: r2(rows.reduce((s, r) => {
          const c = combos.find((x) => x.id === r.id);
          return s + (c ? Number(c.savingsAmount) * r.count : 0);
        }, 0)),
      },
      byCombo: rows.sort((a, b) => b.revenue - a.revenue),
      trend: [...trend.values()].sort((a, b) => a.key.localeCompare(b.key)).map((t) => ({ ...t, count: r2(t.count), revenue: r2(t.revenue) })),
      weekday: weekday.map((w) => ({ ...w, count: r2(w.count), revenue: r2(w.revenue) })),
      notSold: live.filter((c) => c.sellable && !soldIds.has(c.id)).map((c) => ({ id: c.id, name: c.name, comboPrice: c.comboPrice, available: c.available })),
      runningLow: live.filter((c) => c.sellable && c.available <= 3)
        .sort((a, b) => a.available - b.available)
        .map((c) => ({ id: c.id, name: c.name, available: c.available, limitedBy: c.limitedBy })),
      days: Math.max(1, Math.round((range.lt.getTime() - range.gte.getTime()) / DAY)),
    };
  }
}
