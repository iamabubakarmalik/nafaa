/**
 * The restaurant menu page: every product with its menu profile, whether it
 * is on the menu and served now, recipe plate cost and how many plates the
 * store still covers, with search, filters, sort and paging on the server.
 * Analytics ranks dishes by sales and profit from the same bill math the
 * reports use.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, billMathCte, liveSaleSql, saleFigures,
} from '../../../common/helpers/business-math.helper';
import { startOfBusinessDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RecipesService } from '../recipes/recipes.service';
import { stockOf } from '../recipes/branch-stock';
import { round2, round3 } from '../recipes/recipe-units';
import type { BoardSort, BoardState, MenuBoardQueryDto } from './dto/upsert-menu-item.dto';
import { servedAt } from './time-window';

const WINDOW_DAYS = 30;

type Kind = 'dish' | 'bought' | 'raw';

export interface BoardItem {
  productId: string;
  menuItemId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  price: number;
  cost: number;
  image: string | null;
  category: { id: string; name: string; color: string } | null;
  isActive: boolean;
  kind: Kind;
  onPos: boolean;
  available: boolean;
  servingNow: boolean;
  hours: { from: string | null; to: string | null; days: number[] };
  chefSpecial: boolean;
  bestSeller: boolean;
  spiceLevel: string | null;
  diet: string[];
  prepTime: number | null;
  addOnGroups: number;
  recipe: { id: string; lines: number; unitProblems: string[] } | null;
  canMake: number | null;
  blocker: { name: string; have: number; need: number; unit: string } | null;
  foodCostPct: number | null;
  profit: number;
  stock: number | null;
  lowStockAlert: number;
  sold: number;
  createdAt: Date;
}

@Injectable()
export class MenuBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipes: RecipesService,
    private readonly clock: TenantTimezoneService,
  ) {}

  private async since(tenantId: string, days: number) {
    const { tz, dayStartHour } = await this.clock.clock(tenantId);
    return { tz, from: subDaysTz(startOfBusinessDayTz(new Date(), tz, dayStartHour), days - 1, tz) };
  }

  /** Units kept by customers per product over the window. */
  private async soldBy(tenantId: string, shopId: string | null, from: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; qty: number }>>`
      SELECT si."productId" AS id, COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty
      FROM "Sale" s JOIN "SaleItem" si ON si."saleId" = s.id
      WHERE ${liveSaleSql({ tenantId, shopId }, { gte: from })} AND si."productId" IS NOT NULL
      GROUP BY 1`;
    return new Map(rows.map((r) => [r.id, Number(r.qty) || 0]));
  }

  private async items(user: AuthenticatedUser, shopId: string | null, inactive: boolean): Promise<BoardItem[]> {
    const [products, facts, { tz, from }] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: !inactive },
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, isActive: true,
          isRawMaterial: true, productType: true, lowStockAlert: true, createdAt: true,
          category: { select: { id: true, name: true, color: true } },
          images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { url: true } },
          menuItem: {
            select: {
              id: true, isAvailable: true, availableFrom: true, availableTo: true, availableDays: true, chefSpecial: true,
              bestSeller: true, isSpicy: true, spiceLevel: true, dietaryTags: true, prepTimeMinutes: true, imageUrl: true,
              modifiers: { where: { modifierGroup: { isActive: true } }, select: { id: true } },
            },
          },
        },
      }),
      this.recipes.plateFacts(user.tenantId, shopId),
      this.since(user.tenantId, WINDOW_DAYS),
    ]);
    const counted = products.filter((p) => !facts.has(p.id)).map((p) => p.id);
    const [stock, sold] = await Promise.all([
      stockOf(this.prisma, user.tenantId, shopId, counted),
      this.soldBy(user.tenantId, shopId, from),
    ]);
    const now = new Date();

    return products.map((p) => {
      const m = p.menuItem;
      const f = facts.get(p.id);
      const kind: Kind = p.isRawMaterial ? 'raw' : f || p.productType === 'MADE' || (!p.productType && !stock.get(p.id)) ? 'dish' : 'bought';
      const cost = f ? f.plateCost : Number(p.costPrice || 0);
      const price = Number(p.price || 0);
      return {
        productId: p.id,
        menuItemId: m?.id ?? null,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.unit,
        price,
        cost: round2(cost),
        image: m?.imageUrl || p.images[0]?.url || null,
        category: p.category,
        isActive: p.isActive,
        kind,
        onPos: !!m,
        available: m?.isAvailable ?? false,
        servingNow: m ? servedAt(m, now, tz) : false,
        hours: { from: m?.availableFrom ?? null, to: m?.availableTo ?? null, days: m?.availableDays ?? [] },
        chefSpecial: m?.chefSpecial ?? false,
        bestSeller: m?.bestSeller ?? false,
        spiceLevel: m?.isSpicy ? m.spiceLevel ?? 'MEDIUM' : null,
        diet: m?.dietaryTags ?? [],
        prepTime: m?.prepTimeMinutes ?? null,
        addOnGroups: m?.modifiers.length ?? 0,
        recipe: f ? { id: f.recipeId, lines: f.ingredientCount, unitProblems: f.unitProblems } : null,
        canMake: f ? f.canMake : null,
        blocker: f?.blocker ?? null,
        foodCostPct: price > 0 && cost > 0 ? round2((cost / price) * 100) : null,
        profit: round2(price - cost),
        stock: f ? null : round3(stock.get(p.id) ?? 0),
        lowStockAlert: Number(p.lowStockAlert ?? 0),
        sold: round3(sold.get(p.id) ?? 0),
        createdAt: p.createdAt,
      };
    });
  }

  private matches(i: BoardItem, state: BoardState) {
    switch (state) {
      case 'live': return i.kind !== 'raw' && i.onPos && i.available;
      case 'off': return i.kind !== 'raw' && i.onPos && !i.available;
      case 'cantmake': return i.kind !== 'raw' && i.onPos && i.canMake === 0;
      case 'norecipe': return i.kind === 'dish' && !i.recipe;
      case 'notonpos': return i.kind !== 'raw' && !i.onPos;
      case 'raw': return i.kind === 'raw';
      default: return i.kind !== 'raw';
    }
  }

  private sorter(sort: BoardSort) {
    const name = (a: BoardItem, b: BoardItem) => a.name.localeCompare(b.name);
    switch (sort) {
      case 'new': return (a: BoardItem, b: BoardItem) => b.createdAt.getTime() - a.createdAt.getTime();
      case 'priceHigh': return (a: BoardItem, b: BoardItem) => b.price - a.price || name(a, b);
      case 'priceLow': return (a: BoardItem, b: BoardItem) => a.price - b.price || name(a, b);
      case 'sold': return (a: BoardItem, b: BoardItem) => b.sold - a.sold || name(a, b);
      case 'foodCost': return (a: BoardItem, b: BoardItem) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1) || name(a, b);
      case 'profit': return (a: BoardItem, b: BoardItem) => b.profit - a.profit || name(a, b);
      case 'canMake': return (a: BoardItem, b: BoardItem) => (a.canMake ?? 1e9) - (b.canMake ?? 1e9) || name(a, b);
      default: return name;
    }
  }

  async board(user: AuthenticatedUser, shopId: string | null, q: MenuBoardQueryDto) {
    const state = q.state ?? 'all';
    const all = await this.items(user, shopId, state === 'inactive');
    const menu = all.filter((i) => i.kind !== 'raw');
    const raw = all.filter((i) => i.kind === 'raw');

    const term = q.search?.trim().toLowerCase();
    const inState = state === 'inactive' ? all : all.filter((i) => this.matches(i, state));
    const filtered = inState
      .filter((i) => !q.categoryId || (q.categoryId === 'none' ? !i.category : i.category?.id === q.categoryId))
      .filter((i) => !term || [i.name, i.sku, i.barcode, i.category?.name].some((v) => v?.toLowerCase().includes(term)))
      .sort(this.sorter(q.sort ?? 'name'));

    const limit = q.limit ?? 48;
    const page = q.page ?? 1;
    const live = menu.filter((i) => i.onPos && i.available);
    const priced = live.filter((i) => i.foodCostPct !== null && i.kind === 'dish');

    const cats = new Map<string, { id: string; name: string; color: string; count: number }>();
    for (const i of inState) {
      const c = i.category ?? { id: 'none', name: 'Baghair category', color: '#94a3b8' };
      const row = cats.get(c.id) ?? { ...c, count: 0 };
      row.count += 1;
      cats.set(c.id, row);
    }

    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      count: filtered.length,
      page,
      limit,
      windowDays: WINDOW_DAYS,
      tabs: state === 'inactive' ? null : {
        all: menu.length,
        live: live.length,
        off: menu.filter((i) => i.onPos && !i.available).length,
        cantmake: menu.filter((i) => i.onPos && i.canMake === 0).length,
        norecipe: menu.filter((i) => i.kind === 'dish' && !i.recipe).length,
        notonpos: menu.filter((i) => !i.onPos).length,
        raw: raw.length,
      },
      stats: {
        dishes: menu.length,
        live: live.length,
        /** On the menu and switched on, but the store cannot make it. */
        liveButCantMake: live.filter((i) => i.canMake === 0).map((i) => ({ productId: i.productId, menuItemId: i.menuItemId, name: i.name, blocker: i.blocker?.name ?? null })),
        running: live.filter((i) => i.canMake !== null && i.canMake > 0 && i.canMake <= 5).length,
        avgFoodCost: priced.length ? round2(priced.reduce((s, i) => s + (i.foodCostPct ?? 0), 0) / priced.length) : null,
        highFoodCost: priced.filter((i) => (i.foodCostPct ?? 0) > 45).length,
        sold: round3(menu.reduce((s, i) => s + i.sold, 0)),
        rawLow: raw.filter((i) => (i.stock ?? 0) <= i.lowStockAlert).length,
        rawValue: round2(raw.reduce((s, i) => s + Math.max(i.stock ?? 0, 0) * i.cost, 0)),
        unitProblems: menu.filter((i) => i.recipe?.unitProblems.length).length,
      },
      categories: [...cats.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Menu engineering over the last `days` business days. Revenue and cost
   * per dish come from the shared bill math (bill discount shared out,
   * returns taken off), so the totals reconcile with the profit report:
   * dish revenue + service charges = net sales.
   *
   *   star       sells well, earns well        keep, show first
   *   workhorse  sells well, earns little      raise the rate or trim the plate cost
   *   puzzle     earns well, sells little      put it in front, suggest it
   *   dog        sells little, earns little    think about taking it off
   */
  async analytics(user: AuthenticatedUser, shopId: string | null, days: number) {
    const { from } = await this.since(user.tenantId, days);
    const where = liveSaleSql({ tenantId: user.tenantId, shopId }, { gte: from });
    const [lines, figures] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; qty: number; revenue: number; cost: number; bills: number }>>`
        WITH ${billMathCte(where)}
        SELECT si."productId" AS id,
          COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty,
          COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue,
          COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost,
          COUNT(DISTINCT s.id)::int AS bills
        FROM "Sale" s JOIN bm ON bm.id = s.id
        JOIN "SaleItem" si ON si."saleId" = s.id
        ${LINE_COST_JOINS}
        WHERE ${where}
        GROUP BY 1`,
      saleFigures(this.prisma, { tenantId: user.tenantId, shopId }, { gte: from }),
    ]);

    const ids = lines.map((l) => l.id).filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: ids } },
      select: { id: true, name: true, price: true, isRawMaterial: true, category: { select: { id: true, name: true, color: true } }, menuItem: { select: { id: true, isAvailable: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const rows = lines.filter((l) => l.id && byId.has(l.id)).map((l) => {
      const p = byId.get(l.id)!;
      const qty = round3(Number(l.qty));
      const revenue = round2(Number(l.revenue));
      const cost = round2(Number(l.cost));
      return {
        productId: l.id, name: p.name, category: p.category, menuItemId: p.menuItem?.id ?? null, available: p.menuItem?.isAvailable ?? null,
        qty, revenue, cost, profit: round2(revenue - cost), bills: Number(l.bills),
        perPlate: qty > 0 ? round2((revenue - cost) / qty) : 0,
        foodCostPct: revenue > 0 ? round2((cost / revenue) * 100) : null,
      };
    }).filter((r) => r.qty > 0 || r.revenue !== 0);

    // Popular: at least 70% of an even share of plates. Earning: per-plate profit at or above the weighted average.
    const plates = rows.reduce((s, r) => s + r.qty, 0);
    const profit = rows.reduce((s, r) => s + r.profit, 0);
    const popularAt = rows.length ? (plates / rows.length) * 0.7 : 0;
    const marginAt = plates > 0 ? profit / plates : 0;
    const classed = rows.map((r) => {
      const popular = r.qty >= popularAt;
      const earning = r.perPlate >= marginAt;
      return { ...r, share: plates > 0 ? round2((r.qty / plates) * 100) : 0, class: popular ? (earning ? 'star' : 'workhorse') : earning ? 'puzzle' : 'dog' };
    }).sort((a, b) => b.profit - a.profit);

    const dishRevenue = round2(rows.reduce((s, r) => s + r.revenue, 0));
    const dishCost = round2(rows.reduce((s, r) => s + r.cost, 0));
    return {
      days,
      from,
      rows: classed,
      thresholds: { popularAt: round2(popularAt), marginAt: round2(marginAt) },
      totals: {
        plates: round3(plates),
        dishRevenue,
        dishCost,
        dishProfit: round2(dishRevenue - dishCost),
        foodCostPct: dishRevenue > 0 ? round2((dishCost / dishRevenue) * 100) : null,
        /** Bill totals from the reports' math, to show the figures agree. */
        netSales: figures.net,
        serviceCharges: figures.service,
        bills: figures.bills,
        grossProfit: figures.grossProfit,
      },
      counts: {
        star: classed.filter((r) => r.class === 'star').length,
        workhorse: classed.filter((r) => r.class === 'workhorse').length,
        puzzle: classed.filter((r) => r.class === 'puzzle').length,
        dog: classed.filter((r) => r.class === 'dog').length,
      },
    };
  }
}
