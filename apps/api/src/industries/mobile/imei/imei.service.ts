import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ImeiStatus, PtaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { startOfDayTz, startOfMonthTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { CreateImeiDto } from './dto/create-imei.dto';
import { BulkCreateImeiDto } from './dto/bulk-create-imei.dto';
import { UpdateImeiDto } from './dto/update-imei.dto';
import { addMonthsClamped, daysUntil, isLuhnValid, syncImeiStock } from '../common/mobile-common';

/**
 * Statuses an owner may set by hand. SOLD comes only from a bill; a phone
 * going back to the supplier goes through a purchase return.
 */
const MANUAL_STATUS: ImeiStatus[] = ['IN_STOCK', 'RESERVED', 'DAMAGED', 'LOST'];
/** Off the shelf as a write-off (counted in damage and loss reports). */
const WRITTEN_OFF: ImeiStatus[] = ['DAMAGED', 'LOST'];

export type ImeiSort = 'new' | 'old' | 'costHigh' | 'costLow' | 'sold';

export interface ImeiListParams {
  search?: string;
  status?: ImeiStatus;
  ptaStatus?: PtaStatus;
  productId?: string;
  variantId?: string;
  shopId?: string;
  /** Only phones on the shelf for at least this many days. */
  agedDays?: number;
  /** Period on the date that fits the status (sold date for SOLD, entry date otherwise). */
  from?: string;
  to?: string;
  sort?: ImeiSort;
  page?: number;
  limit?: number;
}

@Injectable()
export class ImeiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fields the POS needs for a sale. `price` must be here, or the phone goes
   * on the bill at Rs 0.
   */
  private static readonly SALE_INCLUDE = {
    product: {
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        price: true,
        costPrice: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
          take: 1,
        },
      },
    },
    variant: {
      select: {
        id: true,
        name: true,
        color: true,
        colorHex: true,
        price: true,
        costPrice: true,
      },
    },
  } satisfies Prisma.ProductImeiInclude;

  /** The product (and variant) must belong to this shop owner. */
  private async assertOwnProduct(user: AuthenticatedUser, productId: string, variantId?: string | null) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, costPrice: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (variantId) {
      const v = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
      if (!v) throw new NotFoundException('Variant nahi mila');
    }
    return product;
  }

  /** Branch the device sits in: given one, else the user's own, else the first active shop. */
  private async resolveShopId(user: AuthenticatedUser, explicit?: string) {
    if (explicit) {
      const own = await this.prisma.shop.findFirst({ where: { id: explicit, tenantId: user.tenantId }, select: { id: true } });
      if (!own) throw new NotFoundException('Shop nahi mili');
      return explicit;
    }
    if (user.shopId) return user.shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Koi active shop nahi hai. Pehle shop banayein.');
    return shop.id;
  }

  /** IMEI 1 and IMEI 2 of the new phones must not already be with this shop (new or used). */
  private async assertFree(user: AuthenticatedUser, numbers: string[], exceptId?: string) {
    const list = [...new Set(numbers.filter(Boolean))];
    if (!list.length) return;
    const taken = await this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        ...(exceptId && { id: { not: exceptId } }),
        OR: [{ imei1: { in: list } }, { imei2: { in: list } }],
      },
      select: { imei1: true, imei2: true },
    });
    if (taken.length) {
      const hit = list.filter((n) => taken.some((t) => t.imei1 === n || t.imei2 === n));
      throw new ConflictException(`Ye IMEI pehle se stock record me hai: ${hit.join(', ')}`);
    }
  }

  /** Warranty runs from the day of sale; an unsold phone shows its months only. */
  private warrantyOf(row: { warrantyMonths: number | null; soldAt: Date | null; status: ImeiStatus }) {
    const months = Number(row.warrantyMonths ?? 0);
    if (!months || !row.soldAt || row.status !== 'SOLD') return { months, start: null, end: null, active: false, daysLeft: null };
    const end = addMonthsClamped(row.soldAt, months);
    const daysLeft = daysUntil(end);
    return { months, start: row.soldAt, end, active: daysLeft >= 0, daysLeft };
  }

  // ════════════════════════════════════════════════════════
  // CREATE
  // ════════════════════════════════════════════════════════
  async create(user: AuthenticatedUser, dto: CreateImeiDto) {
    const product = await this.assertOwnProduct(user, dto.productId, dto.variantId);
    if (dto.imei2 && dto.imei2 === dto.imei1) throw new BadRequestException('IMEI 1 aur IMEI 2 ek jaise nahi ho sakte');
    await this.assertFree(user, [dto.imei1, dto.imei2 ?? '']);
    if (dto.status && dto.status !== 'IN_STOCK') throw new BadRequestException('Naya phone stock me hi aata hai');

    const shopId = await this.resolveShopId(user, dto.shopId);
    const cost = dto.costPrice ?? (Number(product.costPrice) || 0);

    return this.prisma.$transaction(async (tx) => {
      const imei = await tx.productImei.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: dto.productId,
          variantId: dto.variantId,
          imei1: dto.imei1,
          imei2: dto.imei2,
          serialNumber: dto.serialNumber,
          ptaStatus: dto.ptaStatus ?? 'PENDING',
          ptaTaxPaid: dto.ptaTaxPaid ?? 0,
          ptaTaxDueAt: dto.ptaTaxDueAt ? new Date(dto.ptaTaxDueAt) : null,
          ptaVerifiedAt: dto.ptaVerifiedAt ? new Date(dto.ptaVerifiedAt) : null,
          costPrice: cost,
          warrantyMonths: dto.warrantyMonths ?? 12,
          warrantyExpiry: null,
          color: dto.color,
          notes: dto.notes,
          purchasedAt: new Date(),
        },
      });
      await syncImeiStock(tx, user, {
        productId: dto.productId, variantId: dto.variantId, shopIds: [shopId],
        reference: `IMEI-${imei.imei1}`, note: `Naya phone IMEI ${imei.imei1}`, unitCost: cost,
      });
      return { ...imei, luhnOk: isLuhnValid(imei.imei1) };
    });
  }

  // ════════════════════════════════════════════════════════
  // BULK CREATE
  // ════════════════════════════════════════════════════════
  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateImeiDto) {
    const product = await this.assertOwnProduct(user, dto.productId, dto.variantId);
    const numbers = dto.imeis.flatMap((i) => [i.imei1, i.imei2 ?? '']).filter(Boolean);
    const dup = numbers.find((x, i) => numbers.indexOf(x) !== i);
    if (dup) throw new ConflictException(`IMEI ${dup} list me do dafa hai`);
    await this.assertFree(user, numbers);

    const count = dto.imeis.length;
    const shopId = await this.resolveShopId(user, dto.shopId);
    const cost = dto.costPrice ?? (Number(product.costPrice) || 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.productImei.createMany({
        data: dto.imeis.map((i) => ({
          tenantId: user.tenantId,
          shopId,
          productId: dto.productId,
          variantId: dto.variantId,
          imei1: i.imei1,
          imei2: i.imei2,
          serialNumber: i.serialNumber,
          ptaStatus: i.ptaStatus ?? 'PENDING',
          ptaTaxPaid: i.ptaTaxPaid ?? 0,
          costPrice: cost,
          warrantyMonths: dto.warrantyMonths ?? 12,
          warrantyExpiry: null,
          color: i.color,
          notes: i.notes,
          purchasedAt: new Date(),
        })),
      });
      await syncImeiStock(tx, user, {
        productId: dto.productId, variantId: dto.variantId, shopIds: [shopId],
        reference: `IMEI-BULK`, note: `${count} naye phone IMEI ke saath`, unitCost: cost,
      });
    });

    const badChecksum = dto.imeis.filter((i) => !isLuhnValid(i.imei1)).map((i) => i.imei1);
    return { count, message: `${count} IMEIs add ho gaye`, badChecksum };
  }

  // ════════════════════════════════════════════════════════
  // LIST (server-side filters, totals per status)
  // ════════════════════════════════════════════════════════
  private listWhere(user: AuthenticatedUser, params: ImeiListParams, withStatus = true): Prisma.ProductImeiWhereInput {
    const q = params.search?.trim();
    const and: Prisma.ProductImeiWhereInput[] = [];
    if (q) {
      and.push({
        OR: [
          { imei1: { contains: q } },
          { imei2: { contains: q } },
          { serialNumber: { contains: q, mode: 'insensitive' as const } },
          { color: { contains: q, mode: 'insensitive' as const } },
          { product: { name: { contains: q, mode: 'insensitive' as const } } },
          { product: { brand: { name: { contains: q, mode: 'insensitive' as const } } } },
          { variant: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      });
    }
    const range = this.range(params.from, params.to);
    if (range) {
      // A sold phone is dated by its sale; anything else by the day it came in.
      and.push(params.status === 'SOLD' ? { soldAt: range } : { purchasedAt: range });
    }
    if (params.agedDays && params.agedDays > 0) {
      and.push({ status: 'IN_STOCK', purchasedAt: { lte: subDaysTz(new Date(), params.agedDays) } });
    }
    return {
      tenantId: user.tenantId,
      ...(params.shopId && { shopId: params.shopId }),
      ...(withStatus && params.status && { status: params.status }),
      ...(params.ptaStatus && { ptaStatus: params.ptaStatus }),
      ...(params.productId && { productId: params.productId }),
      ...(params.variantId && { variantId: params.variantId }),
      ...(and.length && { AND: and }),
    };
  }

  private range(from?: string, to?: string): Prisma.DateTimeFilter | null {
    const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!ok(from) && !ok(to)) return null;
    const r: Prisma.DateTimeFilter = {};
    if (ok(from)) r.gte = startOfDayTz(new Date(`${from}T12:00:00Z`));
    if (ok(to)) r.lt = startOfDayTz(new Date(new Date(`${to}T12:00:00Z`).getTime() + 86_400_000));
    return r;
  }

  async listAll(user: AuthenticatedUser, params: ImeiListParams) {
    const where = this.listWhere(user, params);
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(1, params.limit ?? 100), 500);
    const orderBy: Prisma.ProductImeiOrderByWithRelationInput[] =
      params.sort === 'old' ? [{ purchasedAt: 'asc' }, { createdAt: 'asc' }]
        : params.sort === 'costHigh' ? [{ costPrice: 'desc' }]
          : params.sort === 'costLow' ? [{ costPrice: 'asc' }]
            : params.sort === 'sold' ? [{ soldAt: { sort: 'desc', nulls: 'last' } }]
              : [{ createdAt: 'desc' }];

    const [items, total, byStatus, sums] = await Promise.all([
      this.prisma.productImei.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, brandId: true, brand: { select: { name: true } } } },
          variant: { select: { id: true, name: true, color: true, colorHex: true, price: true } },
          shop: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.productImei.count({ where }),
      this.prisma.productImei.groupBy({ by: ['status'], where: this.listWhere(user, params, false), _count: { _all: true } }),
      this.prisma.productImei.aggregate({ where, _sum: { costPrice: true, soldPrice: true } }),
    ]);

    // Bill and customer of sold phones, for the list and warranty checks.
    const saleItemIds = items.map((i) => i.saleItemId).filter((x): x is string => !!x);
    const lines = saleItemIds.length
      ? await this.prisma.saleItem.findMany({
          where: { id: { in: saleItemIds }, sale: { tenantId: user.tenantId } },
          select: { id: true, sale: { select: { id: true, saleNumber: true, status: true, customer: { select: { id: true, name: true, phone: true } } } } },
        })
      : [];
    const saleByItem = new Map(lines.map((l) => [l.id, l.sale]));
    const now = new Date();

    return {
      items: items.map((i) => ({
        ...i,
        salePrice: Number(i.variant?.price ?? i.product?.price ?? 0),
        sale: i.saleItemId ? saleByItem.get(i.saleItemId) ?? null : null,
        daysInStock: i.purchasedAt ? Math.max(0, Math.floor((now.getTime() - i.purchasedAt.getTime()) / 86_400_000)) : null,
        warranty: this.warrantyOf(i),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<ImeiStatus, number>>,
      totals: { cost: Number(sums._sum.costPrice ?? 0), sold: Number(sums._sum.soldPrice ?? 0) },
    };
  }

  // ════════════════════════════════════════════════════════
  // STATS (with PTA breakdown, ageing and today's sales)
  // ════════════════════════════════════════════════════════
  async stats(user: AuthenticatedUser, shopId?: string) {
    const base: Prisma.ProductImeiWhereInput = { tenantId: user.tenantId, ...(shopId && { shopId }) };
    const inStock: Prisma.ProductImeiWhereInput = { ...base, status: 'IN_STOCK' };
    const now = new Date();
    const [byStatus, byPta, totalAgg, retailRows, aged60, soldToday, soldMonth] = await Promise.all([
      this.prisma.productImei.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.productImei.groupBy({ by: ['ptaStatus'], where: inStock, _count: { _all: true }, _sum: { ptaTaxPaid: true } }),
      this.prisma.productImei.aggregate({ where: inStock, _sum: { costPrice: true } }),
      this.prisma.productImei.findMany({
        where: inStock,
        select: { product: { select: { price: true } }, variant: { select: { price: true } } },
      }),
      this.prisma.productImei.count({ where: { ...inStock, purchasedAt: { lte: subDaysTz(now, 60) } } }),
      this.prisma.productImei.count({ where: { ...base, status: 'SOLD', soldAt: { gte: startOfDayTz(now) } } }),
      this.prisma.productImei.aggregate({ where: { ...base, status: 'SOLD', soldAt: { gte: startOfMonthTz(now) } }, _count: { _all: true }, _sum: { soldPrice: true, costPrice: true } }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s.status] = s._count._all; });

    return {
      total: byStatus.reduce((s, x) => s + x._count._all, 0),
      inStock: statusMap.IN_STOCK ?? 0,
      sold: statusMap.SOLD ?? 0,
      returned: statusMap.RETURNED ?? 0,
      damaged: statusMap.DAMAGED ?? 0,
      reserved: statusMap.RESERVED ?? 0,
      lost: statusMap.LOST ?? 0,
      stockValue: totalAgg._sum.costPrice ?? 0,
      retailValue: retailRows.reduce((s, r) => s + Number(r.variant?.price ?? r.product?.price ?? 0), 0),
      aged60,
      soldToday,
      soldThisMonth: soldMonth._count._all,
      soldThisMonthValue: Number(soldMonth._sum.soldPrice ?? 0),
      soldThisMonthCost: Number(soldMonth._sum.costPrice ?? 0),
      byPta: byPta.map((p) => ({
        ptaStatus: p.ptaStatus,
        count: p._count._all,
        taxPaid: p._sum.ptaTaxPaid ?? 0,
      })),
    };
  }

  /**
   * Phones that left with the given bills: new phones by IMEI, used phones,
   * trade-ins taken as payment and EMI plans, for the sales history.
   */
  async forSales(user: AuthenticatedUser, saleIds: string[]) {
    const ids = [...new Set(saleIds.filter(Boolean))].slice(0, 200);
    if (!ids.length) return { imeis: [], used: [], tradeIns: [], plans: [] };
    const [imeis, used, tradeIns, plans] = await Promise.all([
      this.prisma.$queryRaw<Array<{ saleId: string; saleItemId: string; imei1: string; imei2: string | null; ptaStatus: PtaStatus; warrantyMonths: number | null; status: ImeiStatus }>>`
        SELECT si."saleId" AS "saleId", pi."saleItemId" AS "saleItemId", pi.imei1, pi.imei2, pi."ptaStatus" AS "ptaStatus",
               pi."warrantyMonths" AS "warrantyMonths", pi.status
        FROM "ProductImei" pi JOIN "SaleItem" si ON si.id = pi."saleItemId"
        WHERE pi."tenantId" = ${user.tenantId} AND si."saleId" IN (${Prisma.join(ids)})`,
      this.prisma.saleItem.findMany({
        where: { saleId: { in: ids }, usedPhoneId: { not: null }, sale: { tenantId: user.tenantId } },
        select: { saleId: true, id: true, usedPhone: { select: { usedPhoneCode: true, imei1: true, condition: true, ptaStatus: true } } },
      }),
      this.prisma.salePayment.findMany({
        where: { tenantId: user.tenantId, saleId: { in: ids }, method: 'TRADE_IN' },
        select: { saleId: true, amount: true, reference: true, note: true },
      }),
      this.prisma.emiPlan.findMany({
        where: { tenantId: user.tenantId, saleId: { in: ids } },
        select: { id: true, saleId: true, planNumber: true, status: true, remainingAmount: true },
      }),
    ]);
    return {
      imeis,
      used: used.filter((u) => u.usedPhone).map((u) => ({ saleId: u.saleId, saleItemId: u.id, ...u.usedPhone! })),
      tradeIns: tradeIns.map((t) => ({ ...t, amount: Number(t.amount) })),
      plans,
    };
  }

  /**
   * Per product: phones on the shelf against the branch stock, so screens can
   * show where a count and the IMEIs disagree.
   */
  async shelfCounts(user: AuthenticatedUser, shopId?: string) {
    const [groups, all] = await Promise.all([
      this.prisma.productImei.groupBy({
        by: ['productId'],
        where: { tenantId: user.tenantId, status: 'IN_STOCK', ...(shopId && { shopId }) },
        _count: { _all: true },
      }),
      this.prisma.productImei.groupBy({ by: ['productId'], where: { tenantId: user.tenantId }, _count: { _all: true } }),
    ]);
    const ids = all.map((g) => g.productId);
    const [stocks, products] = ids.length
      ? await Promise.all([
          this.prisma.shopStock.groupBy({
            by: ['productId'],
            where: { tenantId: user.tenantId, productId: { in: ids }, ...(shopId && { shopId }) },
            _sum: { stock: true },
          }),
          this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, name: true } }),
        ])
      : [[], []];
    const onShelf = new Map(groups.map((g) => [g.productId, g._count._all]));
    const stock = new Map(stocks.map((s) => [s.productId, Number(s._sum.stock ?? 0)]));
    const names = new Map(products.map((p) => [p.id, p.name]));
    return all.map((g) => ({
      productId: g.productId,
      name: names.get(g.productId) ?? 'Phone',
      total: g._count._all,
      inStock: onShelf.get(g.productId) ?? 0,
      stock: stock.get(g.productId) ?? 0,
    }));
  }

  // ════════════════════════════════════════════════════════
  // STOCK RECALC (owner tool — bring branch stock back to the phones on the shelf)
  // ════════════════════════════════════════════════════════
  async recalcAllStocks(user: AuthenticatedUser) {
    const groups = await this.prisma.productImei.groupBy({
      by: ['productId', 'variantId', 'shopId'],
      where: { tenantId: user.tenantId, shopId: { not: null } },
    });
    const products = new Set<string>();
    let variants = 0;
    for (const g of groups) {
      await this.prisma.$transaction((tx) => syncImeiStock(tx, user, {
        productId: g.productId, variantId: g.variantId, shopIds: [g.shopId],
        reference: 'IMEI-RECOUNT', note: 'Stock IMEI ginti ke barabar kiya',
      }));
      products.add(g.productId);
      if (g.variantId) variants += 1;
    }
    return {
      message: 'Stock IMEI ginti ke barabar ho gaya',
      productsUpdated: products.size,
      variantsUpdated: variants,
    };
  }

  // ════════════════════════════════════════════════════════
  // LIST BY PRODUCT / VARIANT
  // ════════════════════════════════════════════════════════
  async listByProduct(user: AuthenticatedUser, productId: string, status?: ImeiStatus) {
    return this.prisma.productImei.findMany({
      where: { tenantId: user.tenantId, productId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByVariant(user: AuthenticatedUser, variantId: string, status?: ImeiStatus) {
    return this.prisma.productImei.findMany({
      where: { tenantId: user.tenantId, variantId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async availableForSale(user: AuthenticatedUser, productId: string, variantId?: string, shopId?: string) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        ...(variantId && { variantId }),
        ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        status: 'IN_STOCK',
      },
      include: ImeiService.SALE_INCLUDE,
      orderBy: { purchasedAt: 'asc' },
    });
  }

  async search(user: AuthenticatedUser, query: string, status?: ImeiStatus) {
    const q = query.trim();
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status && { status }),
        ...(q
          ? {
              OR: [
                { imei1: { contains: q } },
                { imei2: { contains: q } },
                { serialNumber: { contains: q, mode: 'insensitive' as const } },
                { product: { name: { contains: q, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: ImeiService.SALE_INCLUDE,
      // Phones on the shelf first, so sold ones never push them off the list.
      orderBy: [{ status: 'asc' }, { purchasedAt: 'asc' }],
      take: 50,
    });
  }

  // ════════════════════════════════════════════════════════
  // LOOKUP — one IMEI's whole story: stock, sale, warranty, buy-backs, repairs
  // ════════════════════════════════════════════════════════
  async lookup(user: AuthenticatedUser, raw: string) {
    const code = (raw ?? '').replace(/\s+/g, '');
    if (code.length < 5) throw new BadRequestException('Poora IMEI likhein (kam az kam 5 number)');
    const exact = /^\d{15}$/.test(code);
    const match = exact ? { equals: code } : { contains: code };

    const [newPhones, usedPhones, repairs] = await Promise.all([
      this.prisma.productImei.findMany({
        where: { tenantId: user.tenantId, OR: [{ imei1: match }, { imei2: match }, { serialNumber: { equals: code, mode: 'insensitive' } }] },
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, brand: { select: { name: true } } } },
          variant: { select: { id: true, name: true, price: true } },
          shop: { select: { id: true, name: true } },
        },
        take: 10,
      }),
      this.prisma.usedPhone.findMany({
        where: { tenantId: user.tenantId, OR: [{ imei1: match }, { imei2: match }] },
        select: {
          id: true, usedPhoneCode: true, brand: true, model: true, storage: true, status: true, condition: true, source: true,
          buybackPrice: true, resalePrice: true, finalSoldPrice: true, receivedAt: true, soldAt: true, soldSaleId: true,
          fromCustomerName: true, fromCustomerPhone: true, fromCustomerCnic: true, ptaStatus: true,
        },
        orderBy: { receivedAt: 'desc' },
        take: 10,
      }),
      this.prisma.repairTicket.findMany({
        where: { tenantId: user.tenantId, OR: [{ imei1: match }, { imei2: match }] },
        select: {
          id: true, ticketNumber: true, status: true, deviceBrand: true, deviceModel: true, reportedIssue: true, diagnosedIssue: true,
          receivedAt: true, deliveredAt: true, warrantyDays: true, warrantyEnds: true, totalCost: true, customerName: true, customerPhone: true,
          warrantyOf: { select: { id: true, ticketNumber: true } },
        },
        orderBy: { receivedAt: 'desc' },
        take: 20,
      }),
    ]);

    const saleItemIds = newPhones.map((p) => p.saleItemId).filter((x): x is string => !!x);
    const usedSaleIds = usedPhones.map((p) => p.soldSaleId).filter((x): x is string => !!x);
    const [lines, usedSales] = await Promise.all([
      saleItemIds.length
        ? this.prisma.saleItem.findMany({
            where: { id: { in: saleItemIds }, sale: { tenantId: user.tenantId } },
            select: { id: true, price: true, sale: { select: { id: true, saleNumber: true, status: true, createdAt: true, customer: { select: { id: true, name: true, phone: true } } } } },
          })
        : [],
      usedSaleIds.length
        ? this.prisma.sale.findMany({
            where: { id: { in: usedSaleIds }, tenantId: user.tenantId },
            select: { id: true, saleNumber: true, status: true, createdAt: true, customer: { select: { id: true, name: true, phone: true } } },
          })
        : [],
    ]);
    const lineById = new Map(lines.map((l) => [l.id, l]));
    const saleById = new Map(usedSales.map((s) => [s.id, s]));
    const now = new Date();

    return {
      code,
      newPhones: newPhones.map((p) => {
        const line = p.saleItemId ? lineById.get(p.saleItemId) : undefined;
        return {
          id: p.id, imei1: p.imei1, imei2: p.imei2, serialNumber: p.serialNumber, color: p.color, status: p.status,
          ptaStatus: p.ptaStatus, ptaTaxPaid: p.ptaTaxPaid, costPrice: p.costPrice, soldPrice: p.soldPrice, purchasedAt: p.purchasedAt, soldAt: p.soldAt,
          notes: p.notes, product: p.product, variant: p.variant, shop: p.shop,
          sale: line ? { ...line.sale, price: line.price } : null,
          warranty: this.warrantyOf(p),
        };
      }),
      usedPhones: usedPhones.map((u) => ({ ...u, sale: u.soldSaleId ? saleById.get(u.soldSaleId) ?? null : null })),
      repairs: repairs.map((r) => {
        const end = r.warrantyEnds ?? (r.deliveredAt && r.warrantyDays ? new Date(r.deliveredAt.getTime() + r.warrantyDays * 86_400_000) : null);
        return { ...r, warrantyEnds: end, warrantyActive: !!end && r.status === 'DELIVERED' && end >= now };
      }),
      luhnOk: exact ? isLuhnValid(code) : null,
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const imei = await this.prisma.productImei.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { product: true, variant: true },
    });
    if (!imei) throw new NotFoundException('IMEI nahi mila');
    return imei;
  }

  /**
   * Edits one phone. A sale is the only way to SOLD; DAMAGED and LOST from
   * the shelf take it out of stock with a write-off movement at its cost.
   */
  async update(user: AuthenticatedUser, id: string, dto: UpdateImeiDto) {
    const current = await this.findOne(user, id);
    const data: Prisma.ProductImeiUpdateInput = {};
    const copy = ['imei1', 'imei2', 'serialNumber', 'ptaStatus', 'ptaTaxPaid', 'costPrice', 'warrantyMonths', 'color', 'notes'] as const;
    for (const k of copy) if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = dto[k];
    if (dto.ptaTaxDueAt !== undefined) data.ptaTaxDueAt = dto.ptaTaxDueAt ? new Date(dto.ptaTaxDueAt) : null;
    if (dto.ptaVerifiedAt !== undefined) data.ptaVerifiedAt = dto.ptaVerifiedAt ? new Date(dto.ptaVerifiedAt) : null;

    const nextImei1 = dto.imei1 ?? current.imei1;
    const nextImei2 = dto.imei2 === undefined ? current.imei2 : dto.imei2;
    if (nextImei2 && nextImei2 === nextImei1) throw new BadRequestException('IMEI 1 aur IMEI 2 ek jaise nahi ho sakte');
    if ((dto.imei1 && dto.imei1 !== current.imei1) || (dto.imei2 && dto.imei2 !== current.imei2)) {
      if (current.status === 'SOLD') throw new BadRequestException('Bike hue phone ka IMEI nahi badla ja sakta — bill par yahi likha hai');
      await this.assertFree(user, [dto.imei1 && dto.imei1 !== current.imei1 ? dto.imei1 : '', dto.imei2 && dto.imei2 !== current.imei2 ? dto.imei2 : ''], id);
    }
    if (dto.costPrice !== undefined && current.status === 'SOLD') {
      throw new BadRequestException('Bike hue phone ki cost nahi badli ja sakti — bill ka profit isi par bana hai');
    }

    let status = current.status;
    if (dto.status && dto.status !== current.status) {
      if (dto.status === 'SOLD') throw new BadRequestException('Phone sirf POS bill se bikta hai');
      if (current.status === 'SOLD') throw new BadRequestException('Bika hua phone wapas lene ke liye Return istemal karein');
      if (!MANUAL_STATUS.includes(dto.status)) throw new BadRequestException('Supplier ko wapas bhejne ke liye Purchase return istemal karein');
      if (dto.shopId && dto.shopId !== current.shopId) throw new BadRequestException('Halat aur shop ek saath nahi badalte — pehle ek kaam karein');
      status = dto.status;
      data.status = status;
    }

    let shopId = current.shopId;
    if (dto.shopId && dto.shopId !== current.shopId) {
      if (current.status !== 'IN_STOCK') throw new BadRequestException('Sirf stock wala phone doosri shop bheja ja sakta hai');
      shopId = await this.resolveShopId(user, dto.shopId);
      data.shop = { connect: { id: shopId } };
    }

    const stockChanged = status !== current.status || shopId !== current.shopId;
    const cost = Number(dto.costPrice ?? current.costPrice) || Number(current.product?.costPrice) || 0;
    // Damage and loss are write-offs; a written-off phone found again reduces them.
    const writeOff: 'DAMAGE' | 'LOSS' | 'ADJUSTMENT_IN' | null =
      status === current.status ? null
        : WRITTEN_OFF.includes(status) && !WRITTEN_OFF.includes(current.status) ? (status === 'DAMAGED' ? 'DAMAGE' : 'LOSS')
          : status === 'IN_STOCK' && WRITTEN_OFF.includes(current.status) ? 'ADJUSTMENT_IN'
            : null;
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.productImei.update({ where: { id }, data });
      if (writeOff && current.shopId) {
        await tx.stockAdjustment.create({
          data: {
            tenantId: user.tenantId, shopId: current.shopId, productId: current.productId, variantId: current.variantId, imeiId: id,
            createdById: user.id, type: writeOff, quantity: 1, unitCost: cost, value: cost,
            reason: writeOff === 'DAMAGE' ? 'Kharab' : writeOff === 'LOSS' ? 'Gum' : 'Wapas mila',
            note: `[IMEI: ${row.imei1}] ${current.status} → ${status}${dto.notes ? ` — ${dto.notes}` : ''}`,
          },
        });
      }
      if (stockChanged) {
        const reason = shopId !== current.shopId ? 'doosri shop bheja' : `${current.status} → ${status}`;
        await syncImeiStock(tx, user, {
          productId: current.productId, variantId: current.variantId, shopIds: [current.shopId, shopId],
          reference: `IMEI-${row.imei1}`, note: `IMEI ${row.imei1}: ${reason}`, unitCost: cost,
          outType: shopId !== current.shopId ? 'TRANSFER_OUT' : status === 'DAMAGED' ? 'DAMAGE' : status === 'LOST' ? 'LOSS' : 'ADJUSTMENT_OUT',
          inType: shopId !== current.shopId ? 'TRANSFER_IN' : 'ADJUSTMENT_IN',
        });
      }
      return row;
    });
  }

  /**
   * Removes a phone entered by mistake: only one on the shelf that was never
   * sold, moved or adjusted. Its stock leaves with a movement.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const imei = await this.findOne(user, id);
    if (imei.status === 'SOLD' || imei.saleItemId || imei.soldAt) {
      throw new BadRequestException('Bika hua phone mitaya nahi ja sakta');
    }
    const [transfers, adjustments] = await Promise.all([
      this.prisma.stockTransferItem.count({ where: { imeiId: id } }),
      this.prisma.stockAdjustment.count({ where: { imeiId: id } }),
    ]);
    if (transfers || adjustments) {
      throw new BadRequestException('Is phone ki history hai (transfer/adjustment) — mitane ki jagah halat "Gum" ya "Kharab" karein');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImei.delete({ where: { id } });
      await syncImeiStock(tx, user, {
        productId: imei.productId, variantId: imei.variantId, shopIds: [imei.shopId],
        reference: `IMEI-${imei.imei1}`, note: `Ghalat IMEI ${imei.imei1} hataya`, unitCost: Number(imei.costPrice) || 0,
      });
    });

    return { success: true };
  }
}
