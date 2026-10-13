import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  AuditContext, AuditEvent, auditContext, bucketKeys, bucketOf, hoursText, isAfterHours, localHour, num, r2, shifted, within,
} from './audit-context';
import { CAP, collectEvents } from './audit-sources';
import { AUDIT_TYPES, AuditEventsDto, AuditFilterDto, AuditLoginsDto, AuditType, Severity } from './dto/audit.dto';

const WEIGHT: Record<Severity, number> = { high: 8, medium: 3, low: 1 };
const RANK: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
const LOSS_TYPES = new Set<AuditType>(['stock_loss', 'damage', 'transfer_short']);

export interface StaffRow {
  id: string | null; name: string; role: string | null; shop: string | null;
  bills: number; sales: number;
  voids: number; voidValue: number; refunds: number; refundValue: number; cashRefunds: number;
  discounts: number; discountValue: number; belowCost: number;
  drawerShort: number; drawerOver: number; shortCount: number; cashOut: number;
  /** Stock written off, damaged or lost in transfer, at cost. */
  cost: number;
  pinFailed: number; afterHours: number; events: number; high: number;
  points: number; score: number; level: Severity; topType: AuditType | null;
}

export interface Insight { tone: 'bad' | 'warn'; title: string; text: string; userId?: string | null; type?: AuditType; eventId?: string }

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

