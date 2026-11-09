/**
 * Call center for online orders, without a telephony provider: staff dial
 * through tel: links (phone, or the desktop's tel handler) and log the
 * outcome. A logged call also writes the order's COD confirmation result and,
 * for "call back", the order's follow-up time, through the same services the
 * orders board uses. Auto-dial and call recording need a provider and are
 * not built.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { periodRange } from '../../../modules/inventory/taxonomy/taxonomy.helper';
import { OnlineOrdersService } from '../online-orders.service';
import { OrderEntryService } from '../order-entry.service';
import { phoneKey } from '../customer-risk';
import { CALL_OUTCOMES, CallOutcome, agentStats, confirmationFor, isOutcome, queueScore } from './call-math';

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const QUEUE_LIMIT = 300;

export interface LogCallBody {
  orderId?: string;
  phone?: string;
  name?: string;
  outcome?: string;
  note?: string;
  callBackAt?: string | null;
}

@Injectable()
export class CallCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly orders: OnlineOrdersService,
    private readonly entry: OrderEntryService,
  ) {}

  private orderWhere(user: AuthenticatedUser, scope: ShopScope): Prisma.ChannelOrderWhereInput {
    return { tenantId: user.tenantId, ...(scope.whereLoose as any) };
  }

  private async names(ids: (string | null)[]) {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map<string, string>();
    const users = await this.prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, fullName: true, email: true } });
    return new Map(users.map((u) => [u.id, u.fullName || u.email || '']));
  }

  /**
   * Confirmation queue: open orders not yet confirmed, highest priority
   * first (age, customer risk, COD, a due callback). Orders whose callback
   * is still ahead are listed separately as "later".
   */
  async queue(user: AuthenticatedUser, scope: ShopScope, q: { mine?: string }) {
    const where: Prisma.ChannelOrderWhereInput = {
      ...this.orderWhere(user, scope),
      orderStatus: 'PENDING',
      deletedAt: null,
      ...(q.mine === '1' && { assignedToId: user.id }),
    };
    const rows = await this.prisma.channelOrder.findMany({
      where, orderBy: { receivedAt: 'asc' }, take: QUEUE_LIMIT,
      select: {
        id: true, externalOrderId: true, externalOrderNumber: true, customerName: true, customerPhone: true, customerCity: true,
        total: true, paymentMethod: true, paymentStatus: true, receivedAt: true, metadata: true, stage: true, assignedToId: true,
        integration: { select: { displayName: true, type: true } },
      },
    });
    const open = rows.filter((o) => ((o.metadata as any)?.confirmation?.result ?? null) !== 'CONFIRMED');
    const ids = open.map((o) => o.id);
    const [calls, risk] = await Promise.all([
      ids.length
        ? this.prisma.orderCall.findMany({ where: { tenantId: user.tenantId, channelOrderId: { in: ids } }, orderBy: { createdAt: 'desc' } })
        : Promise.resolve([]),
      this.orders.customerRisk(user.tenantId, open.map((o) => o.customerPhone), ids).catch(() => new Map()),
    ]);
    const byOrder = new Map<string, typeof calls>();
    for (const c of calls) {
      const list = byOrder.get(c.channelOrderId!) ?? [];
      list.push(c);
      byOrder.set(c.channelOrderId!, list);
    }
    const now = new Date();
    const nameOf = await this.names([...open.map((o) => o.assignedToId), ...calls.map((c) => c.agentId)]);
    const items = open.map((o) => {
      const list = byOrder.get(o.id) ?? [];
      const last = list[0] ?? null;
      const openBack = list.find((c) => c.outcome === 'CALL_BACK' && c.callBackAt && !c.followUpDoneAt) ?? null;
      const r = risk.get(phoneKey(o.customerPhone) ?? '') ?? null;
      const cod = !/prepaid|paid|card|bank|online/i.test(String(o.paymentMethod ?? 'cod')) || o.paymentStatus !== 'PAID';
      const attempts = list.filter((c) => c.outcome !== 'CALL_BACK').length;
      const score = queueScore({
        receivedAt: o.receivedAt, riskLevel: r?.level ?? null, attempts, callBackAt: openBack?.callBackAt ?? null,
        lastCallAt: last?.createdAt ?? null, cod, total: Number(o.total),
      }, now);
      return {
        id: o.id, no: orderNo(o), customerName: o.customerName, customerPhone: o.customerPhone, customerCity: o.customerCity,
        total: Number(o.total), cod, receivedAt: o.receivedAt, channel: o.integration?.displayName ?? null, channelType: o.integration?.type ?? null,
        stage: o.stage, assignedTo: o.assignedToId ? { id: o.assignedToId, name: nameOf.get(o.assignedToId) ?? '' } : null,
        risk: r ? { level: r.level, label: r.label, reason: r.reason } : null,
        attempts, score,
        lastCall: last ? { outcome: last.outcome, at: last.createdAt, by: nameOf.get(last.agentId ?? '') ?? null, note: last.note } : null,
        callBackAt: openBack?.callBackAt ?? null,
      };
    });
    const now_ = items.filter((i) => i.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const later = items.filter((i) => i.score === null).sort((a, b) => +new Date(a.callBackAt ?? a.lastCall?.at ?? 0) - +new Date(b.callBackAt ?? b.lastCall?.at ?? 0));
    const start = new Date(now.getTime() - 24 * 3_600_000);
    const today = await this.prisma.orderCall.groupBy({
      by: ['outcome'], where: { tenantId: user.tenantId, createdAt: { gte: start }, ...(q.mine === '1' && { agentId: user.id }) }, _count: { _all: true },
    });
    const count = (o: string) => today.find((t) => t.outcome === o)?._count._all ?? 0;
    const callsToday = today.reduce((s, t) => s + t._count._all, 0);
    return {
      items: now_, later,
      stats: {
        waiting: now_.length, later: later.length, risky: now_.filter((i) => i.risk && ['HIGH', 'WATCH', 'BLOCKED'].includes(i.risk.level)).length,
        callsToday, confirmedToday: count('CONFIRMED'), noAnswerToday: count('NO_ANSWER') + count('BUSY'),
      },
    };
  }

  /** Logs a call and applies its outcome to the order. */
  async log(user: AuthenticatedUser, scope: ShopScope, body: LogCallBody) {
    if (!isOutcome(body?.outcome)) throw new BadRequestException(`Outcome: ${CALL_OUTCOMES.join(', ')}`);
    const outcome = body.outcome as CallOutcome;
    const note = body.note?.trim().slice(0, 300) || null;
    let callBackAt: Date | null = null;
    if (outcome === 'CALL_BACK') {
      callBackAt = body.callBackAt ? new Date(body.callBackAt) : null;
      if (!callBackAt || Number.isNaN(callBackAt.getTime())) throw new BadRequestException('Dobara call ka waqt chunein');
    }
    let order: { id: string; shopId: string | null; customerName: string; customerPhone: string | null; orderStatus: string } | null = null;
    if (body.orderId) {
      order = await this.prisma.channelOrder.findFirst({
        where: { id: body.orderId, ...this.orderWhere(user, scope) },
        select: { id: true, shopId: true, customerName: true, customerPhone: true, orderStatus: true },
      });
      if (!order) throw new NotFoundException('Order nahi mila');
    }
    const phone = order?.customerPhone ?? body.phone?.trim().slice(0, 30) ?? null;
    const key = phoneKey(phone);
    if (!order && !key) throw new BadRequestException('Order ya phone number zaroori hai');

    // A new call closes the earlier open follow-ups for the same order or number.
    await this.prisma.orderCall.updateMany({
      where: { tenantId: user.tenantId, followUpDoneAt: null, callBackAt: { not: null }, ...(order ? { channelOrderId: order.id } : { phoneKey: key }) },
      data: { followUpDoneAt: new Date() },
    });
    const call = await this.prisma.orderCall.create({
      data: {
        tenantId: user.tenantId, shopId: order?.shopId ?? scope.shopId ?? null, channelOrderId: order?.id ?? null,
        phoneKey: key, customerName: order?.customerName ?? body.name?.trim().slice(0, 120) ?? null, customerPhone: phone,
        agentId: user.id, outcome, note, callBackAt,
      },
    });

    let applied: string | null = null;
    if (order && !['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(order.orderStatus)) {
      const result = confirmationFor(outcome);
      const label: Record<string, string> = { BUSY: 'Busy', WRONG_NUMBER: 'Ghalat number' };
      if (result) {
        await this.orders.setConfirmation(user, scope, order.id, { result, note: [label[outcome], note].filter(Boolean).join(' — ') || undefined }).catch(() => null);
        applied = result;
      }
      if (outcome === 'CALL_BACK') {
        await this.entry.followUp(user, scope, order.id, { at: callBackAt!.toISOString(), note: note ?? 'Call back' }).catch(() => null);
        applied = 'FOLLOW_UP';
      }
    }
    return { ...call, applied };
  }

  /** Call log, newest first: for one order, one customer (phone) or a period. */
  async list(user: AuthenticatedUser, q: { orderId?: string; phone?: string; agentId?: string; outcome?: string; from?: string; to?: string; limit?: string }) {
    const key = phoneKey(q.phone);
    const range = q.orderId || key ? null : await periodRange(this.tz, user.tenantId, q.from, q.to);
    const rows = await this.prisma.orderCall.findMany({
      where: {
        tenantId: user.tenantId,
        ...(q.orderId && { channelOrderId: q.orderId }),
        ...(key && !q.orderId && { phoneKey: key }),
        ...(q.agentId && { agentId: q.agentId }),
        ...(isOutcome(q.outcome) && { outcome: q.outcome }),
        ...(range && { createdAt: { gte: range.gte, lt: range.lt } }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, Math.max(1, Number(q.limit) || 200)),
    });
    return this.present(user, rows);
  }

  private async present(user: AuthenticatedUser, rows: Awaited<ReturnType<PrismaService['orderCall']['findMany']>>) {
    const nameOf = await this.names(rows.map((r) => r.agentId));
    const orderIds = [...new Set(rows.map((r) => r.channelOrderId).filter((x): x is string => !!x))];
    const orders = orderIds.length
      ? await this.prisma.channelOrder.findMany({ where: { tenantId: user.tenantId, id: { in: orderIds } }, select: { id: true, externalOrderId: true, externalOrderNumber: true, orderStatus: true, total: true } })
      : [];
    const om = new Map(orders.map((o) => [o.id, o]));
    return rows.map((r) => {
      const o = r.channelOrderId ? om.get(r.channelOrderId) : null;
      return {
        id: r.id, outcome: r.outcome, note: r.note, at: r.createdAt, callBackAt: r.callBackAt, followUpDoneAt: r.followUpDoneAt,
        customerName: r.customerName, customerPhone: r.customerPhone,
        agent: r.agentId ? { id: r.agentId, name: nameOf.get(r.agentId) ?? '' } : null,
        order: o ? { id: o.id, no: orderNo(o), status: o.orderStatus, total: Number(o.total) } : null,
      };
    });
  }

  /** Callbacks still to make (due first), with how many are late. */
  async followUps(user: AuthenticatedUser, q: { mine?: string }) {
    const rows = await this.prisma.orderCall.findMany({
      where: { tenantId: user.tenantId, outcome: 'CALL_BACK', followUpDoneAt: null, callBackAt: { not: null }, ...(q.mine === '1' && { agentId: user.id }) },
      orderBy: { callBackAt: 'asc' }, take: 300,
    });
    const items = await this.present(user, rows);
    const now = Date.now();
    return { items, stats: { open: items.length, due: items.filter((i) => +new Date(i.callBackAt!) <= now).length } };
  }

  async followUpDone(user: AuthenticatedUser, id: string, undo = false) {
    const row = await this.prisma.orderCall.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Call nahi mili');
    return this.prisma.orderCall.update({ where: { id }, data: { followUpDoneAt: undo ? null : new Date() } });
  }

  /** Per agent: calls, orders called, confirmed, confirm and reach rates, in a period. */
  async performance(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    const range = await periodRange(this.tz, user.tenantId, q.from, q.to);
    const rows = await this.prisma.orderCall.findMany({
      where: { tenantId: user.tenantId, createdAt: { gte: range.gte, lt: range.lt } },
      select: { agentId: true, outcome: true, channelOrderId: true },
      take: 50_000,
    });
    const stats = agentStats(rows);
    const nameOf = await this.names(stats.map((s) => s.agentId));
    const total = agentStats(rows.map((r) => ({ ...r, agentId: 'all' })))[0] ?? null;
    return {
      range: { from: range.gte, to: range.lt },
      totals: total ? { ...total, agentId: null } : { calls: 0, orders: 0, confirmed: 0, cancelled: 0, noAnswer: 0, callBack: 0, wrongNumber: 0, confirmRate: 0, reachRate: 0 },
      agents: stats.map((s) => ({ ...s, name: s.agentId ? nameOf.get(s.agentId) ?? '' : null })),
    };
  }
}
