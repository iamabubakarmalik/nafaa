/**
 * Loyalty for online customers, on top of the counter's loyalty program
 * (Customer.loyaltyPoints, LoyaltyTransaction, the same rate and settings).
 *
 * - With online loyalty on, online bills earn nothing when they are made; the
 *   points come when the order is DELIVERED and are added to the bill's
 *   loyaltyEarned, so a later void or return takes them back as at the counter.
 * - Each customer can have a referral code. A friend's order linked to it (by
 *   the discount code on the order or by hand) gives the referrer points once
 *   the friend's order is delivered.
 *
 * Every write is scoped to the caller's business: customers and orders are
 * looked up with the tenant id, points move with atomic increments, and an
 * order can earn each kind of points only once (unique per order and kind).
 */

import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { phoneKey } from '../customer-risk';
import { OrderStatusEvent, orderEvents } from '../order-events';
import { normalizeCode } from './affiliate-math';
import { RetentionSettings, readRetention } from './retention-settings';

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The friend's discount for an order of this value. */
export function friendDiscountFor(s: RetentionSettings['referral'], orderValue: number): number {
  const v = Math.max(0, Number(orderValue) || 0);
  const d = s.friendDiscountType === 'FIXED' ? s.friendDiscount : (v * s.friendDiscount) / 100;
  return Math.round(Math.min(v, Math.max(0, d)));
}

/** Points for an online order: the online rate if set, else the counter's. */
export function onlinePoints(total: number, onlineRate: number | null, counterRate: number): number {
  const rate = onlineRate ?? counterRate;
  return Math.max(0, Math.floor((Number(total) || 0) * (Number(rate) || 0)));
}

