import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { shopDue } from './shop-due';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { phoneKey } from './customer-risk';
import { courierName } from './couriers';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const blockKey = (tenantId: string) => `online_orders_blocklist:${tenantId}`;

export interface BlockEntry {
  key: string;
  phone: string;
  name: string | null;
  reason: string | null;
  at: string;
  by: string;
}

/** PKT tareekh YYYY-MM-DD (server UTC hai) */
const pkDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/**
 * Online orders ke auzaar: block list, order edit, andar ke notes/tags,
 * report aur CSV. OnlineOrdersService par depend nahi karta (woh isay
 * istemal karta hai — block list ke liye).
 */
@Injectable()
export class OrderToolsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // BLOCK LIST — fake / baar baar RTO karne wale numbers
  // ═══════════════════════════════════════════════════════════

  async blocklist(tenantId: string): Promise<BlockEntry[]> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: blockKey(tenantId) } });
    try {
      const list = row?.value ? JSON.parse(row.value) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async isBlocked(tenantId: string, phone?: string | null): Promise<BlockEntry | null> {
    const k = phoneKey(phone);
    if (!k) return null;
    return (await this.blocklist(tenantId)).find((b) => b.key === k) ?? null;
  }

  async block(user: AuthenticatedUser, body: { phone?: string; name?: string; reason?: string }) {
    const k = phoneKey(body?.phone);
    if (!k) throw new BadRequestException('Sahi phone number daalein');
    const list = await this.blocklist(user.tenantId);
    const entry: BlockEntry = {
      key: k,
      phone: String(body.phone).trim().slice(0, 20),
      name: body.name?.trim().slice(0, 80) || null,
      reason: body.reason?.trim().slice(0, 200) || null,
      at: new Date().toISOString(),
      by: user.id,
    };
    const next = [entry, ...list.filter((b) => b.key !== k)].slice(0, 5000);
    await this.saveBlocklist(user.tenantId, next);
    return { ok: true, entry };
  }

  async unblock(user: AuthenticatedUser, phone: string) {
    const k = phoneKey(phone);
    const list = await this.blocklist(user.tenantId);
    await this.saveBlocklist(user.tenantId, list.filter((b) => b.key !== k));
    return { ok: true };
  }

  private async saveBlocklist(tenantId: string, list: BlockEntry[]) {
    const value = JSON.stringify(list);
    await this.prisma.systemSetting.upsert({
      where: { key: blockKey(tenantId) },
      create: { key: blockKey(tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ORDER EDIT — customer ne address / phone badalwaya
  // ═══════════════════════════════════════════════════════════

  async editOrder(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { customerName?: string; customerPhone?: string; customerAddress?: string; customerCity?: string; notes?: string },
  ) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus) || order.orderStatus === 'DELIVERED') throw new BadRequestException('Band ya deliver ho chuka order edit nahi hota');
    if (order.dispatchedAt) throw new BadRequestException('Parcel ja chuka — ab courier se address badalwayein');
    if (order.courierBookedAt && order.trackingNumber && order.courierStatus !== 'CANCELLED') {
      throw new BadRequestException('Courier booking ho chuki — pehle booking cancel karein, phir address badlein aur dobara book karein');
    }
    const fields = ['customerName', 'customerPhone', 'customerAddress', 'customerCity', 'notes'] as const;
    const limits = { customerName: 100, customerPhone: 20, customerAddress: 400, customerCity: 80, notes: 500 };
    const data: Prisma.ChannelOrderUpdateInput = {};
    const changes: Record<string, { from: string | null; to: string | null }> = {};
    for (const f of fields) {
      if (body?.[f] === undefined) continue;
      const v = String(body[f] ?? '').trim().slice(0, limits[f]) || null;
      if (f === 'customerName' && !v) throw new BadRequestException('Customer ka naam khali nahi ho sakta');
      if (v !== (order[f] ?? null)) {
        (data as any)[f] = v ?? (f === 'customerName' ? order.customerName : null);
        changes[f] = { from: order[f] ?? null, to: v };
      }
    }
    if (!Object.keys(changes).length) return { ok: true, changed: 0 };
    const meta = (order.metadata ?? {}) as any;
    data.metadata = {
      ...meta,
      edits: [...(meta.edits ?? []), { at: new Date().toISOString(), by: user.id, changes }].slice(-20),
    };
    await this.prisma.channelOrder.update({ where: { id }, data });
    return { ok: true, changed: Object.keys(changes).length };
  }

  // ═══════════════════════════════════════════════════════════
  // ANDAR KE NOTES + TAGS (customer ko nahi dikhte)
  // ═══════════════════════════════════════════════════════════

  async addNote(user: AuthenticatedUser, scope: ShopScope, id: string, text?: string) {
    const t = String(text ?? '').trim().slice(0, 500);
    if (!t) throw new BadRequestException('Note khali hai');
    const order = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) }, select: { metadata: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    const meta = (order.metadata ?? {}) as any;
    const author = await this.prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } }).catch(() => null);
    const note = { id: `n${Date.now().toString(36)}`, text: t, at: new Date().toISOString(), by: user.id, byName: author?.fullName || author?.email || null };
    await this.prisma.channelOrder.update({ where: { id }, data: { metadata: { ...meta, internalNotes: [...(meta.internalNotes ?? []), note].slice(-50) } } });
    return { ok: true, note };
  }

  async setTags(user: AuthenticatedUser, scope: ShopScope, id: string, tags?: string[]) {
    const clean = [...new Set((tags ?? []).map((t) => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, 10);
    const order = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) }, select: { metadata: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    await this.prisma.channelOrder.update({ where: { id }, data: { metadata: { ...((order.metadata as any) ?? {}), tags: clean } } });
    return { ok: true, tags: clean };
  }

  // ═══════════════════════════════════════════════════════════
  // REPORT — online sales ka hisaab
  // ═══════════════════════════════════════════════════════════

  async report(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; integrationId?: string }) {
    const to = q.to ? new Date(`${q.to}T23:59:59+05:00`) : new Date();
    const from = q.from ? new Date(`${q.from}T00:00:00+05:00`) : new Date(to.getTime() - 29 * 86_400_000);
    if (isNaN(+from) || isNaN(+to) || from > to) throw new BadRequestException('Tareekh sahi nahi');
    if (to.getTime() - from.getTime() > 400 * 86_400_000) throw new BadRequestException('Zyada se zyada 1 saal ka report');

    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(scope.whereLoose as any),
        receivedAt: { gte: from, lte: to },
        ...(q.integrationId ? { integrationId: q.integrationId } : {}),
      },
      select: {
        receivedAt: true, acceptedAt: true, dispatchedAt: true, deliveredAt: true, orderStatus: true, paymentStatus: true,
        total: true, customerCity: true, courierCode: true, items: true, metadata: true, customerPhone: true,
        integration: { select: { id: true, displayName: true, type: true } },
      },
      take: 30_000,
    });
    const live = rows.filter((r) => !(r.metadata as any)?.test);

    const t = { orders: 0, value: 0, accepted: 0, dispatched: 0, delivered: 0, deliveredValue: 0, returned: 0, cancelled: 0, pending: 0 };
    let acceptMin = 0, acceptN = 0, deliverDays = 0, deliverN = 0;
    const byChannel = new Map<string, { name: string; type: string; orders: number; value: number; delivered: number; returned: number; dispatched: number }>();
    const byCity = new Map<string, { city: string; orders: number; delivered: number; returned: number; dispatched: number; value: number }>();
    const byDay = new Map<string, { day: string; orders: number; value: number; delivered: number }>();
    const byCourier = new Map<string, { code: string; name: string; dispatched: number; delivered: number; returned: number }>();
    const products = new Map<string, { name: string; qty: number; value: number }>();
    const customers = new Set<string>();
    const repeat = new Map<string, number>();

    for (const r of live) {
      const v = Number(r.total);
      t.orders++; t.value += v;
      if (r.acceptedAt) { t.accepted++; acceptMin += (r.acceptedAt.getTime() - r.receivedAt.getTime()) / 60_000; acceptN++; }
      if (r.dispatchedAt) t.dispatched++;
      if (r.orderStatus === 'DELIVERED') {
        t.delivered++; t.deliveredValue += v;
        if (r.dispatchedAt && r.deliveredAt) { deliverDays += (r.deliveredAt.getTime() - r.dispatchedAt.getTime()) / 86_400_000; deliverN++; }
      }
      if (r.orderStatus === 'RETURNED') t.returned++;
      if (r.orderStatus === 'CANCELLED' || r.orderStatus === 'REJECTED') t.cancelled++;
      if (r.orderStatus === 'PENDING') t.pending++;

      const ch = byChannel.get(r.integration.id) ?? { name: r.integration.displayName, type: r.integration.type, orders: 0, value: 0, delivered: 0, returned: 0, dispatched: 0 };
      ch.orders++; ch.value += v;
      if (r.dispatchedAt) ch.dispatched++;
      if (r.orderStatus === 'DELIVERED') ch.delivered++;
      if (r.orderStatus === 'RETURNED') ch.returned++;
      byChannel.set(r.integration.id, ch);

      const cityName = (r.customerCity ?? '').trim();
      const ck = cityName.toLowerCase() || '—';
      const c = byCity.get(ck) ?? { city: cityName || 'Shehar nahi likha', orders: 0, delivered: 0, returned: 0, dispatched: 0, value: 0 };
      c.orders++; c.value += v;
      if (r.dispatchedAt) c.dispatched++;
      if (r.orderStatus === 'DELIVERED') c.delivered++;
      if (r.orderStatus === 'RETURNED') c.returned++;
      byCity.set(ck, c);

      const dk = pkDay(r.receivedAt);
      const d = byDay.get(dk) ?? { day: dk, orders: 0, value: 0, delivered: 0 };
      d.orders++; d.value += v;
      if (r.orderStatus === 'DELIVERED') d.delivered++;
      byDay.set(dk, d);

      if (r.courierCode && r.dispatchedAt) {
        const co = byCourier.get(r.courierCode) ?? { code: r.courierCode, name: courierName(r.courierCode) ?? r.courierCode, dispatched: 0, delivered: 0, returned: 0 };
        co.dispatched++;
        if (r.orderStatus === 'DELIVERED') co.delivered++;
        if (r.orderStatus === 'RETURNED') co.returned++;
        byCourier.set(r.courierCode, co);
      }

      if (!CLOSED.includes(r.orderStatus)) {
        for (const it of (Array.isArray(r.items) ? r.items : []) as any[]) {
          const name = String(it?.name ?? 'Item') + (it?.variant ? ` (${it.variant})` : '');
          const p = products.get(name) ?? { name, qty: 0, value: 0 };
          p.qty += Number(it?.quantity) || 0;
          p.value += (Number(it?.price) || 0) * (Number(it?.quantity) || 0);
          products.set(name, p);
        }
      }

      const pk = phoneKey(r.customerPhone);
      if (pk) { customers.add(pk); repeat.set(pk, (repeat.get(pk) ?? 0) + 1); }
    }

    // COD kitne din se courier ke paas atka (poore account ka, tareekh ka nahi)
    const collected = await this.prisma.channelOrder.findMany({
      where: { tenantId: user.tenantId, ...(scope.whereLoose as any), orderStatus: 'DELIVERED', paymentStatus: 'COLLECTED' },
      select: { deliveredAt: true, total: true, metadata: true },
      take: 10_000,
    });
    const aging = [
      { label: '0–7 din', min: 0, max: 7, count: 0, value: 0 },
      { label: '8–15 din', min: 8, max: 15, count: 0, value: 0 },
      { label: '16–30 din', min: 16, max: 30, count: 0, value: 0 },
      { label: '30+ din', min: 31, max: Infinity, count: 0, value: 0 },
    ];
    for (const o of collected) {
      const days = o.deliveredAt ? Math.floor((Date.now() - o.deliveredAt.getTime()) / 86_400_000) : 0;
      const b = aging.find((a) => days >= a.min && days <= a.max)!;
      b.count++; b.value += shopDue(o);
    }

    const withRto = <T extends { dispatched: number; returned: number; delivered: number }>(x: T) => ({ ...x, rtoRate: pct(x.returned, x.dispatched), deliveryRate: pct(x.delivered, x.dispatched) });
    const days: { day: string; orders: number; value: number; delivered: number }[] = [];
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86_400_000)) {
      const k = pkDay(d);
      if (!days.some((x) => x.day === k)) days.push(byDay.get(k) ?? { day: k, orders: 0, value: 0, delivered: 0 });
    }

    return {
      range: { from: pkDay(from), to: pkDay(to) },
      totals: {
        ...t,
        avgOrderValue: t.orders ? Math.round(t.value / t.orders) : 0,
        rtoRate: pct(t.returned, t.dispatched),
        cancelRate: pct(t.cancelled, t.orders),
        deliveryRate: pct(t.delivered, t.dispatched),
        avgAcceptMinutes: acceptN ? Math.round(acceptMin / acceptN) : null,
        avgDeliveryDays: deliverN ? Math.round((deliverDays / deliverN) * 10) / 10 : null,
        customers: customers.size,
        repeatCustomers: [...repeat.values()].filter((n) => n > 1).length,
      },
      byDay: days,
      byChannel: [...byChannel.values()].map(withRto).sort((a, b) => b.value - a.value),
      byCity: [...byCity.values()].map(withRto).sort((a, b) => b.orders - a.orders).slice(0, 20),
      riskyCities: [...byCity.values()].map(withRto).filter((c) => c.dispatched >= 5 && c.rtoRate >= 20).sort((a, b) => b.rtoRate - a.rtoRate).slice(0, 10),
      byCourier: [...byCourier.values()].map(withRto).sort((a, b) => b.dispatched - a.dispatched),
      topProducts: [...products.values()].sort((a, b) => b.value - a.value).slice(0, 15),
      codAging: aging.map(({ label, count, value }) => ({ label, count, value })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOMERS — dobara bechna (repeat, VIP, gayab, naye, RTO)
  // ═══════════════════════════════════════════════════════════

  async customers(user: AuthenticatedUser, scope: ShopScope, q: { segment?: string; search?: string; limit?: number; offset?: number }) {
    const rows = await this.prisma.channelOrder.findMany({
      where: { tenantId: user.tenantId, ...(scope.whereLoose as any), receivedAt: { gte: new Date(Date.now() - 730 * 86_400_000) }, customerPhone: { not: null } },
      select: { customerName: true, customerPhone: true, customerCity: true, orderStatus: true, total: true, receivedAt: true, metadata: true, integration: { select: { displayName: true } } },
      orderBy: { receivedAt: 'asc' },
      take: 50_000,
    });
    const blocks = new Set((await this.blocklist(user.tenantId)).map((b) => b.key));
    type C = {
      key: string; name: string; phone: string; city: string | null; orders: number; delivered: number; returned: number; cancelled: number;
      spent: number; firstAt: Date; lastAt: Date; lastDeliveredAt: Date | null; channels: Set<string>; blocked: boolean;
    };
    const map = new Map<string, C>();
    for (const r of rows) {
      if ((r.metadata as any)?.test) continue;
      const k = phoneKey(r.customerPhone);
      if (!k) continue;
      const c = map.get(k) ?? {
        key: k, name: r.customerName, phone: String(r.customerPhone), city: r.customerCity, orders: 0, delivered: 0, returned: 0, cancelled: 0,
        spent: 0, firstAt: r.receivedAt, lastAt: r.receivedAt, lastDeliveredAt: null, channels: new Set<string>(), blocked: blocks.has(k),
      };
      c.orders++;
      c.lastAt = r.receivedAt;
      c.name = r.customerName || c.name; // naya naam (aakhri order ka)
      c.city = r.customerCity || c.city;
      c.channels.add(r.integration.displayName);
      if (r.orderStatus === 'DELIVERED') { c.delivered++; c.spent += Number(r.total); c.lastDeliveredAt = r.receivedAt; }
      else if (r.orderStatus === 'RETURNED') c.returned++;
      else if (r.orderStatus === 'CANCELLED' || r.orderStatus === 'REJECTED') c.cancelled++;
      map.set(k, c);
    }
    const all = [...map.values()];
    const now = Date.now();
    const days = (d: Date) => Math.floor((now - d.getTime()) / 86_400_000);
    // VIP: sab se zyada kharchne wale 10% (kam az kam 2 deliver)
    const spentSorted = all.filter((c) => c.delivered >= 2).map((c) => c.spent).sort((a, b) => b - a);
    const vipCut = spentSorted.length ? spentSorted[Math.max(0, Math.ceil(spentSorted.length * 0.1) - 1)] : Infinity;

    const segOf = (c: C) => ({
      repeat: c.delivered >= 2,
      vip: c.delivered >= 2 && c.spent >= vipCut,
      inactive30: c.delivered > 0 && days(c.lastAt) >= 30,
      inactive60: c.delivered > 0 && days(c.lastAt) >= 60,
      inactive90: c.delivered > 0 && days(c.lastAt) >= 90,
      // Naye: pehla order haal hi me, aur wapas / block nahi (dobara bechne layak)
      new: c.orders === 1 && days(c.firstAt) <= 30 && c.returned === 0 && !c.blocked,
      risky: c.returned > 0,
      blocked: c.blocked,
    });
    const counts: Record<string, number> = { all: all.length, repeat: 0, vip: 0, inactive30: 0, inactive60: 0, inactive90: 0, new: 0, risky: 0, blocked: 0 };
    for (const c of all) for (const [k, v] of Object.entries(segOf(c))) if (v) counts[k]++;

    const seg = q.segment && q.segment in counts ? q.segment : 'all';
    const term = q.search?.trim().toLowerCase();
    const digits = term?.replace(/\D/g, '');
    let list = all.filter((c) => seg === 'all' || (segOf(c) as any)[seg]);
    if (term) list = list.filter((c) => c.name.toLowerCase().includes(term) || (!!digits && digits.length >= 3 && c.key.includes(digits)) || (c.city ?? '').toLowerCase().includes(term));
    list.sort((a, b) => (seg === 'inactive30' || seg === 'inactive60' || seg === 'inactive90') ? a.lastAt.getTime() - b.lastAt.getTime() : b.spent - a.spent || b.orders - a.orders);
    const take = Math.min(Math.max(q.limit ?? 50, 1), 500);
    const skip = Math.max(q.offset ?? 0, 0);
    return {
      counts,
      totals: { customers: all.length, spent: all.reduce((s, c) => s + c.spent, 0), repeatRate: pct(counts.repeat, all.filter((c) => c.delivered > 0).length) },
      total: list.length,
      rows: list.slice(skip, skip + take).map((c) => ({
        key: c.key, name: c.name, phone: c.phone, city: c.city, orders: c.orders, delivered: c.delivered, returned: c.returned, cancelled: c.cancelled,
        spent: Math.round(c.spent), avgOrder: c.delivered ? Math.round(c.spent / c.delivered) : 0, firstAt: c.firstAt, lastAt: c.lastAt,
        daysSince: days(c.lastAt), channels: [...c.channels], blocked: c.blocked, segments: Object.entries(segOf(c)).filter(([, v]) => v).map(([k]) => k),
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CSV — hisaab ke liye (Excel me khulta hai)
  // ═══════════════════════════════════════════════════════════

  async exportCsv(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; status?: string; integrationId?: string }) {
    const to = q.to ? new Date(`${q.to}T23:59:59+05:00`) : new Date();
    const from = q.from ? new Date(`${q.from}T00:00:00+05:00`) : new Date(to.getTime() - 29 * 86_400_000);
    if (isNaN(+from) || isNaN(+to)) throw new BadRequestException('Tareekh sahi nahi');
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(scope.whereLoose as any),
        receivedAt: { gte: from, lte: to },
        ...(q.status ? { orderStatus: q.status } : {}),
        ...(q.integrationId ? { integrationId: q.integrationId } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: 20_000,
      select: {
        externalOrderNumber: true, externalOrderId: true, receivedAt: true, customerName: true, customerPhone: true, customerCity: true,
        customerAddress: true, items: true, subtotal: true, deliveryFee: true, discount: true, total: true, paymentMethod: true,
        paymentStatus: true, orderStatus: true, courierCode: true, courierName: true, trackingNumber: true, nafaaSaleId: true,
        dispatchedAt: true, deliveredAt: true, codSettledAt: true, codSettlementRef: true, integration: { select: { displayName: true } },
      },
    });
    const saleIds = rows.map((r) => r.nafaaSaleId).filter((x): x is string => !!x);
    const sales = saleIds.length
      ? await this.prisma.sale.findMany({ where: { id: { in: saleIds }, tenantId: user.tenantId }, select: { id: true, saleNumber: true } })
      : [];
    const header = ['Order', 'Date', 'Channel', 'Customer', 'Phone', 'City', 'Address', 'Items', 'Subtotal', 'Delivery', 'Discount', 'Total',
      'Payment method', 'Payment', 'Status', 'Courier', 'CN', 'Bill', 'Dispatched', 'Delivered', 'COD settled', 'Settlement ref'];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      // Excel formula injection se bachao
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const dt = (d: Date | null) => (d ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'short', timeStyle: 'short' }).format(d) : '');
    const lines = rows.map((r) => [
      String(r.externalOrderNumber ?? r.externalOrderId).replace(/^#+/, ''), dt(r.receivedAt), r.integration.displayName, r.customerName, r.customerPhone,
      r.customerCity, r.customerAddress,
      ((r.items as any[]) ?? []).map((i) => `${i?.name ?? ''}${i?.variant ? ` (${i.variant})` : ''} x${i?.quantity ?? 1}`).join('; '),
      Number(r.subtotal), Number(r.deliveryFee), Number(r.discount), Number(r.total), r.paymentMethod, r.paymentStatus, r.orderStatus,
      r.courierName ?? courierName(r.courierCode), r.trackingNumber, sales.find((s) => s.id === r.nafaaSaleId)?.saleNumber ?? '',
      dt(r.dispatchedAt), dt(r.deliveredAt), dt(r.codSettledAt), r.codSettlementRef,
    ].map(esc).join(','));
    // BOM: Excel Urdu/Roman text sahi dikhaye
    return '﻿' + [header.join(','), ...lines].join('\r\n');
  }
}