/**
 * Audit and loss prevention: every risky event of a period in one place, a
 * risk score per staff member, a timeline, charts and the short list of
 * things the owner should look at first.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tzs: TenantTimezoneService,
  ) {}

  async overview(user: AuthenticatedUser, scope: ShopScope, q: AuditFilterDto) {
    const c = await auditContext(this.prisma, this.tzs, user, scope, q);
    const [{ events, failed, capped }, previous, sales, people] = await Promise.all([
      collectEvents(this.prisma, c),
      c.prev ? collectEvents(this.prisma, shifted(c, c.prev)).then((r) => summary(r.events)) : Promise.resolve(null),
      this.salesByStaff(c),
      this.people(c.tenantId),
    ]);
    const names = new Map(people.map((p) => [p.id, p]));
    const shops = await this.shops(c.tenantId);

    const staff = this.staffRows(events, sales, names, shops);
    const totalBills = sales.reduce((s, x) => s + x.bills, 0);
    const totalSales = sales.reduce((s, x) => s + x.net, 0);

    // Charts
    const keys = bucketKeys(c, events.length ? bucketOf(c, events[events.length - 1].at) : null);
    const trend = new Map(keys.map((k) => [k, { key: k, high: 0, medium: 0, low: 0 }]));
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, high: 0, medium: 0, low: 0 }));
    const byType = new Map<AuditType, { type: AuditType; count: number; amount: number; cost: number; high: number }>();
    const byShop = new Map<string, { id: string; name: string; events: number; high: number; voids: number; refundValue: number; drawerShort: number }>();
    for (const e of events) {
      const t = trend.get(bucketOf(c, e.at));
      if (t) t[e.severity] += 1;
      hours[localHour(c, e.at)][e.severity] += 1;
      const bt = byType.get(e.type) ?? { type: e.type, count: 0, amount: 0, cost: 0, high: 0 };
      bt.count += 1;
      bt.amount += Math.abs(e.amount);
      bt.cost += e.cost ?? 0;
      if (e.severity === 'high') bt.high += 1;
      byType.set(e.type, bt);
      if (e.shopId) {
        const s = byShop.get(e.shopId) ?? { id: e.shopId, name: shops.get(e.shopId) ?? 'Branch', events: 0, high: 0, voids: 0, refundValue: 0, drawerShort: 0 };
        s.events += 1;
        if (e.severity === 'high') s.high += 1;
        if (e.type === 'void') s.voids += 1;
        if (e.type === 'refund') s.refundValue += e.amount;
        if (e.type === 'drawer' && e.amount < 0) s.drawerShort += -e.amount;
        byShop.set(e.shopId, s);
      }
    }

    const sum = summary(events);
    return {
      range: { from: c.fromKey ?? 'all', to: c.toKey, grouping: c.monthly ? 'month' : 'day' },
      settings: { discountPct: c.discountPct, big: c.big, hours: hoursText(c), maxDiscountPct: c.maxDiscountPct, branch: c.shopId },
      totals: { ...sum, bills: totalBills, sales: r2(totalSales), voidRate: r2(pct(sum.voids, totalBills + sum.voids)), refundRate: r2(pct(sum.refundValue, totalSales)) },
      previous,
      byType: AUDIT_TYPES.map((t) => byType.get(t)).filter(Boolean).map((t) => ({ ...t!, amount: r2(t!.amount), cost: r2(t!.cost) })),
      trend: [...trend.values()],
      hours,
      staff,
      shops: c.shopId ? [] : [...byShop.values()].sort((a, b) => b.high - a.high || b.events - a.events).map((s) => ({ ...s, refundValue: r2(s.refundValue), drawerShort: r2(s.drawerShort) })),
      watch: this.insights(events, staff, totalBills, totalSales, names, c),
      people: people.filter((p) => !c.branchUsers || c.branchUsers.includes(p.id)).map((p) => ({ id: p.id, name: p.fullName, role: p.role })),
      failed, capped,
    };
  }

  async events(user: AuthenticatedUser, scope: ShopScope, q: AuditEventsDto) {
    const c = await auditContext(this.prisma, this.tzs, user, scope, q);
    const [{ events, failed, capped }, people, shops] = await Promise.all([collectEvents(this.prisma, c), this.people(c.tenantId), this.shops(c.tenantId)]);
    const names = new Map(people.map((p) => [p.id, p.fullName]));
    const counts: Partial<Record<AuditType, number>> = {};
    const sevCounts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
    const term = q.search?.trim().toLowerCase();

    // Type counts follow search and severity; severity counts follow search and type.
    let rows = events.filter((e) => {
      if (term) {
        const hay = `${e.title} ${e.detail ?? ''} ${e.flags.join(' ')} ${(e.userId && names.get(e.userId)) ?? ''} ${e.ref.code ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (!q.type || e.type === q.type) sevCounts[e.severity] += 1;
      if (q.severity && e.severity !== q.severity) return false;
      counts[e.type] = (counts[e.type] ?? 0) + 1;
      return !q.type || e.type === q.type;
    });

    const sort = q.sort ?? 'new';
    if (sort === 'old') rows = rows.reverse();
    else if (sort === 'amount') rows.sort((a, b) => Math.max(Math.abs(b.amount), b.cost ?? 0) - Math.max(Math.abs(a.amount), a.cost ?? 0));
    else if (sort === 'severity') rows.sort((a, b) => RANK[b.severity] - RANK[a.severity] || b.at.getTime() - a.at.getTime());

    const limit = q.limit ?? 40;
    const page = q.page ?? 1;
    const slice = rows.slice((page - 1) * limit, page * limit);
    return {
      items: slice.map((e) => ({
        ...e,
        cost: c.showCost ? e.cost : undefined,
        userName: e.userId ? names.get(e.userId) ?? 'Hataya gaya user' : null,
        shopName: e.shopId ? shops.get(e.shopId) ?? null : null,
      })),
      total: rows.length, page, hasMore: page * limit < rows.length,
      counts, severities: sevCounts, failed, capped,
    };
  }

  async logins(user: AuthenticatedUser, scope: ShopScope, q: AuditLoginsDto) {
    const c = await auditContext(this.prisma, this.tzs, user, scope, q);
    const users = c.staffId ? (c.branchUsers && !c.branchUsers.includes(c.staffId) ? [] : [c.staffId]) : c.branchUsers;
    const status = q.status ?? 'all';
    const people = await this.people(c.tenantId);
    const names = new Map(people.map((p) => [p.id, p.fullName]));
    const empty = users !== null && users.length === 0;
    const rows = empty ? [] : await this.prisma.loginHistory.findMany({
      where: {
        tenantId: c.tenantId, createdAt: within(c),
        // The owner's own logins and devices stay private from staff.
        AND: [users ? { userId: { in: users } } : {}, c.privateUsers?.length ? { userId: { notIn: c.privateUsers } } : {}],
      },
      select: { id: true, userId: true, email: true, success: true, failureReason: true, deviceName: true, deviceFingerprint: true, location: true, ipAddress: true, isNewDevice: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: CAP,
    });

    const byUser = new Map<string, { id: string; name: string; logins: number; failed: number; newDevices: number; afterHours: number; devices: Set<string>; last: Date | null }>();
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, ok: 0, failed: 0 }));
    const devices = new Set<string>();
    let ok = 0; let bad = 0; let fresh = 0; let late = 0;
    const list = rows.map((l) => ({ ...l, afterHours: isAfterHours(c, l.createdAt) }));
    for (const l of list) {
      const device = l.deviceFingerprint ?? l.deviceName ?? l.ipAddress ?? '—';
      devices.add(device);
      const u = byUser.get(l.userId) ?? { id: l.userId, name: names.get(l.userId) ?? l.email, logins: 0, failed: 0, newDevices: 0, afterHours: 0, devices: new Set<string>(), last: null };
      if (l.success) { ok += 1; u.logins += 1; hours[localHour(c, l.createdAt)].ok += 1; if (!u.last) u.last = l.createdAt; } else { bad += 1; u.failed += 1; hours[localHour(c, l.createdAt)].failed += 1; }
      if (l.isNewDevice && l.success) { fresh += 1; u.newDevices += 1; }
      if (l.afterHours && l.success) { late += 1; u.afterHours += 1; }
      u.devices.add(device);
      byUser.set(l.userId, u);
    }
    const filtered = list.filter((l) => status === 'all' || (status === 'failed' ? !l.success : status === 'new' ? l.isNewDevice && l.success : l.afterHours && l.success));
    const limit = q.limit ?? 50;
    const page = q.page ?? 1;
    return {
      totals: { logins: ok, failed: bad, newDevices: fresh, afterHours: late, devices: devices.size, people: byUser.size, hours: hoursText(c) },
      people: [...byUser.values()]
        .map(({ devices: d, ...u }) => ({ ...u, devices: d.size }))
        .sort((a, b) => b.failed + b.newDevices * 2 - (a.failed + a.newDevices * 2) || b.logins - a.logins),
      hours,
      items: filtered.slice((page - 1) * limit, page * limit).map(({ deviceFingerprint: _f, ...l }) => ({ ...l, userName: names.get(l.userId) ?? l.email })),
      total: filtered.length, page, hasMore: page * limit < filtered.length, capped: rows.length >= CAP,
    };
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private async salesByStaff(c: AuditContext) {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ uid: string | null; bills: number; net: number }>>`
        SELECT COALESCE(s."soldById", s."createdById") AS uid, COUNT(*)::int AS bills, COALESCE(SUM(s.total - s."refundedAmount"), 0)::float AS net
        FROM "Sale" s
        WHERE s."tenantId" = ${c.tenantId} AND s.status::text <> 'VOIDED'
          ${c.gte ? Prisma.sql`AND s."soldAt" >= ${c.gte}` : Prisma.empty} AND s."soldAt" < ${c.lt}
          ${c.shopId ? Prisma.sql`AND s."shopId" = ${c.shopId}` : Prisma.empty}
          ${c.staffId ? Prisma.sql`AND COALESCE(s."soldById", s."createdById") = ${c.staffId}` : Prisma.empty}
        GROUP BY 1`;
      return rows.map((r) => ({ uid: r.uid, bills: num(r.bills), net: num(r.net) }));
    } catch {
      return [];
    }
  }

  private people(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, role: true, shopId: true, isActive: true },
      orderBy: { fullName: 'asc' },
    });
  }

  private async shops(tenantId: string) {
    const rows = await this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } });
    return new Map(rows.map((s) => [s.id, s.name]));
  }

  private staffRows(
    events: AuditEvent[],
    sales: Array<{ uid: string | null; bills: number; net: number }>,
    names: Map<string, { fullName: string; role: string; shopId: string | null }>,
    shops: Map<string, string>,
  ): StaffRow[] {
    const rows = new Map<string, StaffRow>();
    const row = (id: string | null) => {
      const key = id ?? '—';
      let r = rows.get(key);
      if (!r) {
        const p = id ? names.get(id) : undefined;
        r = {
          id, name: p?.fullName ?? (id ? 'Hataya gaya user' : 'Pata nahi'), role: p?.role ?? null, shop: p?.shopId ? shops.get(p.shopId) ?? null : null,
          bills: 0, sales: 0, voids: 0, voidValue: 0, refunds: 0, refundValue: 0, cashRefunds: 0, discounts: 0, discountValue: 0, belowCost: 0,
          drawerShort: 0, drawerOver: 0, shortCount: 0, cashOut: 0, cost: 0, pinFailed: 0, afterHours: 0, events: 0, high: 0,
          points: 0, score: 0, level: 'low', topType: null,
        };
        rows.set(key, r);
      }
      return r;
    };
    for (const s of sales) { const r = row(s.uid); r.bills += s.bills; r.sales += s.net; }
    const typePoints = new Map<string, Map<AuditType, number>>();
    for (const e of events) {
      const r = row(e.userId);
      r.events += 1;
      if (e.severity === 'high') r.high += 1;
      if (e.afterHours && e.type !== 'login') r.afterHours += 1;
      r.points += WEIGHT[e.severity];
      const tp = typePoints.get(e.userId ?? '—') ?? new Map<AuditType, number>();
      tp.set(e.type, (tp.get(e.type) ?? 0) + WEIGHT[e.severity]);
      typePoints.set(e.userId ?? '—', tp);
      if (e.type === 'void') { r.voids += 1; r.voidValue += e.amount; }
      if (e.type === 'refund') { r.refunds += 1; r.refundValue += e.amount; if (e.flags.includes('Cash wapas diya')) r.cashRefunds += 1; }
      if (e.type === 'discount') { r.discounts += 1; r.discountValue += e.amount; }
      if (e.type === 'below_cost') r.belowCost += 1;
      if (e.type === 'drawer' && e.amount < 0) { r.drawerShort += -e.amount; r.shortCount += 1; }
      if (e.type === 'drawer' && e.amount > 0) r.drawerOver += e.amount;
      if (e.type === 'cash_out') r.cashOut += e.amount;
      if (LOSS_TYPES.has(e.type)) r.cost += e.cost ?? 0;
      if (e.type === 'pin' && e.title === 'Ghalat PIN dala') r.pinFailed += 1;
    }

    // Against the shop's own average: a high void or refund rate adds to the score.
    const all = [...rows.values()];
    const bills = all.reduce((s, r) => s + r.bills, 0);
    const sold = all.reduce((s, r) => s + r.sales, 0);
    const voidRate = pct(all.reduce((s, r) => s + r.voids, 0), bills);
    const refundRate = pct(all.reduce((s, r) => s + r.refundValue, 0), sold);
    for (const r of all) {
      if (r.bills >= 20 && r.voids >= 3 && pct(r.voids, r.bills) > voidRate * 2) r.points += 10;
      if (r.sales > 0 && r.refunds >= 3 && pct(r.refundValue, r.sales) > refundRate * 2) r.points += 10;
      if (r.shortCount >= 3) r.points += 6;
      r.score = Math.round(100 * (1 - Math.exp(-r.points / 40)));
      r.level = r.score >= 70 ? 'high' : r.score >= 40 ? 'medium' : 'low';
      const tp = typePoints.get(r.id ?? '—');
      r.topType = tp ? [...tp.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
      for (const k of ['sales', 'voidValue', 'refundValue', 'discountValue', 'drawerShort', 'drawerOver', 'cashOut', 'cost'] as const) r[k] = r2(r[k]);
    }
    return all.sort((a, b) => b.score - a.score || b.events - a.events || b.bills - a.bills);
  }

  /** Plain-language list of what deserves a look, most serious first. */
  private insights(
    events: AuditEvent[], staff: StaffRow[], bills: number, sales: number,
    names: Map<string, { fullName: string }>, c: AuditContext,
  ): Insight[] {
    const out: Insight[] = [];
    const voids = staff.reduce((s, r) => s + r.voids, 0);
    const avgVoid = pct(voids, bills);
    const refunds = staff.reduce((s, r) => s + r.refundValue, 0);
    const avgRefund = pct(refunds, sales);
    const discounts = staff.reduce((s, r) => s + r.discountValue, 0);
    const avgDiscount = pct(discounts, sales);

    for (const r of staff) {
      if (!r.id) continue;
      const vr = pct(r.voids, r.bills);
      if (r.bills >= 20 && r.voids >= 3 && vr > avgVoid * 2) {
        out.push({ tone: 'bad', title: `${r.name} ke void bill zyada hain`, text: `${r.bills} me se ${r.voids} bill void (${vr.toFixed(1)}%). Dukaan ka ausat ${avgVoid.toFixed(1)}% hai.`, userId: r.id, type: 'void' });
      }
      const rr = pct(r.refundValue, r.sales);
      if (r.sales > 0 && r.refunds >= 3 && rr > avgRefund * 2) {
        out.push({ tone: 'bad', title: `${r.name} ki return zyada hai`, text: `${money(r.refundValue)} wapas kiye — un ki sale ka ${rr.toFixed(1)}%. Ausat ${avgRefund.toFixed(1)}%.${r.cashRefunds ? ` ${r.cashRefunds} cash me.` : ''}`, userId: r.id, type: 'refund' });
      }
      const dr = pct(r.discountValue, r.sales);
      if (r.sales > 0 && r.discounts >= 5 && dr > avgDiscount * 2) {
        out.push({ tone: 'warn', title: `${r.name} discount zyada dete hain`, text: `${r.discounts} bill par ${money(r.discountValue)} ki haath ki discount — sale ka ${dr.toFixed(1)}%. Ausat ${avgDiscount.toFixed(1)}%.`, userId: r.id, type: 'discount' });
      }
      if (r.shortCount >= 3 || r.drawerShort >= c.big / 2) {
        out.push({ tone: 'bad', title: `${r.name} ka drawer baar baar kam`, text: `${r.shortCount} dafa drawer kam nikla, kul ${money(r.drawerShort)}.`, userId: r.id, type: 'drawer' });
      }
      if (r.pinFailed >= 3) {
        out.push({ tone: 'bad', title: `${r.name} ne ${r.pinFailed} dafa ghalat PIN dala`, text: 'Koi malik ka PIN andaze se khol raha ho sakta hai. PIN badal dein.', userId: r.id, type: 'pin' });
      }
      if (r.afterHours >= 3) {
        out.push({ tone: 'warn', title: `${r.name} dukaan band hone ke baad kaam karte hain`, text: `${r.afterHours} kaam dukaan ke waqt (${hoursText(c)}) se bahar hue.`, userId: r.id });
      }
    }

    const selfApproved = events.filter((e) => e.type === 'damage' && e.flags.includes('Khud report, khud manzoor'));
    if (selfApproved.length) {
      out.push({ tone: 'warn', title: `${selfApproved.length} damage report khud hi approve`, text: 'Jis ne kharab maal likha, usi ne approve bhi kiya. Doosra banda check kare to behtar hai.', type: 'damage' });
    }
    const failedLogins = new Map<string, number>();
    for (const e of events) if (e.type === 'login' && e.title === 'Login nakam' && e.userId) failedLogins.set(e.userId, (failedLogins.get(e.userId) ?? 0) + 1);
    for (const [id, n] of failedLogins) {
      if (n >= 5) out.push({ tone: 'warn', title: `${names.get(id)?.fullName ?? 'Ek user'} ke ${n} nakam login`, text: 'Ghalat password baar baar. Agar ye woh khud nahi the to password badlein.', userId: id, type: 'login' });
    }

    const seen = new Set(out.map((i) => i.eventId));
    const top = events
      .filter((e) => e.severity === 'high')
      .sort((a, b) => Math.max(Math.abs(b.amount), b.cost ?? 0) - Math.max(Math.abs(a.amount), a.cost ?? 0));
    for (const e of top) {
      if (out.length >= 12) break;
      if (seen.has(e.id)) continue;
      const who = e.userId ? names.get(e.userId)?.fullName : null;
      out.push({ tone: 'bad', title: e.title, text: [who, ...e.flags].filter(Boolean).join(' · '), userId: e.userId, type: e.type, eventId: e.id });
    }
    return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'bad' ? -1 : 1)).slice(0, 12);
  }
}