/** NAME + 4 digits, e.g. "AYESHA4821". */
export function referralCodeFrom(name: string): string {
  const head = String(name ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'NAFAA';
  return `${head}${crypto.randomInt(1000, 10000)}`;
}

@Injectable()
export class OnlineLoyaltyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnlineLoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly onStatus = (e: OrderStatusEvent) => {
    if (e.status !== 'DELIVERED' && e.status !== 'RETURNED') return;
    const run = e.status === 'DELIVERED' ? this.onDelivered(e.tenantId, e.orderId) : this.onReturned(e.tenantId, e.orderId);
    run.catch((err) => this.logger.warn(`Online loyalty ${e.status} ${e.orderId}: ${errText(err)}`));
  };

  onModuleInit() { orderEvents.on('status', this.onStatus); }
  onModuleDestroy() { orderEvents.off('status', this.onStatus); }

  private async order(tenantId: string, id: string) {
    return this.prisma.channelOrder.findFirst({
      where: { id, tenantId },
      select: {
        id: true, tenantId: true, shopId: true, orderStatus: true, total: true, customerName: true, customerPhone: true, nafaaSaleId: true,
        externalOrderNumber: true, externalOrderId: true, metadata: true, discountCodes: true,
      },
    });
  }

  /** The counter customer behind an online order: the bill's customer, else the same phone in this business. */
  private async customerOf(tenantId: string, o: { nafaaSaleId: string | null; customerPhone: string | null }) {
    if (o.nafaaSaleId) {
      const sale = await this.prisma.sale.findFirst({ where: { id: o.nafaaSaleId, tenantId }, select: { customerId: true } });
      if (sale?.customerId) return sale.customerId;
    }
    const phone = String(o.customerPhone ?? '').replace(/[^\d+]/g, '');
    if (phone.length < 7) return null;
    const c = await this.prisma.customer.findFirst({ where: { tenantId, phone }, select: { id: true } });
    return c?.id ?? null;
  }

  /** Adds points in one transaction: balance, history row, and the bill's loyaltyEarned when a bill is given. */
  private async addPoints(tenantId: string, customerId: string, points: number, ref: { reference: string; note: string; shopId?: string | null; saleId?: string | null; addToSale?: boolean }) {
    if (!Number.isInteger(points) || points < 1) return;
    await this.prisma.$transaction(async (tx) => {
      const { loyaltyPoints } = await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: points } }, select: { loyaltyPoints: true } });
      await tx.loyaltyTransaction.create({
        data: {
          tenantId, customerId, type: 'EARNED', points, balanceAfter: loyaltyPoints,
          reference: ref.reference.slice(0, 100), note: ref.note.slice(0, 200), shopId: ref.shopId ?? null, saleId: ref.saleId ?? null,
        },
      });
      if (ref.addToSale && ref.saleId) await tx.sale.update({ where: { id: ref.saleId }, data: { loyaltyEarned: { increment: points } } });
    });
  }

  /** Takes points back, never below zero. */
  private async takePoints(tenantId: string, customerId: string, points: number, ref: { reference: string; note: string }) {
    if (!(points > 0)) return;
    await this.prisma.$transaction(async (tx) => {
      const c = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { loyaltyPoints: true } });
      if (!c) return;
      const back = Math.min(points, c.loyaltyPoints);
      if (back <= 0) return;
      const done = await tx.customer.updateMany({ where: { id: customerId, loyaltyPoints: { gte: back } }, data: { loyaltyPoints: { decrement: back } } });
      if (!done.count) return;
      const { loyaltyPoints } = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { loyaltyPoints: true } });
      await tx.loyaltyTransaction.create({
        data: { tenantId, customerId, type: 'ADJUSTMENT', points: -back, balanceAfter: loyaltyPoints, reference: ref.reference.slice(0, 100), note: ref.note.slice(0, 200) },
      });
    });
  }

  async onDelivered(tenantId: string, orderId: string) {
    const [o, settings, counter] = await Promise.all([
      this.order(tenantId, orderId),
      readRetention(this.prisma, tenantId),
      this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { enableLoyalty: true, loyaltyPointsPerRupee: true } }),
    ]);
    if (!o || o.orderStatus !== 'DELIVERED' || (o.metadata as any)?.test) return;
    if (settings.loyalty.enabled && counter?.enableLoyalty) await this.earn(o, settings, counter.loyaltyPointsPerRupee);
    if (settings.referral.enabled && counter?.enableLoyalty) {
      await this.autoLinkReferral(o, settings);
      await this.awardReferral(tenantId, o.id);
    }
  }

  private async earn(o: NonNullable<Awaited<ReturnType<OnlineLoyaltyService['order']>>>, settings: RetentionSettings, counterRate: number) {
    const sale = o.nafaaSaleId
      ? await this.prisma.sale.findFirst({ where: { id: o.nafaaSaleId, tenantId: o.tenantId }, select: { id: true, total: true, loyaltyEarned: true, customerId: true, shopId: true, status: true } })
      : null;
    // Points already given when the bill was made (online loyalty was off then).
    if (sale && Number(sale.loyaltyEarned) > 0) return;
    if (sale?.status === 'VOIDED') return;
    const customerId = sale?.customerId ?? (await this.customerOf(o.tenantId, o));
    if (!customerId) return;
    const points = onlinePoints(sale ? Number(sale.total) : Number(o.total), settings.loyalty.pointsPerRupee, counterRate);
    if (points < 1) return;
    // Claim first: the unique (order, kind) row stops a second event giving points again.
    try {
      await this.prisma.onlineLoyaltyEntry.create({ data: { tenantId: o.tenantId, channelOrderId: o.id, kind: 'EARN', customerId, points, status: 'DONE' } });
    } catch {
      return;
    }
    await this.addPoints(o.tenantId, customerId, points, {
      reference: `#${orderNo(o)}`, note: 'Online order deliver', shopId: sale?.shopId ?? o.shopId, saleId: sale?.id ?? null, addToSale: !!sale,
    });
  }

  /** A referral code typed as the discount code on the order links it on its own. */
  private async autoLinkReferral(o: { id: string; tenantId: string; discountCodes: string[] | null }, settings: RetentionSettings) {
    const codes = (o.discountCodes ?? []).map(normalizeCode).filter(Boolean);
    if (!codes.length) return;
    const has = await this.prisma.onlineLoyaltyEntry.findUnique({ where: { channelOrderId_kind: { channelOrderId: o.id, kind: 'REFERRAL' } } });
    if (has) return;
    const ref = await this.prisma.customerReferral.findFirst({ where: { tenantId: o.tenantId, code: { in: codes } } });
    if (!ref) return;
    await this.linkReferral(o.tenantId, o.id, ref.code, settings, null).catch(() => null);
  }

  private async awardReferral(tenantId: string, orderId: string) {
    const e = await this.prisma.onlineLoyaltyEntry.findUnique({ where: { channelOrderId_kind: { channelOrderId: orderId, kind: 'REFERRAL' } } });
    if (!e || e.tenantId !== tenantId || e.status !== 'PENDING') return;
    // Only one caller can move it from PENDING to DONE.
    const claim = await this.prisma.onlineLoyaltyEntry.updateMany({ where: { id: e.id, status: 'PENDING' }, data: { status: 'DONE' } });
    if (!claim.count) return;
    const o = await this.order(tenantId, orderId);
    await this.addPoints(tenantId, e.customerId, e.points, {
      reference: o ? `#${orderNo(o)}` : 'Referral', note: `Referral: ${o?.customerName ?? 'dost'} ka order deliver`,
    });
  }

  async onReturned(tenantId: string, orderId: string) {
    const entries = await this.prisma.onlineLoyaltyEntry.findMany({ where: { tenantId, channelOrderId: orderId, status: { in: ['DONE', 'PENDING'] } } });
    for (const e of entries) {
      const claim = await this.prisma.onlineLoyaltyEntry.updateMany({ where: { id: e.id, status: e.status }, data: { status: e.status === 'DONE' ? 'REVERSED' : 'CANCELLED' } });
      if (!claim.count) continue;
      // EARN points sit on the bill, and voiding the bill takes them back; referral points are taken back here.
      if (e.kind === 'REFERRAL' && e.status === 'DONE') await this.takePoints(tenantId, e.customerId, e.points, { reference: 'Referral', note: 'Dost ka parcel wapas — referral points wapas' });
    }
  }

  // ─── referral codes ───────────────────────────────────────────

  async codeFor(user: AuthenticatedUser, customerId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, loyaltyPoints: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    const have = await this.prisma.customerReferral.findUnique({ where: { tenantId_customerId: { tenantId: user.tenantId, customerId: c.id } } });
    if (have) return { ...have, customer: c };
    for (let i = 0; i < 5; i++) {
      try {
        const made = await this.prisma.customerReferral.create({ data: { tenantId: user.tenantId, customerId: c.id, code: referralCodeFrom(c.name) } });
        return { ...made, customer: c };
      } catch {
        const again = await this.prisma.customerReferral.findUnique({ where: { tenantId_customerId: { tenantId: user.tenantId, customerId: c.id } } });
        if (again) return { ...again, customer: c };
      }
    }
    throw new BadRequestException('Code nahi bana — dobara koshish karein');
  }

  /** Counter customers (with phone) for the referral desk, with their code and points. */
  async customers(user: AuthenticatedUser, q: { search?: string }) {
    const term = String(q.search ?? '').trim();
    const digits = term.replace(/\D/g, '');
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId: user.tenantId, isActive: true, phone: { not: null },
        ...(term && { OR: [{ name: { contains: term, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] }),
      },
      select: { id: true, name: true, phone: true, loyaltyPoints: true },
      orderBy: term ? { name: 'asc' } : { loyaltyPoints: 'desc' },
      take: 30,
    });
    const codes = await this.prisma.customerReferral.findMany({ where: { tenantId: user.tenantId, customerId: { in: rows.map((r) => r.id) } }, select: { customerId: true, code: true } });
    const byId = new Map(codes.map((c) => [c.customerId, c.code]));
    return rows.map((r) => ({ ...r, code: byId.get(r.id) ?? null }));
  }

  async lookup(user: AuthenticatedUser, code: string, orderValue?: number) {
    const settings = await readRetention(this.prisma, user.tenantId);
    const ref = await this.prisma.customerReferral.findFirst({ where: { tenantId: user.tenantId, code: normalizeCode(code) } });
    if (!ref) throw new NotFoundException('Ye referral code nahi mila');
    const c = await this.prisma.customer.findFirst({ where: { id: ref.customerId, tenantId: user.tenantId }, select: { name: true, phone: true } });
    return {
      code: ref.code, referrer: c?.name ?? '', referrerPhone: c?.phone ?? null,
      discount: friendDiscountFor(settings.referral, orderValue ?? 0), discountType: settings.referral.friendDiscountType,
      discountValue: settings.referral.friendDiscount, referrerPoints: settings.referral.referrerPoints, enabled: settings.referral.enabled,
    };
  }

  /** Links a friend's order to a referral code (by hand or from the discount code). */
  private async linkReferral(tenantId: string, orderId: string, rawCode: string, settings: RetentionSettings, byUserId: string | null) {
    if (!settings.referral.enabled) throw new BadRequestException('Referral band hai — pehle settings me ON karein');
    const o = await this.order(tenantId, orderId);
    if (!o) throw new NotFoundException('Order nahi mila');
    if (['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus)) throw new BadRequestException('Band order par referral nahi lagta');
    const ref = await this.prisma.customerReferral.findFirst({ where: { tenantId, code: normalizeCode(rawCode) } });
    if (!ref) throw new NotFoundException('Ye referral code nahi mila');
    const referrer = await this.prisma.customer.findFirst({ where: { id: ref.customerId, tenantId }, select: { id: true, phone: true } });
    if (!referrer) throw new NotFoundException('Code wala customer nahi mila');
    const friendKey = phoneKey(o.customerPhone);
    if (!friendKey) throw new BadRequestException('Order par phone number nahi');
    if (phoneKey(referrer.phone) === friendKey) throw new BadRequestException('Apne hi code se referral nahi hota');
    if (settings.referral.newOnly) {
      const earlier = await this.prisma.channelOrder.findMany({
        where: { tenantId, id: { not: o.id }, orderStatus: 'DELIVERED', customerPhone: { not: null } },
        select: { customerPhone: true },
        take: 50_000,
      });
      if (earlier.some((x) => phoneKey(x.customerPhone) === friendKey)) throw new BadRequestException('Ye customer pehle bhi le chuka hai — referral sirf naye customer ka');
    }
    const value = Number(o.total) || 0;
    try {
      return await this.prisma.onlineLoyaltyEntry.create({
        data: {
          tenantId, channelOrderId: o.id, kind: 'REFERRAL', customerId: referrer.id, referralId: ref.id, friendPhoneKey: friendKey,
          points: settings.referral.referrerPoints, discount: friendDiscountFor(settings.referral, value), status: 'PENDING', createdById: byUserId,
        },
      });
    } catch {
      throw new BadRequestException('Is order par pehle se referral laga hai');
    }
  }

  async link(user: AuthenticatedUser, body: { orderId?: string; code?: string }) {
    if (!body?.orderId || !body?.code) throw new BadRequestException('Order aur code dono chahiye');
    const settings = await readRetention(this.prisma, user.tenantId);
    const entry = await this.linkReferral(user.tenantId, String(body.orderId), String(body.code), settings, user.id);
    const o = await this.order(user.tenantId, entry.channelOrderId);
    if (o?.orderStatus === 'DELIVERED') await this.awardReferral(user.tenantId, o.id);
    return this.prisma.onlineLoyaltyEntry.findUnique({ where: { id: entry.id } });
  }

  async unlink(user: AuthenticatedUser, entryId: string) {
    const done = await this.prisma.onlineLoyaltyEntry.updateMany({ where: { id: entryId, tenantId: user.tenantId, kind: 'REFERRAL', status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (!done.count) throw new BadRequestException('Sirf baqi (deliver se pehle) referral hataya ja sakta hai');
    return { ok: true };
  }

  /** Online loyalty overview: points given, referrals and the top referrers. */
  async overview(user: AuthenticatedUser, days = 90) {
    const since = new Date(Date.now() - Math.min(Math.max(days, 1), 730) * 86_400_000);
    const [settings, counter, entries] = await Promise.all([
      readRetention(this.prisma, user.tenantId),
      this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { enableLoyalty: true, loyaltyPointsPerRupee: true, loyaltyRedemptionRate: true } }),
      this.prisma.onlineLoyaltyEntry.findMany({ where: { tenantId: user.tenantId, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 2000 }),
    ]);
    const custIds = [...new Set(entries.map((e) => e.customerId))];
    const orderIds = [...new Set(entries.map((e) => e.channelOrderId))];
    const [custs, orders, codes] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId: user.tenantId, id: { in: custIds } }, select: { id: true, name: true, phone: true, loyaltyPoints: true } }),
      this.prisma.channelOrder.findMany({ where: { tenantId: user.tenantId, id: { in: orderIds } }, select: { id: true, customerName: true, total: true, orderStatus: true, externalOrderNumber: true, externalOrderId: true } }),
      this.prisma.customerReferral.count({ where: { tenantId: user.tenantId } }),
    ]);
    const cById = new Map(custs.map((c) => [c.id, c]));
    const oById = new Map(orders.map((o) => [o.id, o]));
    const earned = entries.filter((e) => e.kind === 'EARN' && e.status === 'DONE');
    const refs = entries.filter((e) => e.kind === 'REFERRAL');
    const top = new Map<string, { customerId: string; name: string; phone: string | null; friends: number; points: number; sales: number }>();
    for (const e of refs.filter((x) => x.status === 'DONE')) {
      const c = cById.get(e.customerId);
      const t = top.get(e.customerId) ?? { customerId: e.customerId, name: c?.name ?? '', phone: c?.phone ?? null, friends: 0, points: 0, sales: 0 };
      t.friends++;
      t.points += e.points;
      t.sales += Number(oById.get(e.channelOrderId)?.total ?? 0);
      top.set(e.customerId, t);
    }
    return {
      settings,
      counter: { enabled: !!counter?.enableLoyalty, pointsPerRupee: counter?.loyaltyPointsPerRupee ?? 0, redemptionRate: counter?.loyaltyRedemptionRate ?? 1 },
      stats: {
        pointsGiven: earned.reduce((s, e) => s + e.points, 0) + refs.filter((e) => e.status === 'DONE').reduce((s, e) => s + e.points, 0),
        ordersEarned: earned.length,
        referrals: refs.filter((e) => e.status !== 'CANCELLED').length,
        referralsDone: refs.filter((e) => e.status === 'DONE').length,
        referralsPending: refs.filter((e) => e.status === 'PENDING').length,
        referralSales: Math.round(refs.filter((e) => e.status === 'DONE').reduce((s, e) => s + Number(oById.get(e.channelOrderId)?.total ?? 0), 0)),
        codes,
      },
      topReferrers: [...top.values()].sort((a, b) => b.friends - a.friends || b.sales - a.sales).slice(0, 10),
      entries: entries.slice(0, 100).map((e) => {
        const o = oById.get(e.channelOrderId);
        return {
          id: e.id, kind: e.kind, status: e.status, points: e.points, discount: e.discount, createdAt: e.createdAt, orderId: e.channelOrderId,
          orderNo: o ? orderNo(o) : null, friend: o?.customerName ?? null, orderStatus: o?.orderStatus ?? null, total: o ? Number(o.total) : null,
          customer: cById.get(e.customerId)?.name ?? null,
        };
      }),
      days,
    };
  }
}
