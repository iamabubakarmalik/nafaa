/**
 * Offline download for the apps (GET /sync/pull).
 *
 * The manifest is small and comes whole: shops, counter rules, receipt
 * settings, categories, brands, sellers, staff and the open cash register.
 * Products, branch stock, customers and recent sales come in pages of up to
 * 1000 rows in (updatedAt, id) order with an opaque cursor. With
 * `updatedSince` only changed rows come, switched-off ones included, so the
 * phone can drop them. Rows removed for good are found with entity=ids,
 * which lists the live ids page by page.
 *
 * Every entity checks the same permission its normal list endpoint needs;
 * khata figures need khata.view, and cost fields are removed by the global
 * cost-masking interceptor for people without cost.view.
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../common/constants/permissions.constants';
import { ShopScope } from '../../common/shop-scope';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { openDebts } from '../distribution/helpers/credit';
import { todayKey } from '../distribution/distribution.support';
import { SyncPullQueryDto } from './dto/sync-pull.dto';

export const SYNC_PAGE = 500;
export const SYNC_MAX_PAGE = 1000;
export const SYNC_MAX_ID_PAGE = 5000;
/**
 * `updatedSince` is moved back by this much: a write stamped just before the
 * last download but committed after it would otherwise be missed. Rows sent
 * twice are harmless (the phone upserts).
 */
export const SYNC_OVERLAP_MS = 2 * 60 * 1000;

interface Cursor { t: string; id: string }

export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');

export function decodeCursor(v?: string): Cursor | null {
  if (!v) return null;
  try {
    const c = JSON.parse(Buffer.from(v, 'base64url').toString('utf8'));
    return typeof c?.t === 'string' && typeof c?.id === 'string' && !Number.isNaN(Date.parse(c.t)) ? c : null;
  } catch {
    return null;
  }
}

/** Rows after the cursor in (updatedAt, id) order. */
export function afterCursor(cursor: Cursor | null): Array<Record<string, unknown>> {
  if (!cursor) return [];
  const t = new Date(cursor.t);
  return [{ OR: [{ updatedAt: { gt: t } }, { updatedAt: t, id: { gt: cursor.id } }] }];
}

export function sinceOf(updatedSince?: string): Date | null {
  if (!updatedSince) return null;
  const t = Date.parse(updatedSince);
  return Number.isNaN(t) ? null : new Date(t - SYNC_OVERLAP_MS);
}