/** Headline counts of a list of events (also used for the previous period). */
function summary(events: AuditEvent[]) {
  const s = {
    events: events.length, high: 0, medium: 0, low: 0, afterHours: 0,
    voids: 0, voidValue: 0, refunds: 0, refundValue: 0, cashRefunds: 0, cashRefundValue: 0,
    discounts: 0, discountValue: 0, belowCost: 0, drawerShort: 0, drawerOver: 0, shortCount: 0, overCount: 0,
    cashOuts: 0, cashOutValue: 0, losses: 0, pinFailed: 0, pinApproved: 0, settings: 0, failedLogins: 0, newDevices: 0,
    /** Stock written off, damaged or short in transfers, at cost. */
    cost: 0,
  };
  for (const e of events) {
    s[e.severity] += 1;
    if (e.afterHours) s.afterHours += 1;
    switch (e.type) {
      case 'void': s.voids += 1; s.voidValue += e.amount; break;
      case 'refund':
        s.refunds += 1; s.refundValue += e.amount;
        if (e.flags.includes('Cash wapas diya')) { s.cashRefunds += 1; s.cashRefundValue += e.amount; }
        break;
      case 'discount': s.discounts += 1; s.discountValue += e.amount; break;
      case 'below_cost': s.belowCost += 1; break;
      case 'drawer':
        if (e.amount < 0) { s.drawerShort += -e.amount; s.shortCount += 1; } else if (e.amount > 0) { s.drawerOver += e.amount; s.overCount += 1; }
        break;
      case 'cash_out': s.cashOuts += 1; s.cashOutValue += e.amount; break;
      case 'pin': if (e.title === 'Ghalat PIN dala') s.pinFailed += 1; else if (e.title === 'Wapsi PIN se manzoor') s.pinApproved += 1; break;
      case 'settings': s.settings += 1; break;
      case 'login': if (e.title === 'Login nakam') s.failedLogins += 1; else s.newDevices += 1; break;
      default: break;
    }
    if (LOSS_TYPES.has(e.type)) { s.losses += 1; s.cost += e.cost ?? 0; }
  }
  for (const k of ['voidValue', 'refundValue', 'cashRefundValue', 'discountValue', 'drawerShort', 'drawerOver', 'cashOutValue', 'cost'] as const) s[k] = r2(s[k]);
  return s;
}
