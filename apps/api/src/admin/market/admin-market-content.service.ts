/**
 * Admin panel: Nafaa Market reviews moderation, Market customers, home
 * curation (banners, featured shops, sections), platform settings and
 * customer support tickets.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewType, SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_PLATFORM_CONFIG, GATE_DEFINITIONS, MARKET_CONFIG_KEY, MARKET_GATES, MarketGate, MarketPlatformConfig, isMarketGate, readPlatformConfig,
} from '../../marketplace/_shared/market-config';
import { MARKET_HOME_KEY, sanitizeHome } from '../../marketplace/_shared/market-home';
import { MarketSettingsService } from '../../marketplace/_shared/market-settings.service';
import { MarketplaceNotificationsService } from '../../marketplace/notifications/notifications.service';
import { lim, num, page, pages, round, text } from './admin-market.helpers';

const TICKET_STATUSES: SupportTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
const REVIEW_TYPES: ReviewType[] = ['PRODUCT', 'SHOP', 'RIDER', 'ORDER'];
const PAYMENT_KEYS = ['cod', 'jazzcash', 'easypaisa', 'card', 'bankTransfer'] as const;

@Injectable()
export class AdminMarketContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: MarketSettingsService,
    private readonly notifications: MarketplaceNotificationsService,
  ) {}

  // ─── Reviews ─────────────────────────────────────────────────────────────

  /** Review id → number of customer reports (reports are stored as REVIEW_REPORTED notifications). */
  private async reportCounts(): Promise<Map<string, number>> {
    const rows = await this.prisma.customerNotification.findMany({ where: { type: 'REVIEW_REPORTED' }, select: { data: true }, take: 5000, orderBy: { createdAt: 'desc' } });
    const out = new Map<string, number>();
    for (const r of rows) {
      const id = (r.data as Record<string, unknown> | null)?.reviewId;
      if (typeof id === 'string') out.set(id, (out.get(id) ?? 0) + 1);
    }
    return out;
  }

  async reviews(q: { search?: string; rating?: string; reported?: string; hidden?: string; shopId?: string; type?: string; page?: string; limit?: string }) {
    const p = page(q.page);
    const l = lim(q.limit);
    const and: Prisma.MarketplaceReviewWhereInput[] = [];
    const rating = Number(q.rating);
    if (rating >= 1 && rating <= 5) and.push({ rating });
    if (q.rating === 'low') and.push({ rating: { lte: 2 } });
    if (q.hidden === '1' || q.hidden === 'true') and.push({ isHidden: true });
    if (q.hidden === '0' || q.hidden === 'false') and.push({ isHidden: false });
    if (q.shopId) and.push({ shopId: text(q.shopId, 60) });
    if (REVIEW_TYPES.includes(q.type as ReviewType)) and.push({ reviewType: q.type as ReviewType });
    const search = text(q.search);
    if (search) and.push({ OR: [{ comment: { contains: search, mode: 'insensitive' } }, { title: { contains: search, mode: 'insensitive' } }, { customer: { fullName: { contains: search, mode: 'insensitive' } } }] });
    const reports = await this.reportCounts();
    if (q.reported === '1' || q.reported === 'true') and.push({ id: { in: [...reports.keys()] } });
    const where: Prisma.MarketplaceReviewWhereInput = { AND: and };
    const [rows, total, hiddenCount, lowCount] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * l, take: l,
        include: {
          customer: { select: { id: true, fullName: true } },
          shopProfile: { select: { shopId: true, publicName: true } },
          productProfile: { select: { productId: true, publicName: true } },
        },
      }),
      this.prisma.marketplaceReview.count({ where }),
      this.prisma.marketplaceReview.count({ where: { isHidden: true } }),
      this.prisma.marketplaceReview.count({ where: { rating: { lte: 2 }, isHidden: false } }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id, type: r.reviewType, rating: r.rating, title: r.title, comment: r.comment, imageUrls: r.imageUrls,
        hidden: r.isHidden, hiddenReason: r.hiddenReason, moderatedAt: r.moderatedAt, reply: r.replyFromShop, verified: r.isVerifiedPurchase,
        reports: reports.get(r.id) ?? 0, orderId: r.orderId, createdAt: r.createdAt,
        customer: { id: r.customer.id, name: r.customer.fullName },
        shop: r.shopProfile ? { shopId: r.shopProfile.shopId, name: r.shopProfile.publicName } : null,
        product: r.productProfile ? { productId: r.productProfile.productId, name: r.productProfile.publicName } : null,
      })),
      total, page: p, pages: pages(total, l),
      summary: { hidden: hiddenCount, low: lowCount, reported: reports.size },
    };
  }

  async setReviewHidden(id: string, b: { hidden?: unknown; reason?: unknown }, adminId: string) {
    const r = await this.prisma.marketplaceReview.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Review not found');
    const hidden = b.hidden === true;
    await this.prisma.$transaction(async (tx) => {
      await tx.marketplaceReview.update({
        where: { id },
        data: { isHidden: hidden, hiddenReason: hidden ? text(b.reason, 300) || 'Hidden by Nafaa' : null, moderatedBy: adminId, moderatedAt: new Date() },
      });
      // Keep the denormalized ratings in step, the same way customer edits do.
      if (r.reviewType === 'PRODUCT' && r.productId) {
        const agg = await tx.marketplaceReview.aggregate({ where: { productId: r.productId, reviewType: 'PRODUCT', isApproved: true, isHidden: false }, _avg: { rating: true }, _count: { rating: true } });
        await tx.productMarketplaceProfile.updateMany({ where: { productId: r.productId }, data: { ratingAverage: agg._avg.rating ?? 0, ratingCount: agg._count.rating } });
      }
      if (r.reviewType === 'SHOP' && r.shopId) {
        const agg = await tx.marketplaceReview.aggregate({ where: { shopId: r.shopId, reviewType: 'SHOP', isApproved: true, isHidden: false }, _avg: { rating: true }, _count: { rating: true } });
        await tx.shopMarketplaceProfile.updateMany({ where: { shopId: r.shopId }, data: { ratingAverage: agg._avg.rating ?? 0, ratingCount: agg._count.rating } });
      }
    });
    return { id, hidden };
  }

  // ─── Customers ───────────────────────────────────────────────────────────

  async customers(q: { search?: string; city?: string; blocked?: string; page?: string; limit?: string }) {
    const p = page(q.page);
    const l = lim(q.limit);
    const and: Prisma.MarketplaceCustomerWhereInput[] = [];
    const search = text(q.search);
    if (search) and.push({ OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }] });
    const city = text(q.city);
    if (city) and.push({ OR: [{ lastKnownCity: { equals: city, mode: 'insensitive' } }, { addresses: { some: { city: { equals: city, mode: 'insensitive' } } } }] });
    if (q.blocked === '1' || q.blocked === 'true') and.push({ isBanned: true });
    const where: Prisma.MarketplaceCustomerWhereInput = { AND: and };
    const [rows, total, all, blocked] = await Promise.all([
      this.prisma.marketplaceCustomer.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * l, take: l,
        select: { id: true, fullName: true, phone: true, email: true, lastKnownCity: true, isBanned: true, createdAt: true, lastActiveAt: true, walletBalance: true, loyaltyPoints: true },
      }),
      this.prisma.marketplaceCustomer.count({ where }),
      this.prisma.marketplaceCustomer.count(),
      this.prisma.marketplaceCustomer.count({ where: { isBanned: true } }),
    ]);
    const ids = rows.map((r) => r.id);
    const [counts, spent] = ids.length ? await Promise.all([
      this.prisma.marketplaceOrder.groupBy({ by: ['customerId'], where: { customerId: { in: ids } }, _count: { _all: true }, _max: { createdAt: true } }),
      this.prisma.marketplaceOrder.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: 'DELIVERED' }, _sum: { total: true } }),
    ]) : [[], []];
    return {
      items: rows.map((r) => {
        const c = counts.find((x) => x.customerId === r.id);
        return {
          id: r.id, name: r.fullName, phone: r.phone, email: r.email, city: r.lastKnownCity, blocked: r.isBanned,
          createdAt: r.createdAt, lastActiveAt: r.lastActiveAt, wallet: num(r.walletBalance), points: r.loyaltyPoints,
          orders: c?._count._all ?? 0, lastOrderAt: c?._max.createdAt ?? null,
          spent: round(num(spent.find((x) => x.customerId === r.id)?._sum.total)),
        };
      }),
      total, page: p, pages: pages(total, l),
      summary: { total: all, blocked },
    };
  }

  async customer(id: string) {
    const c = await this.prisma.marketplaceCustomer.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, phone: true, phoneVerified: true, email: true, emailVerified: true, language: true, lastKnownCity: true,
        walletBalance: true, loyaltyPoints: true, referralCode: true, isActive: true, isBanned: true, banReason: true, bannedAt: true,
        authProvider: true, createdAt: true, lastLoginAt: true, lastActiveAt: true,
        addresses: { select: { id: true, label: true, addressLine1: true, city: true, phone: true }, take: 10 },
      },
    });
    if (!c) throw new NotFoundException('Customer not found');
    const [orders, byStatus, spent, tickets, reviews] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { customerId: id }, orderBy: { createdAt: 'desc' }, take: 20,
        select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, shop: { select: { name: true, marketplaceProfile: { select: { publicName: true } } } } },
      }),
      this.prisma.marketplaceOrder.groupBy({ by: ['status'], where: { customerId: id }, _count: { _all: true } }),
      this.prisma.marketplaceOrder.aggregate({ where: { customerId: id, status: 'DELIVERED' }, _sum: { total: true } }),
      this.prisma.supportTicket.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, ticketNumber: true, subject: true, status: true, createdAt: true } }),
      this.prisma.marketplaceReview.count({ where: { customerId: id } }),
    ]);
    const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      ...c, name: c.fullName, wallet: num(c.walletBalance), blocked: c.isBanned,
      stats: {
        orders: byStatus.reduce((s, b) => s + b._count._all, 0), delivered: count('DELIVERED'), cancelled: count('CANCELLED') + count('REFUNDED'),
        spent: round(num(spent._sum.total)), reviews,
      },
      orders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, total: num(o.total), createdAt: o.createdAt, shop: o.shop.marketplaceProfile?.publicName ?? o.shop.name })),
      tickets,
    };
  }

  async setCustomerBlocked(id: string, b: { blocked?: unknown; reason?: unknown }) {
    const c = await this.prisma.marketplaceCustomer.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer not found');
    const blocked = b.blocked === true;
    // The customer guard checks isBanned on every request, so a block takes effect at once.
    await this.prisma.marketplaceCustomer.update({
      where: { id },
      data: blocked ? { isBanned: true, banReason: text(b.reason, 300) || 'Blocked by Nafaa', bannedAt: new Date() } : { isBanned: false, banReason: null, bannedAt: null },
    });
    return this.customer(id);
  }

  // ─── Home curation ───────────────────────────────────────────────────────

  async home() {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKET_HOME_KEY }, select: { value: true, updatedAt: true } });
    let raw: unknown = {};
    try { raw = row?.value ? JSON.parse(row.value) : {}; } catch { raw = {}; }
    const home = sanitizeHome(raw);
    const shopIds = [...new Set([...home.featuredShopIds, ...home.sections.flatMap((s) => s.shopIds ?? [])])];
    const productIds = [...new Set(home.sections.flatMap((s) => s.productIds ?? []))];
    const [shops, products] = await Promise.all([
      shopIds.length ? this.prisma.shopMarketplaceProfile.findMany({ where: { shopId: { in: shopIds } }, select: { shopId: true, publicName: true, city: true, logoUrl: true, isListedOnMarketplace: true } }) : [],
      productIds.length ? this.prisma.productMarketplaceProfile.findMany({ where: { productId: { in: productIds } }, select: { productId: true, publicName: true, publicImages: true, shop: { select: { name: true } } } }) : [],
    ]);
    return {
      ...home,
      updatedAt: row?.updatedAt ?? null,
      shops: shops.map((s) => ({ shopId: s.shopId, name: s.publicName, city: s.city, logoUrl: s.logoUrl, listed: s.isListedOnMarketplace })),
      products: products.map((p) => ({ productId: p.productId, name: p.publicName, imageUrl: p.publicImages[0] ?? null, shop: p.shop.name })),
      gates: this.gateCatalogue(),
    };
  }

  async saveHome(body: unknown, adminId: string) {
    const home = sanitizeHome(body);
    const value = JSON.stringify(home);
    await this.prisma.systemSetting.upsert({
      where: { key: MARKET_HOME_KEY },
      create: { key: MARKET_HOME_KEY, value, category: 'marketplace', description: 'Nafaa Market home: banners, featured shops, sections', updatedById: adminId },
      update: { value, updatedById: adminId },
    });
    this.settings.clearCache();
    return this.home();
  }

  /** Listed products for the section picker. */
  async searchProducts(q: { search?: string; shopId?: string }) {
    const search = text(q.search);
    const rows = await this.prisma.productMarketplaceProfile.findMany({
      where: {
        isListedOnMarketplace: true,
        ...(q.shopId ? { shopId: text(q.shopId, 60) } : {}),
        ...(search ? { publicName: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { totalSold: 'desc' }, take: 20,
      select: { productId: true, publicName: true, publicImages: true, publicPrice: true, shop: { select: { name: true } } },
    });
    return rows.map((p) => ({ productId: p.productId, name: p.publicName, imageUrl: p.publicImages[0] ?? null, price: num(p.publicPrice), shop: p.shop.name }));
  }

  // ─── Platform settings ───────────────────────────────────────────────────

  private gateCatalogue() {
    return MARKET_GATES.map((id) => {
      const g = GATE_DEFINITIONS[id];
      return { id, label: g.label, tagline: g.tagline, mode: g.mode, businessOnly: !!g.businessOnly };
    });
  }

  async getSettings() {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKET_CONFIG_KEY }, select: { value: true, updatedAt: true } });
    const cities = await this.prisma.shopMarketplaceProfile.groupBy({ by: ['city'], where: { isListedOnMarketplace: true }, _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 30 });
    return {
      config: readPlatformConfig(row?.value),
      defaults: DEFAULT_PLATFORM_CONFIG,
      gates: this.gateCatalogue(),
      shopCities: cities.filter((c) => c.city?.trim()).map((c) => ({ city: c.city, shops: c._count._all })),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async saveSettings(body: unknown, adminId: string) {
    const v = body && typeof body === 'object' ? (body as Record<string, any>) : {};
    const before = await this.settings.platform();
    const gates = Array.isArray(v.gates) ? [...new Set(v.gates.filter(isMarketGate))] as MarketGate[] : before.gates;
    if (!gates.length) throw new BadRequestException('Keep at least one section visible');
    const pct = v.commissionPercent === undefined ? before.commissionPercent : Number(v.commissionPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) throw new BadRequestException('Commission must be between 0 and 50 percent');
    const pay = v.payments && typeof v.payments === 'object' ? v.payments : before.payments;
    const payments = Object.fromEntries(PAYMENT_KEYS.map((k) => [k, pay[k] === true])) as MarketPlatformConfig['payments'];
    if (!PAYMENT_KEYS.some((k) => payments[k])) throw new BadRequestException('Keep at least one payment method on');
    const labels: MarketPlatformConfig['labels'] = {};
    const rawLabels = v.labels && typeof v.labels === 'object' ? v.labels : {};
    for (const g of MARKET_GATES) {
      const l = rawLabels[g];
      if (!l || typeof l !== 'object') continue;
      const clean = Object.fromEntries((['en', 'roman', 'ur'] as const).map((k) => [k, text(l[k], 40)]).filter(([, s]) => s));
      if (Object.keys(clean).length) labels[g] = clean;
    }
    const launchCities = Array.isArray(v.launchCities)
      ? [...new Set(v.launchCities.map((c: unknown) => text(c, 60)).filter(Boolean))].slice(0, 100) as string[]
      : before.launchCities;
    const next: MarketPlatformConfig = {
      gates, labels, launchCities, commissionPercent: Math.round(pct * 100) / 100, payments,
      requireApproval: v.requireApproval === undefined ? before.requireApproval : v.requireApproval === true,
      walletSpend: v.walletSpend === undefined ? before.walletSpend : v.walletSpend === true,
      loyaltySpend: v.loyaltySpend === undefined ? before.loyaltySpend : v.loyaltySpend === true,
    };
    // Turning approval on must not hide shops that are already live: approve them as they are.
    let approvedExisting = 0;
    if (next.requireApproval && !before.requireApproval) {
      const res = await this.prisma.shopMarketplaceProfile.updateMany({
        where: { isListedOnMarketplace: true, verifiedAt: null },
        data: { verifiedAt: new Date(), verifiedBy: adminId },
      });
      approvedExisting = res.count;
    }
    const value = JSON.stringify(next);
    await this.prisma.systemSetting.upsert({
      where: { key: MARKET_CONFIG_KEY },
      create: { key: MARKET_CONFIG_KEY, value, category: 'marketplace', description: 'Nafaa Market platform settings', updatedById: adminId },
      update: { value, updatedById: adminId },
    });
    this.settings.clearCache();
    return { ...(await this.getSettings()), approvedExisting };
  }

  // ─── Support tickets ─────────────────────────────────────────────────────

  async tickets(q: { search?: string; status?: string; priority?: string; page?: string; limit?: string }) {
    const p = page(q.page);
    const l = lim(q.limit);
    const and: Prisma.SupportTicketWhereInput[] = [];
    if (q.status === 'ACTIVE') and.push({ status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } });
    else if (TICKET_STATUSES.includes(q.status as SupportTicketStatus)) and.push({ status: q.status as SupportTicketStatus });
    if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(String(q.priority))) and.push({ priority: q.priority as any });
    const search = text(q.search);
    if (search) and.push({ OR: [{ ticketNumber: { contains: search, mode: 'insensitive' } }, { subject: { contains: search, mode: 'insensitive' } }, { customer: { fullName: { contains: search, mode: 'insensitive' } } }, { customer: { phone: { contains: search } } }] });
    const where: Prisma.SupportTicketWhereInput = { AND: and };
    const [rows, total, statusCounts] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, orderBy: [{ updatedAt: 'desc' }], skip: (p - 1) * l, take: l,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { message: true, senderType: true, createdAt: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])) as Record<string, number>;
    return {
      items: rows.map((t) => ({
        id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
        orderId: t.orderId, shopId: t.shopId, createdAt: t.createdAt, updatedAt: t.updatedAt, messages: t._count.messages,
        last: t.messages[0] ? { text: t.messages[0].message.slice(0, 140), from: t.messages[0].senderType, at: t.messages[0].createdAt } : null,
        customer: { id: t.customer.id, name: t.customer.fullName, phone: t.customer.phone },
      })),
      total, page: p, pages: pages(total, l),
      summary: { open: counts.OPEN ?? 0, inProgress: counts.IN_PROGRESS ?? 0, waiting: counts.WAITING_CUSTOMER ?? 0, resolved: (counts.RESOLVED ?? 0) + (counts.CLOSED ?? 0) },
    };
  }

  async ticket(id: string) {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { customer: { select: { id: true, fullName: true, phone: true, email: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!t) throw new NotFoundException('Ticket not found');
    const [order, shop] = await Promise.all([
      t.orderId ? this.prisma.marketplaceOrder.findUnique({ where: { id: t.orderId }, select: { id: true, orderNumber: true, status: true, total: true } }) : null,
      t.shopId ? this.prisma.shopMarketplaceProfile.findUnique({ where: { shopId: t.shopId }, select: { shopId: true, publicName: true, city: true } }) : null,
    ]);
    return {
      id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
      assignedTo: t.assignedTo, rating: t.rating, createdAt: t.createdAt, updatedAt: t.updatedAt, resolvedAt: t.resolvedAt, closedAt: t.closedAt,
      customer: { id: t.customer.id, name: t.customer.fullName, phone: t.customer.phone, email: t.customer.email },
      order: order ? { ...order, total: num(order.total) } : null,
      shop: shop ? { shopId: shop.shopId, name: shop.publicName, city: shop.city } : null,
      messages: t.messages.map((m) => ({ id: m.id, from: m.senderType, text: m.message, attachments: m.attachments, internal: m.isInternal, at: m.createdAt })),
    };
  }

  async replyTicket(id: string, b: { text?: unknown; internal?: unknown }, adminId: string) {
    const body = text(b.text, 4000);
    if (!body) throw new BadRequestException('Write a reply');
    const t = await this.prisma.supportTicket.findUnique({ where: { id }, select: { id: true, ticketNumber: true, customerId: true, status: true } });
    if (!t) throw new NotFoundException('Ticket not found');
    const internal = b.internal === true;
    await this.prisma.$transaction([
      this.prisma.supportMessage.create({ data: { ticketId: id, senderType: 'STAFF', senderId: adminId, message: body, isInternal: internal } }),
      this.prisma.supportTicket.update({
        where: { id },
        data: { assignedTo: adminId, ...(!internal && t.status !== 'CLOSED' && { status: 'WAITING_CUSTOMER' as SupportTicketStatus }) },
      }),
    ]);
    if (!internal) {
      await this.notifications.create({
        customerId: t.customerId, type: 'SUPPORT', title: 'Nafaa support ka jawab',
        body: `Ticket #${t.ticketNumber}: ${body.slice(0, 120)}`, actionUrl: `/support/${id}`, data: { ticketId: id },
      }).catch(() => null);
    }
    return this.ticket(id);
  }

  async setTicketStatus(id: string, b: { status?: unknown; priority?: unknown }) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id }, select: { id: true } });
    if (!t) throw new NotFoundException('Ticket not found');
    const data: Prisma.SupportTicketUpdateInput = {};
    if (b.status !== undefined) {
      if (!TICKET_STATUSES.includes(b.status as SupportTicketStatus)) throw new BadRequestException('Unknown status');
      const status = b.status as SupportTicketStatus;
      data.status = status;
      if (status === 'RESOLVED') data.resolvedAt = new Date();
      if (status === 'CLOSED') data.closedAt = new Date();
    }
    if (b.priority !== undefined) {
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(String(b.priority))) throw new BadRequestException('Unknown priority');
      data.priority = b.priority as any;
    }
    await this.prisma.supportTicket.update({ where: { id }, data });
    return this.ticket(id);
  }
}