function nextCursor<T extends { id: string; updatedAt: Date }>(rows: T[], limit: number): string | null {
  const last = rows[rows.length - 1];
  return rows.length === limit && last ? encodeCursor({ t: last.updatedAt.toISOString(), id: last.id }) : null;
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private can(user: AuthenticatedUser, ...any: PermissionKey[]) {
    return any.some((p) => hasPermission(user.role, user.permissions, p));
  }

  private need(user: AuthenticatedUser, any: PermissionKey[], what: string) {
    if (!this.can(user, ...any)) throw new ForbiddenException(`${what} dekhne ki permission nahi (${any.join(' / ')})`);
  }

  private isOwner(user: AuthenticatedUser) {
    return user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN;
  }

  /** Branches whose stock and sales this person may keep offline: staff get their own, owners all. */
  private async shopIds(user: AuthenticatedUser): Promise<string[]> {
    if (!this.isOwner(user) && user.shopId) return [user.shopId];
    const shops = await this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true } });
    return shops.map((s) => s.id);
  }

  async pull(user: AuthenticatedUser, scope: ShopScope, q: SyncPullQueryDto) {
    switch (q.entity ?? 'manifest') {
      case 'products': return this.products(user, q);
      case 'stock': return this.stock(user, q);
      case 'customers': return this.customers(user, q);
      case 'sales': return this.sales(user, scope, q);
      case 'ids': return this.ids(user, q);
      default: return this.manifest(user, scope);
    }
  }

  /* ───────────── manifest ───────────── */

  private async manifest(user: AuthenticatedUser, scope: ShopScope) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const me = {
      id: user.id,
      role: user.role,
      shopId: user.shopId,
      canSell: this.can(user, PERMISSIONS.POS_USE),
      canSeeProducts: this.can(user, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.POS_USE),
      canSeeCustomers: this.can(user, PERMISSIONS.CUSTOMERS_VIEW),
      canSeeKhata: this.can(user, PERMISSIONS.KHATA_VIEW),
      canSeeSales: this.can(user, PERMISSIONS.SALES_VIEW),
      canSeeCost: this.can(user, PERMISSIONS.COST_VIEW),
      canSeeStaff: this.can(user, PERMISSIONS.STAFF_VIEW),
      canSeeRegister: this.can(user, PERMISSIONS.CASH_REGISTER_VIEW),
    };
    const shopIds = await this.shopIds(user);
    const catalog = me.canSeeProducts || this.can(user, PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.BRANDS_VIEW);
    const [settings, shops, categories, brands, expenseCategories, incomeCategories, sellers, staff, registers, productCount, customerCount] = await Promise.all([
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: {
          shopName: true, shopAddress: true, shopCity: true, shopPhone: true, shopWhatsapp: true, logoUrl: true,
          currency: true, currencySymbol: true, timezone: true, businessDayStartHour: true,
          enableTax: true, taxRate: true, taxInclusive: true, taxLabel: true, taxNumber: true, roundPriceTo: true, roundTotal: true,
          receiptSize: true, receiptHeader: true, receiptFooter: true, receiptShowLogo: true, receiptShowTax: true,
          receiptShowCustomer: true, receiptShowBarcode: true, receiptShowQrCode: true, receiptConfig: true,
          invoicePrefix: true, autoPrintReceipt: true, printCopiesCount: true,
          defaultPaymentMethod: true, allowNegativeStock: true, confirmBeforeCheckout: true, requireCustomerForSale: true,
          allowDiscount: true, maxDiscountPercent: true, allowCredit: true, defaultCreditLimit: true, creditOverdueDays: true,
          requirePinForVoid: true, requirePinForDiscount: true, requirePinForRefund: true, managerPin: true,
          enableLoyalty: true, loyaltyPointsPerRupee: true, loyaltyRedemptionRate: true, loyaltyMinRedeem: true, loyaltyMaxRedeemPercent: true,
          serviceChargePct: true, exchangeDays: true, manufacturingEnabled: true, trackExpiry: true, expiryWarningDays: true,
          defaultLowStockAlert: true, autoCreateCustomer: true,
        },
      }),
      this.prisma.shop.findMany({
        where: { tenantId, id: { in: shopIds } },
        select: { id: true, name: true, address: true, phone: true, isMain: true, type: true, isActive: true, updatedAt: true },
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      }),
      catalog ? this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, color: true, isActive: true, updatedAt: true }, orderBy: { name: 'asc' } }) : [],
      catalog ? this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true, isActive: true, updatedAt: true }, orderBy: { name: 'asc' } }) : [],
      this.can(user, PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_CREATE)
        ? this.prisma.expenseCategory.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, color: true, icon: true }, orderBy: { name: 'asc' } })
        : [],
      this.can(user, PERMISSIONS.INCOME_VIEW, PERMISSIONS.INCOME_MANAGE)
        ? this.prisma.otherIncomeCategory.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } })
        : [],
      me.canSell
        ? this.prisma.commissionEnrollment.findMany({
          where: { tenantId, isActive: true, user: { isActive: true } },
          select: { userId: true, user: { select: { fullName: true } }, staff: { select: { fullName: true } } },
        })
        : [],
      me.canSeeStaff
        ? this.prisma.staff.findMany({
          where: { tenantId, status: { in: ['ACTIVE', 'ON_LEAVE'] }, ...(!this.isOwner(user) && user.shopId ? { OR: [{ shopId: user.shopId }, { shopId: null }] } : {}) },
          select: { id: true, userId: true, fullName: true, designation: true, shopId: true, status: true, avatarUrl: true },
          orderBy: { fullName: 'asc' },
        })
        : [],
      me.canSeeRegister
        ? this.prisma.cashRegister.findMany({
          where: { tenantId, status: 'OPEN', shopId: { in: shopIds } },
          select: { id: true, shopId: true, registerNumber: true, openingBalance: true, openedAt: true, openedById: true },
        })
        : [],
      me.canSeeProducts ? this.prisma.product.count({ where: { tenantId, isActive: true } }) : 0,
      me.canSeeCustomers ? this.prisma.customer.count({ where: { tenantId, isActive: true } }) : 0,
    ]);

    const { managerPin, ...rest } = settings ?? ({} as NonNullable<typeof settings>);
    return {
      entity: 'manifest',
      serverTime: new Date().toISOString(),
      today: todayKey(clock),
      timezone: clock.tz,
      dayStartHour: clock.dayStartHour,
      me,
      currentShopId: scope.shopId,
      settings: settings ? { ...rest, hasManagerPin: !!managerPin } : null,
      shops,
      categories,
      brands,
      expenseCategories,
      incomeCategories,
      sellers: sellers
        .map((r) => ({ userId: r.userId, name: r.staff?.fullName ?? r.user.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      staff,
      registers,
      counts: { products: productCount, customers: customerCount },
      pageSize: SYNC_PAGE,
    };
  }

  /* ───────────── products ───────────── */

  private async products(user: AuthenticatedUser, q: SyncPullQueryDto) {
    this.need(user, [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.POS_USE], 'Products');
    const limit = Math.min(q.limit ?? SYNC_PAGE, SYNC_MAX_PAGE);
    const since = sinceOf(q.updatedSince);
    const changed: Prisma.ProductWhereInput[] = since
      ? [{ OR: [
        { updatedAt: { gt: since } },
        // Variant and pack edits do not touch the product row.
        { variants: { some: { updatedAt: { gt: since } } } },
        { units: { some: { updatedAt: { gt: since } } } },
      ] }]
      : [];
    const rows = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        ...(!since && { isActive: true }),
        AND: [...changed, ...(afterCursor(decodeCursor(q.cursor)) as Prisma.ProductWhereInput[])],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true, name: true, sku: true, barcode: true, unit: true, productType: true,
        price: true, costPrice: true, wholesalePrice: true, creditPrice: true, taxRate: true,
        stock: true, lowStockAlert: true, hasVariants: true, isRawMaterial: true, expiryTracked: true,
        isActive: true, isFeatured: true, categoryId: true, brandId: true, updatedAt: true,
        category: { select: { name: true, color: true } },
        brand: { select: { name: true } },
        images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, name: true, sku: true, barcode: true, color: true, size: true, unit: true,
            price: true, costPrice: true, wholesalePrice: true, creditPrice: true, stock: true, lowStockAlert: true, imageUrl: true,
          },
        },
        units: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, variantId: true, unitName: true, unitLabel: true, conversionRate: true, isBase: true, isDefault: true,
            price: true, costPrice: true, wholesalePrice: true, creditPrice: true, mrpPrice: true, barcode: true, sku: true,
          },
        },
      },
    });
    return {
      entity: 'products',
      serverTime: new Date().toISOString(),
      items: rows.map(({ category, brand, images, ...p }) => ({
        ...p,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
        brandName: brand?.name ?? null,
        imageUrl: images[0]?.url ?? null,
      })),
      nextCursor: nextCursor(rows, limit),
    };
  }

  /* ───────────── branch stock ───────────── */

  private async stock(user: AuthenticatedUser, q: SyncPullQueryDto) {
    this.need(user, [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.POS_USE], 'Stock');
    const limit = Math.min(q.limit ?? SYNC_PAGE, SYNC_MAX_PAGE);
    const since = sinceOf(q.updatedSince);
    const shopIds = await this.shopIds(user);
    const rows = await this.prisma.shopStock.findMany({
      where: {
        tenantId: user.tenantId,
        shopId: { in: shopIds },
        AND: [
          ...(since ? [{ updatedAt: { gt: since } }] : []),
          ...(afterCursor(decodeCursor(q.cursor)) as Prisma.ShopStockWhereInput[]),
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true, shopId: true, productId: true, variantId: true, stock: true, reserved: true,
        lowStockAlert: true, shopPrice: true, isActive: true, updatedAt: true,
      },
    });
    return {
      entity: 'stock',
      serverTime: new Date().toISOString(),
      items: rows.map((s) => ({ ...s, stock: r2(s.stock), reserved: r2(Math.max(s.reserved || 0, 0)) })),
      nextCursor: nextCursor(rows, limit),
    };
  }

  /* ───────────── customers ───────────── */

  private async customers(user: AuthenticatedUser, q: SyncPullQueryDto) {
    this.need(user, [PERMISSIONS.CUSTOMERS_VIEW], 'Customers');
    const tenantId = user.tenantId;
    const limit = Math.min(q.limit ?? SYNC_PAGE, SYNC_MAX_PAGE);
    const since = sinceOf(q.updatedSince);
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(!since && { isActive: true }),
        AND: [
          ...(since ? [{ updatedAt: { gt: since } }] : []),
          ...(afterCursor(decodeCursor(q.cursor)) as Prisma.CustomerWhereInput[]),
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true, name: true, businessName: true, phone: true, email: true, cnic: true, address: true, city: true, area: true,
        shopId: true, priceTier: true, priceListId: true, creditLimit: true, creditDays: true, balance: true,
        loyaltyPoints: true, totalSpent: true, isVip: true, isActive: true, updatedAt: true,
      },
    });
    const khata = this.can(user, PERMISSIONS.KHATA_VIEW);
    // Oldest unpaid credit (payments settle the oldest first), for overdue warnings offline.
    const owing = khata ? rows.filter((r) => r.balance > 0.005).map((r) => r.id) : [];
    const ledger = owing.length
      ? await this.prisma.customerLedger.findMany({ where: { tenantId, customerId: { in: owing } }, select: { customerId: true, amount: true, createdAt: true } })
      : [];
    const byCustomer = new Map<string, Array<{ amount: number; createdAt: Date }>>();
    for (const l of ledger) {
      const list = byCustomer.get(l.customerId);
      if (list) list.push(l);
      else byCustomer.set(l.customerId, [l]);
    }
    return {
      entity: 'customers',
      serverTime: new Date().toISOString(),
      items: rows.map((r) => (khata
        ? { ...r, oldestDueAt: byCustomer.has(r.id) ? openDebts(byCustomer.get(r.id)!)[0]?.at ?? null : null }
        : { ...r, balance: undefined, creditLimit: undefined, creditDays: undefined, oldestDueAt: undefined })),
      nextCursor: nextCursor(rows, limit),
    };
  }

  /* ───────────── recent sales ───────────── */

  private async sales(user: AuthenticatedUser, scope: ShopScope, q: SyncPullQueryDto) {
    this.need(user, [PERMISSIONS.SALES_VIEW], 'Sales');
    const limit = Math.min(q.limit ?? SYNC_PAGE, SYNC_MAX_PAGE);
    const since = sinceOf(q.updatedSince);
    const from = since ?? new Date(Date.now() - (q.days ?? 7) * 86_400_000);
    const shopFilter: Prisma.SaleWhereInput = !this.isOwner(user) && user.shopId
      ? { shopId: user.shopId }
      : scope.shopId ? { shopId: scope.shopId } : {};
    const rows = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...shopFilter,
        AND: [
          { updatedAt: { gt: from } },
          ...(afterCursor(decodeCursor(q.cursor)) as Prisma.SaleWhereInput[]),
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true, saleNumber: true, shopId: true, customerId: true, soldById: true, createdById: true,
        subtotal: true, discount: true, codeDiscount: true, loyaltyDiscount: true, serviceCharges: true, total: true,
        paidAmount: true, changeAmount: true, creditAmount: true, refundedAmount: true,
        paymentMethod: true, status: true, source: true, soldAt: true, updatedAt: true,
        customer: { select: { name: true, phone: true } },
        payments: { select: { method: true, amount: true, reference: true } },
        items: {
          select: {
            id: true, productId: true, quantity: true, returnedQty: true, price: true, total: true,
            unitName: true, unitQty: true, priceTier: true,
            product: { select: { name: true, unit: true } },
            variantLink: { select: { variantId: true, variant: { select: { name: true } } } },
          },
        },
      },
    });
    return {
      entity: 'sales',
      serverTime: new Date().toISOString(),
      items: rows.map(({ customer, items, ...s }) => ({
        ...s,
        customerName: customer?.name ?? null,
        customerPhone: customer?.phone ?? null,
        items: items.map(({ product, variantLink, ...it }) => ({
          ...it,
          name: product?.name ?? null,
          unit: product?.unit ?? null,
          variantId: variantLink?.variantId ?? null,
          variantName: variantLink?.variant?.name ?? null,
        })),
      })),
      nextCursor: nextCursor(rows, limit),
    };
  }

  /* ───────────── live ids (find rows deleted for good) ───────────── */

  private async ids(user: AuthenticatedUser, q: SyncPullQueryDto) {
    const of = q.of ?? 'products';
    const limit = Math.min(q.limit ?? SYNC_MAX_ID_PAGE, SYNC_MAX_ID_PAGE);
    const after = q.cursor ? { id: { gt: q.cursor } } : {};
    let ids: string[];
    if (of === 'customers') {
      this.need(user, [PERMISSIONS.CUSTOMERS_VIEW], 'Customers');
      ids = (await this.prisma.customer.findMany({
        where: { tenantId: user.tenantId, isActive: true, ...after }, orderBy: { id: 'asc' }, take: limit, select: { id: true },
      })).map((r) => r.id);
    } else {
      this.need(user, [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.POS_USE], 'Products');
      ids = (await this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: true, ...after }, orderBy: { id: 'asc' }, take: limit, select: { id: true },
      })).map((r) => r.id);
    }
    return {
      entity: 'ids',
      of,
      serverTime: new Date().toISOString(),
      items: ids,
      nextCursor: ids.length === limit ? ids[ids.length - 1] : null,
    };
  }
}
