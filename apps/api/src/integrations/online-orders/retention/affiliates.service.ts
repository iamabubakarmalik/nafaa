/**
 * Influencers and affiliates. Each one has discount codes (typed by the
 * merchant: Nafaa cannot create Shopify discount codes, that needs a store
 * permission it does not ask for) and a link tag used as utm_campaign. Orders
 * are attributed by the code on the order, else the link tag, else by hand.
 * Commission is a percent of the goods or a fixed amount per delivered order.
 * Paying a period writes an Expense in accounts and freezes those orders so
 * they are never paid twice.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { MONEY_METHODS } from '../../../common/helpers/sale-payments.helper';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { periodRange } from '../../../modules/inventory/taxonomy/taxonomy.helper';
import { AffiliateRule, CommissionType, matchAffiliate, normalizeCode, roiOf, slugify, statementOf } from './affiliate-math';

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const CATEGORY = 'Influencer & affiliates';
export const AFFILIATE_PAYOUT_SOURCE = 'AFFILIATE_PAYOUT';
const KINDS = ['INFLUENCER', 'AFFILIATE'];
const PLATFORMS = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'OTHER'];

export interface AffiliateBody {
  name?: string; phone?: string | null; kind?: string; platform?: string | null; handle?: string | null; slug?: string;
  codes?: string[] | string; commissionType?: string; commissionValue?: number; active?: boolean; notes?: string | null;
}

const orderSelect = {
  id: true, orderStatus: true, total: true, deliveryFee: true, receivedAt: true, deliveredAt: true, customerName: true, customerCity: true,
  externalOrderNumber: true, externalOrderId: true, discountCodes: true, utmCampaign: true, utmSource: true, metadata: true,
  integration: { select: { displayName: true } },
} as const;

@Injectable()
export class AffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Business days from–to (the shop's time zone and day start); 30 days by default. */
  private async range(tenantId: string, from?: string, to?: string) {
    if (from && to && from > to) throw new BadRequestException('Shuru ki tareekh aakhri se pehle honi chahiye');
    const r = await periodRange(this.tz, tenantId, from, to);
    return { start: r.gte, end: new Date(r.lt.getTime() - 1) };
  }

  private async rules(tenantId: string): Promise<AffiliateRule[]> {
    const rows = await this.prisma.affiliate.findMany({ where: { tenantId }, select: { id: true, slug: true, codes: true, commissionType: true, commissionValue: true, active: true } });
    return rows.map((r) => ({ ...r, commissionType: r.commissionType as CommissionType }));
  }

  /**
   * Orders attributed to each affiliate, received in the range. Manual and
   * paid links (affiliate_orders) override code and link-tag matching.
   */
  private async attributed(tenantId: string, start: Date, end: Date, onlyAffiliate?: string) {
    const rules = await this.rules(tenantId);
    // Every link of the business: an order tied to another partner must never match this one by code.
    const links = await this.prisma.affiliateOrder.findMany({ where: { tenantId } });
    const linkByOrder = new Map(links.map((l) => [l.channelOrderId, l]));
    const fixedIds = links.filter((l) => !onlyAffiliate || l.affiliateId === onlyAffiliate).map((l) => l.channelOrderId);
    const orders = await this.prisma.channelOrder.findMany({
      where: {
        tenantId, deletedAt: null, receivedAt: { gte: start, lte: end },
        OR: [{ discountCodes: { isEmpty: false } }, { utmCampaign: { not: null } }, ...(fixedIds.length ? [{ id: { in: fixedIds } }] : [])],
      },
      select: orderSelect,
      take: 20_000,
    });
    const out: Array<{ affiliateId: string; source: string; order: (typeof orders)[number]; link: (typeof links)[number] | null }> = [];
    for (const o of orders) {
      if ((o.metadata as any)?.test) continue;
      const link = linkByOrder.get(o.id) ?? null;
      if (link) {
        if (!onlyAffiliate || link.affiliateId === onlyAffiliate) out.push({ affiliateId: link.affiliateId, source: link.source, order: o, link });
        continue;
      }
      const m = matchAffiliate(o, rules);
      if (m && (!onlyAffiliate || m.affiliateId === onlyAffiliate)) out.push({ affiliateId: m.affiliateId, source: m.source, order: o, link: null });
    }
    return { rules, rows: out };
  }

  async list(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    const { start, end } = await this.range(user.tenantId, q.from, q.to);
    const [affiliates, { rows }, paidAll] = await Promise.all([
      this.prisma.affiliate.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ active: 'desc' }, { createdAt: 'desc' }] }),
      this.attributed(user.tenantId, start, end),
      this.prisma.affiliatePayout.groupBy({ by: ['affiliateId'], where: { tenantId: user.tenantId }, _sum: { amount: true }, _max: { paidAt: true } }),
    ]);
    const paidBy = new Map(paidAll.map((p) => [p.affiliateId, { paid: Number(p._sum.amount ?? 0), lastPaidAt: p._max.paidAt }]));
    const list = affiliates.map((a) => {
      const mine = rows.filter((r) => r.affiliateId === a.id);
      const st = statementOf(a as any, mine.map((r) => ({
        id: r.order.id, status: r.order.orderStatus, total: Number(r.order.total), deliveryFee: Number(r.order.deliveryFee),
        paid: !!r.link?.payoutId, paidCommission: r.link?.commission ?? null,
      })));
      const paid = paidBy.get(a.id);
      const cost = st.totals.commission;
      return {
        ...a,
        stats: { ...st.totals, roi: roiOf(st.totals.sales, cost), byCode: mine.filter((r) => r.source === 'CODE').length, byLink: mine.filter((r) => r.source === 'UTM').length, manual: mine.filter((r) => r.source === 'MANUAL').length },
        paidAllTime: Math.round(paid?.paid ?? 0),
        lastPaidAt: paid?.lastPaidAt ?? null,
      };
    });
    const sum = (k: 'sales' | 'commission' | 'due' | 'delivered' | 'orders') => list.reduce((s, a) => s + a.stats[k], 0);
    return {
      range: { from: start, to: end },
      affiliates: list,
      totals: { affiliates: list.filter((a) => a.active).length, orders: sum('orders'), delivered: sum('delivered'), sales: Math.round(sum('sales')), commission: Math.round(sum('commission')), due: Math.round(sum('due')), roi: roiOf(sum('sales'), sum('commission')) },
    };
  }

  private clean(body: AffiliateBody, partial: boolean) {
    const data: Record<string, unknown> = {};
    if (!partial || body.name !== undefined) {
      const name = String(body.name ?? '').trim().slice(0, 80);
      if (!name) throw new BadRequestException('Naam likhein');
      data.name = name;
    }
    if (body.phone !== undefined) data.phone = String(body.phone ?? '').replace(/[^\d+]/g, '').slice(0, 20) || null;
    if (body.kind !== undefined) data.kind = KINDS.includes(String(body.kind)) ? body.kind : 'INFLUENCER';
    if (body.platform !== undefined) data.platform = PLATFORMS.includes(String(body.platform)) ? body.platform : null;
    if (body.handle !== undefined) data.handle = String(body.handle ?? '').trim().replace(/^@+/, '').slice(0, 60) || null;
    if (body.codes !== undefined) {
      const raw = Array.isArray(body.codes) ? body.codes : String(body.codes ?? '').split(/[,\n]/);
      data.codes = [...new Set(raw.map(normalizeCode).filter(Boolean))].slice(0, 20);
    }
    if (body.commissionType !== undefined) data.commissionType = body.commissionType === 'FIXED' ? 'FIXED' : 'PERCENT';
    if (body.commissionValue !== undefined) {
      const v = Number(body.commissionValue);
      const type = (data.commissionType as string | undefined) ?? body.commissionType;
      if (!Number.isFinite(v) || v < 0 || (type !== 'FIXED' && v > 100) || v > 1_000_000) throw new BadRequestException('Commission sahi likhein');
      data.commissionValue = v;
    }
    if (body.active !== undefined) data.active = !!body.active;
    if (body.notes !== undefined) data.notes = String(body.notes ?? '').trim().slice(0, 500) || null;
    return data;
  }

  /** A code may belong to one affiliate only, or orders could not be split. */
  private async assertCodesFree(tenantId: string, codes: string[] | undefined, selfId?: string) {
    if (!codes?.length) return;
    const clash = await this.prisma.affiliate.findFirst({ where: { tenantId, codes: { hasSome: codes }, ...(selfId && { id: { not: selfId } }) }, select: { name: true, codes: true } });
    if (clash) throw new BadRequestException(`Code ${clash.codes.find((c) => codes.includes(c))} pehle se ${clash.name} ka hai`);
  }

  private async freeSlug(tenantId: string, want: string, selfId?: string) {
    const base = slugify(want) || 'partner';
    for (let i = 0; i < 50; i++) {
      const slug = i ? `${base}-${i + 1}` : base;
      const taken = await this.prisma.affiliate.findFirst({ where: { tenantId, slug, ...(selfId && { id: { not: selfId } }) }, select: { id: true } });
      if (!taken) return slug;
    }
    throw new BadRequestException('Link tag pehle se istemal me hai');
  }

  async create(user: AuthenticatedUser, body: AffiliateBody) {
    const data = this.clean(body, false);
    await this.assertCodesFree(user.tenantId, data.codes as string[] | undefined);
    const slug = await this.freeSlug(user.tenantId, body.slug || String(data.name));
    return this.prisma.affiliate.create({ data: { ...(data as any), tenantId: user.tenantId, slug } });
  }

  async update(user: AuthenticatedUser, id: string, body: AffiliateBody) {
    const a = await this.prisma.affiliate.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!a) throw new NotFoundException('Partner nahi mila');
    const data = this.clean(body, true);
    await this.assertCodesFree(user.tenantId, data.codes as string[] | undefined, id);
    if (body.slug !== undefined) data.slug = await this.freeSlug(user.tenantId, body.slug, id);
    return this.prisma.affiliate.update({ where: { id }, data });
  }

  /** Deletes a partner with no payouts; one with payouts is switched off so the expense history stays readable. */
  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.affiliate.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, _count: { select: { payouts: true } } } });
    if (!a) throw new NotFoundException('Partner nahi mila');
    if (a._count.payouts) {
      await this.prisma.affiliate.update({ where: { id }, data: { active: false } });
      return { ok: true, archived: true };
    }
    await this.prisma.affiliate.delete({ where: { id } });
    return { ok: true, archived: false };
  }

  async statement(user: AuthenticatedUser, id: string, q: { from?: string; to?: string }) {
    const a = await this.prisma.affiliate.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Partner nahi mila');
    const { start, end } = await this.range(user.tenantId, q.from, q.to);
    const { rows } = await this.attributed(user.tenantId, start, end, id);
    const st = statementOf(a as any, rows.map((r) => ({
      id: r.order.id, status: r.order.orderStatus, total: Number(r.order.total), deliveryFee: Number(r.order.deliveryFee),
      paid: !!r.link?.payoutId, paidCommission: r.link?.commission ?? null,
    })));
    const byId = new Map(rows.map((r) => [r.order.id, r]));
    const payouts = await this.prisma.affiliatePayout.findMany({ where: { tenantId: user.tenantId, affiliateId: id }, orderBy: { paidAt: 'desc' }, take: 50 });
    return {
      affiliate: a,
      range: { from: start, to: end },
      totals: { ...st.totals, roi: roiOf(st.totals.sales, st.totals.commission) },
      lines: st.lines.map((l) => {
        const r = byId.get(l.id)!;
        return {
          orderId: l.id, no: orderNo(r.order), status: l.status, total: l.total, base: l.base, commission: l.commission, paid: l.paid,
          source: r.source, code: (r.order.discountCodes ?? [])[0] ?? null, utmCampaign: r.order.utmCampaign, customer: r.order.customerName,
          city: r.order.customerCity, channel: r.order.integration?.displayName ?? null, receivedAt: r.order.receivedAt, deliveredAt: r.order.deliveredAt,
          manual: r.source === 'MANUAL' && !r.link?.payoutId,
        };
      }).sort((x, y) => +new Date(y.receivedAt) - +new Date(x.receivedAt)),
      payouts,
    };
  }

  /** Ties an order to a partner by hand (an order typed in, or a code the customer told on the phone). */
  async linkOrder(user: AuthenticatedUser, id: string, body: { orderId?: string; orderNo?: string }) {
    const a = await this.prisma.affiliate.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!a) throw new NotFoundException('Partner nahi mila');
    const no = String(body.orderNo ?? '').trim().replace(/^#+/, '');
    const o = await this.prisma.channelOrder.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null, ...(body.orderId ? { id: String(body.orderId) } : { OR: [{ externalOrderNumber: no }, { externalOrderNumber: `#${no}` }, { externalOrderId: no }] }) },
      select: { id: true, total: true },
    });
    if (!o || (!body.orderId && !no)) throw new NotFoundException('Order nahi mila');
    const have = await this.prisma.affiliateOrder.findUnique({ where: { tenantId_channelOrderId: { tenantId: user.tenantId, channelOrderId: o.id } } });
    if (have?.payoutId) throw new BadRequestException('Is order ki commission de chuke hain');
    if (have) await this.prisma.affiliateOrder.update({ where: { id: have.id }, data: { affiliateId: id, source: 'MANUAL', createdById: user.id } });
    else await this.prisma.affiliateOrder.create({ data: { tenantId: user.tenantId, affiliateId: id, channelOrderId: o.id, source: 'MANUAL', createdById: user.id } });
    return { ok: true, orderId: o.id };
  }

  async unlinkOrder(user: AuthenticatedUser, id: string, orderId: string) {
    const done = await this.prisma.affiliateOrder.deleteMany({ where: { tenantId: user.tenantId, affiliateId: id, channelOrderId: orderId, payoutId: null } });
    if (!done.count) throw new BadRequestException('Sirf haath se jora (aur bina commission diye) order hataya ja sakta hai');
    return { ok: true };
  }

  /** Pays the due commission of a period: freezes the orders, then writes one Expense. */
  async pay(user: AuthenticatedUser, scope: ShopScope, id: string, body: { from?: string; to?: string; paymentMethod?: string; note?: string }) {
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.EXPENSES_CREATE)) {
      throw new ForbiddenException('Commission dene ke liye Expenses likhne ki permission chahiye');
    }
    const method = (MONEY_METHODS as string[]).includes(String(body.paymentMethod)) ? (body.paymentMethod as PaymentMethod) : 'CASH';
    const st = await this.statement(user, id, body);
    const due = st.lines.filter((l) => l.status === 'DELIVERED' && !l.paid && l.commission > 0);
    if (!due.length) throw new BadRequestException('Is muddat me koi commission baqi nahi');
    const amount = Math.round(due.reduce((s, l) => s + l.commission, 0) * 100) / 100;
    const sales = Math.round(due.reduce((s, l) => s + l.total, 0) * 100) / 100;
    const a = st.affiliate;

    // Freeze the orders first; the unique (tenant, order) row stops a second payment of the same order.
    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.affiliatePayout.create({
        data: {
          tenantId: user.tenantId, affiliateId: id, periodFrom: st.range.from, periodTo: st.range.to, orders: due.length, sales, amount,
          paymentMethod: method, note: String(body.note ?? '').trim().slice(0, 300) || null, paidById: user.id,
        },
      });
      for (const l of due) {
        const upd = await tx.affiliateOrder.updateMany({
          where: { tenantId: user.tenantId, channelOrderId: l.orderId, affiliateId: id, payoutId: null },
          data: { payoutId: p.id, commission: l.commission, orderTotal: l.total },
        });
        if (upd.count) continue;
        try {
          await tx.affiliateOrder.create({
            data: { tenantId: user.tenantId, affiliateId: id, channelOrderId: l.orderId, source: l.source, payoutId: p.id, commission: l.commission, orderTotal: l.total, createdById: user.id },
          });
        } catch {
          throw new BadRequestException(`Order #${l.no} ki commission pehle hi di ja chuki hai — safha taaza karein`);
        }
      }
      return p;
    });

    try {
      const category = await this.prisma.expenseCategory.upsert({
        where: { tenantId_name: { tenantId: user.tenantId, name: CATEGORY } },
        create: { tenantId: user.tenantId, name: CATEGORY, color: '#7c3aed', icon: 'megaphone' },
        update: { isActive: true },
        select: { id: true },
      });
      const exp = await this.expenses.create(user, scope, {
        title: `Commission: ${a.name}`.slice(0, 120),
        description: `${due.length} order deliver · sale Rs ${Math.round(sales)} · ${st.range.from.toISOString().slice(0, 10)} se ${st.range.to.toISOString().slice(0, 10)}`.slice(0, 500),
        amount,
        paymentMethod: method,
        status: 'PAID',
        categoryId: category.id,
        expenseDate: new Date().toISOString(),
      } as any);
      await this.prisma.expense.update({ where: { id: exp.id }, data: { sourceType: AFFILIATE_PAYOUT_SOURCE, sourceId: payout.id } });
      return this.prisma.affiliatePayout.update({ where: { id: payout.id }, data: { expenseId: exp.id, expenseNumber: exp.expenseNumber } });
    } catch (e) {
      // No expense, no payout: release the orders so the merchant can try again.
      await this.prisma.affiliateOrder.updateMany({ where: { payoutId: payout.id, source: 'MANUAL' }, data: { payoutId: null, commission: null } });
      await this.prisma.affiliateOrder.deleteMany({ where: { payoutId: payout.id } });
      await this.prisma.affiliatePayout.delete({ where: { id: payout.id } }).catch(() => null);
      throw e;
    }
  }
}

