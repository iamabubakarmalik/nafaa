/**
 * Industry sections of the report centre. Each business type returns the
 * same block shape (headline numbers, charts and tables) so the web page
 * renders, prints and exports any of them with one component. Periods are
 * business days; records are scoped to the tenant and, where the record
 * carries a branch, to the branch. Cost figures are dropped for users
 * without cost access.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { DAY, canSeeCost, localTime, num, r2, reportRange, saleSql, within, type ReportQuery, type ReportRange } from './report-range';

export type Fmt = 'money' | 'cost' | 'count' | 'qty' | 'pct' | 'text' | 'date' | 'kg' | 'grams' | 'sqft' | 'min' | 'litre';
export interface BlockKpi { label: string; value: number; fmt: Fmt; hint?: string }
export interface BlockChart { title: string; kind: 'bar' | 'pie'; fmt: Fmt; data: Array<{ name: string; value: number }> }
export interface BlockTable { title: string; hint?: string; columns: Array<{ label: string; fmt: Fmt }>; rows: Array<Array<string | number | null>> }
export interface Block { kpis: BlockKpi[]; charts: BlockChart[]; tables: BlockTable[]; notes: string[] }

type Ctx = { user: AuthenticatedUser; scope: ShopScope; r: ReportRange; tenantId: string; shop: { shopId?: string } };
type SoldRow = { key: string | null; qty: number; revenue: number; cost: number; bills: number };

/** "DINE_IN" → "Dine in". */
const pretty = (v: string | null | undefined, none = 'Baghair') =>
  v ? v.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : none;
const chart = (title: string, kind: 'bar' | 'pie', fmt: Fmt, data: Array<{ name: string; value: number }>): BlockChart =>
  ({ title, kind, fmt, data: data.filter((d) => d.value > 0) });
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const empty = (): Block => ({ kpis: [], charts: [], tables: [], notes: [] });

export const INDUSTRY_KINDS = [
  'restaurant', 'clinic', 'gym', 'jewelry', 'mobile', 'carpet', 'pharmacy', 'bakery', 'agri', 'garments',
  'electronics', 'appliances', 'hardware', 'dairy', 'meat', 'autoparts', 'bookstore', 'services-biz',
] as const;
export type IndustryKind = (typeof INDUSTRY_KINDS)[number];

@Injectable()
export class ReportsIndustryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async block(user: AuthenticatedUser, scope: ShopScope, kind: string, q: ReportQuery) {
    if (!(INDUSTRY_KINDS as readonly string[]).includes(kind)) throw new BadRequestException('Is karobar ki report nahi');
    const r = await reportRange(this.tz, user.tenantId, q);
    const ctx: Ctx = { user, scope, r, tenantId: user.tenantId, shop: scope.where };
    const builders: Record<IndustryKind, (c: Ctx) => Promise<Block>> = {
      restaurant: (c) => this.restaurant(c),
      clinic: (c) => this.clinic(c),
      gym: (c) => this.gym(c),
      jewelry: (c) => this.jewelry(c),
      mobile: (c) => this.mobile(c),
      carpet: (c) => this.carpet(c),
      pharmacy: (c) => this.pharmacy(c),
      bakery: (c) => this.bakery(c),
      agri: (c) => this.agri(c),
      garments: (c) => this.garments(c),
      electronics: (c) => this.electronics(c),
      appliances: (c) => this.appliances(c),
      hardware: (c) => this.hardware(c),
      dairy: (c) => this.dairy(c),
      meat: (c) => this.meat(c),
      autoparts: (c) => this.autoparts(c),
      bookstore: (c) => this.bookstore(c),
      'services-biz': (c) => this.servicesBiz(c),
    };
    const block = await builders[kind as IndustryKind](ctx);
    return {
      kind, from: r.fromKey, to: r.toKey,
      ...(canSeeCost(user) ? block : withoutCost(block)),
    };
  }

  // ─── shared helpers ───────────────────────────────────────

  /** Sales lines grouped by a column of a joined profile table, net of returns. */
  private soldBy(c: Ctx, join: Prisma.Sql, key: Prisma.Sql, limit = 25) {
    return this.prisma.$queryRaw<SoldRow[]>`
      SELECT ${key} AS key, SUM(si.quantity - si."returnedQty")::float AS qty,
        SUM(CASE WHEN si.quantity > 0 THEN si.total * (si.quantity - si."returnedQty") / si.quantity ELSE 0 END)::float AS revenue,
        SUM((si.quantity - si."returnedQty") * si."costPrice")::float AS cost,
        COUNT(DISTINCT si."saleId")::int AS bills
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" ${join}
      WHERE ${saleSql(c.tenantId, c.scope, c.r)}
      GROUP BY 1 ORDER BY revenue DESC LIMIT ${limit}::int`;
  }

  private soldTable(title: string, keyLabel: string, rows: SoldRow[], label: (k: string | null) => string, unit: Fmt = 'qty'): BlockTable {
    return {
      title,
      columns: [{ label: keyLabel, fmt: 'text' }, { label: 'Miqdar', fmt: unit }, { label: 'Bill', fmt: 'count' }, { label: 'Bikri', fmt: 'money' }, { label: 'Munafa', fmt: 'cost' }],
      rows: rows.map((x) => [label(x.key), r2(x.qty), x.bills, r2(x.revenue), r2(x.revenue - x.cost)]),
    };
  }

  /** Names for ids that may belong to a login user or a staff record. */
  private async people(ids: Array<string | null | undefined>) {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map<string, string>();
    const [users, staff] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, fullName: true } }),
      this.prisma.staff.findMany({ where: { id: { in: list } }, select: { id: true, fullName: true } }),
    ]);
    return new Map([...staff.map((s) => [s.id, s.fullName] as const), ...users.map((u) => [u.id, u.fullName] as const)]);
  }

  // ─── Restaurant ───────────────────────────────────────────

  private async restaurant(c: Ctx): Promise<Block> {
    const where: Prisma.RestaurantOrderWhereInput = { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r) };
    const live: Prisma.RestaurantOrderWhereInput = { ...where, status: { notIn: ['CANCELLED', 'DRAFT'] } };
    const [all, byMode, byTable, byWaiter, cancelled, kots, prep, tables] = await Promise.all([
      this.prisma.restaurantOrder.aggregate({ where: live, _sum: { total: true, numberOfGuests: true, tip: true, deliveryFee: true }, _count: { _all: true } }),
      this.prisma.restaurantOrder.groupBy({ by: ['mode'], where: live, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.restaurantOrder.groupBy({ by: ['tableId'], where: { ...live, tableId: { not: null } }, _sum: { total: true, numberOfGuests: true }, _count: { _all: true }, orderBy: { _sum: { total: 'desc' } }, take: 15 }),
      this.prisma.restaurantOrder.groupBy({ by: ['waiterId'], where: { ...live, waiterId: { not: null } }, _sum: { total: true, tip: true }, _count: { _all: true }, orderBy: { _sum: { total: 'desc' } }, take: 15 }),
      this.prisma.restaurantOrder.aggregate({ where: { ...where, status: 'CANCELLED' }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.kot.groupBy({ by: ['status'], where: { tenantId: c.tenantId, createdAt: within(c.r), ...(c.scope.shopId && { order: { shopId: c.scope.shopId } }) }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ avg: number | null; slow: number }>>`
        SELECT AVG(EXTRACT(EPOCH FROM (k."readyAt" - k."cookingStartedAt")) / 60)::float AS avg,
          COUNT(*) FILTER (WHERE k."readyAt" - k."cookingStartedAt" > interval '30 minutes')::int AS slow
        FROM "Kot" k JOIN "RestaurantOrder" o ON o.id = k."orderId"
        WHERE k."tenantId" = ${c.tenantId} AND k."readyAt" IS NOT NULL AND k."cookingStartedAt" IS NOT NULL
          ${c.scope.shopId ? Prisma.sql`AND o."shopId" = ${c.scope.shopId}` : Prisma.empty}
          ${c.r.gte ? Prisma.sql`AND k."createdAt" >= ${c.r.gte}` : Prisma.empty} AND k."createdAt" < ${c.r.lt}`,
      this.prisma.restaurantTableV2.findMany({ where: { tenantId: c.tenantId, ...c.shop, isActive: true }, select: { id: true, tableNumber: true, tableName: true, capacity: true } }),
    ]);
    const waiters = await this.people(byWaiter.map((w) => w.waiterId));
    const tName = new Map(tables.map((t) => [t.id, t.tableName || `Table ${t.tableNumber}`]));
    const orders = all._count._all;
    const revenue = num(all._sum.total);
    const b = empty();
    b.kpis = [
      { label: 'Orders', value: orders, fmt: 'count', hint: `${cancelled._count._all} cancel` },
      { label: 'Orders ki raqam', value: r2(revenue), fmt: 'money' },
      { label: 'Ausat order', value: orders ? r2(revenue / orders) : 0, fmt: 'money' },
      { label: 'Mehman', value: num(all._sum.numberOfGuests), fmt: 'count' },
      { label: 'Kitchen ka ausat waqt', value: r2(num(prep[0]?.avg)), fmt: 'min', hint: `${num(prep[0]?.slow)} KOT 30 min se zyada` },
      { label: 'Tables istemal hui', value: byTable.length, fmt: 'count', hint: `${tables.length} me se` },
      { label: 'Tip', value: r2(num(all._sum.tip)), fmt: 'money' },
    ];
    b.charts = [
      chart('Order ki qism (raqam)', 'pie', 'money', byMode.map((m) => ({ name: pretty(m.mode), value: r2(num(m._sum.total)) }))),
      chart('KOT ki halat', 'bar', 'count', kots.map((k) => ({ name: pretty(k.status), value: k._count._all }))),
    ];
    b.tables = [
      { title: 'Order ki qism', columns: [{ label: 'Qism', fmt: 'text' }, { label: 'Orders', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }, { label: 'Ausat', fmt: 'money' }],
        rows: byMode.sort((a, z) => num(z._sum.total) - num(a._sum.total)).map((m) => [pretty(m.mode), m._count._all, r2(num(m._sum.total)), m._count._all ? r2(num(m._sum.total) / m._count._all) : 0]) },
      { title: 'Sab se zyada kamane wali tables', columns: [{ label: 'Table', fmt: 'text' }, { label: 'Orders', fmt: 'count' }, { label: 'Mehman', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }],
        rows: byTable.map((t) => [tName.get(t.tableId!) ?? 'Table', t._count._all, num(t._sum.numberOfGuests), r2(num(t._sum.total))]) },
      { title: 'Waiter', columns: [{ label: 'Naam', fmt: 'text' }, { label: 'Orders', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }, { label: 'Tip', fmt: 'money' }],
        rows: byWaiter.map((w) => [waiters.get(w.waiterId!) ?? 'Waiter', w._count._all, r2(num(w._sum.total)), r2(num(w._sum.tip))]) },
    ];
    if (!orders) b.notes.push('Is muddat me restaurant orders nahi bane. POS ki seedhi bikri Bikri aur Maal tabs me hai.');
    return b;
  }

  // ─── Clinic ───────────────────────────────────────────────

  private async clinic(c: Ctx): Promise<Block> {
    const where: Prisma.ClinicAppointmentWhereInput = { tenantId: c.tenantId, ...c.shop, scheduledStart: within(c.r) };
    const [byDoc, byType, byStatus, money] = await Promise.all([
      this.prisma.clinicAppointment.groupBy({ by: ['doctorId', 'status'], where, _sum: { total: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.clinicAppointment.groupBy({ by: ['visitType'], where, _count: { _all: true } }),
      this.prisma.clinicAppointment.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.clinicAppointment.aggregate({ where: { ...where, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }, _sum: { total: true, paidAmount: true }, _avg: { consultationFee: true } }),
    ]);
    const doctors = await this.prisma.clinicDoctorProfile.findMany({ where: { id: { in: [...new Set(byDoc.map((d) => d.doctorId))] } }, select: { id: true, fullName: true, title: true } });
    const dName = new Map(doctors.map((d) => [d.id, `${d.title ? `${d.title} ` : ''}${d.fullName}`]));
    const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
    const total = byStatus.reduce((s, x) => s + x._count._all, 0);
    type Doc = { id: string; total: number; done: number; noShow: number; cancelled: number; fees: number; paid: number };
    const docs = new Map<string, Doc>();
    for (const g of byDoc) {
      const d = docs.get(g.doctorId) ?? { id: g.doctorId, total: 0, done: 0, noShow: 0, cancelled: 0, fees: 0, paid: 0 };
      d.total += g._count._all;
      if (g.status === 'COMPLETED') d.done += g._count._all;
      if (g.status === 'NO_SHOW') d.noShow += g._count._all;
      if (g.status === 'CANCELLED') d.cancelled += g._count._all;
      if (g.status !== 'CANCELLED' && g.status !== 'NO_SHOW') { d.fees += num(g._sum.total); d.paid += num(g._sum.paidAmount); }
      docs.set(g.doctorId, d);
    }
    const b = empty();
    b.kpis = [
      { label: 'Appointments', value: total, fmt: 'count' },
      { label: 'Mukammal', value: count('COMPLETED'), fmt: 'count' },
      { label: 'Nahi aaye', value: total ? r2((count('NO_SHOW') / total) * 100) : 0, fmt: 'pct', hint: `${count('NO_SHOW')} mareez` },
      { label: 'Cancel', value: count('CANCELLED'), fmt: 'count' },
      { label: 'Fees', value: r2(num(money._sum.total)), fmt: 'money', hint: `mila ${rs(num(money._sum.paidAmount))}` },
      { label: 'Ausat fee', value: r2(num(money._avg.consultationFee)), fmt: 'money' },
    ];
    b.charts = [
      chart('Visit ki qism', 'pie', 'count', byType.map((t) => ({ name: pretty(t.visitType), value: t._count._all }))),
      chart('Appointment ki halat', 'bar', 'count', byStatus.map((s) => ({ name: pretty(s.status), value: s._count._all }))),
    ];
    b.tables = [{
      title: 'Doctor war', columns: [{ label: 'Doctor', fmt: 'text' }, { label: 'Appointments', fmt: 'count' }, { label: 'Mukammal', fmt: 'count' }, { label: 'Nahi aaye', fmt: 'count' }, { label: 'Fees', fmt: 'money' }, { label: 'Mila', fmt: 'money' }],
      rows: [...docs.values()].sort((a, z) => z.fees - a.fees).map((d) => [dName.get(d.id) ?? 'Doctor', d.total, d.done, d.noShow, r2(d.fees), r2(d.paid)]),
    }];
    return b;
  }

  // ─── Gym ──────────────────────────────────────────────────

  private async gym(c: Ctx): Promise<Block> {
    const memberShop = c.scope.shopId ? { member: { shopId: c.scope.shopId } } : {};
    const now = new Date();
    const [joined, active, byGoal, sold, dues, expiring, visits, bookings] = await Promise.all([
      this.prisma.gymMember.count({ where: { tenantId: c.tenantId, ...c.shop, joinedAt: within(c.r) } }),
      this.prisma.gymMember.count({ where: { tenantId: c.tenantId, ...c.shop, status: 'ACTIVE' } }),
      this.prisma.gymMember.groupBy({ by: ['primaryGoal'], where: { tenantId: c.tenantId, ...c.shop, status: 'ACTIVE' }, _count: { _all: true } }),
      this.prisma.gymMemberMembership.groupBy({ by: ['planId'], where: { tenantId: c.tenantId, ...memberShop, createdAt: within(c.r), status: { not: 'CANCELLED' } }, _sum: { totalPrice: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.gymMemberMembership.aggregate({ where: { tenantId: c.tenantId, ...memberShop, balanceDue: { gt: 0 }, status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'FROZEN', 'PAUSED'] } }, _sum: { balanceDue: true }, _count: { _all: true } }),
      this.prisma.gymMemberMembership.count({ where: { tenantId: c.tenantId, ...memberShop, status: 'ACTIVE', endDate: { gte: now, lt: new Date(now.getTime() + 7 * DAY) } } }),
      this.prisma.$queryRaw<Array<{ hour: number; visits: number; members: number }>>`
        SELECT EXTRACT(HOUR FROM ${localTime(Prisma.sql`a."checkInAt"`, c.r)})::int AS hour, COUNT(*)::int AS visits, COUNT(DISTINCT a."memberId")::int AS members
        FROM "GymAttendance" a
        WHERE a."tenantId" = ${c.tenantId} ${c.scope.shopId ? Prisma.sql`AND a."shopId" = ${c.scope.shopId}` : Prisma.empty}
          ${c.r.gte ? Prisma.sql`AND a."checkInAt" >= ${c.r.gte}` : Prisma.empty} AND a."checkInAt" < ${c.r.lt}
        GROUP BY 1`,
      this.prisma.gymClassBooking.aggregate({ where: { tenantId: c.tenantId, ...memberShop, bookedAt: within(c.r) }, _count: { _all: true } }),
    ]);
    const [attended, plans, uniqueVisitors] = await Promise.all([
      this.prisma.gymClassBooking.count({ where: { tenantId: c.tenantId, ...memberShop, bookedAt: within(c.r), attended: true } }),
      sold.length ? this.prisma.gymMembershipPlan.findMany({ where: { id: { in: sold.map((s) => s.planId) } }, select: { id: true, name: true } }) : [],
      this.prisma.gymAttendance.groupBy({ by: ['memberId'], where: { tenantId: c.tenantId, ...c.shop, checkInAt: within(c.r) } }),
    ]);
    const pName = new Map(plans.map((p) => [p.id, p.name]));
    const totalVisits = visits.reduce((s, v) => s + v.visits, 0);
    const b = empty();
    b.kpis = [
      { label: 'Active members', value: active, fmt: 'count' },
      { label: 'Naye members', value: joined, fmt: 'count' },
      { label: 'Membership biki', value: sold.reduce((s, x) => s + x._count._all, 0), fmt: 'count', hint: `${rs(sold.reduce((s, x) => s + num(x._sum.totalPrice), 0))} ki` },
      { label: 'Baqi fees', value: r2(num(dues._sum.balanceDue)), fmt: 'money', hint: `${dues._count._all} members` },
      { label: '7 din me khatam', value: expiring, fmt: 'count', hint: 'renew karwayein' },
      { label: 'Haazri', value: totalVisits, fmt: 'count', hint: `${uniqueVisitors.length} members aaye` },
      { label: 'Class booking', value: bookings._count._all, fmt: 'count', hint: `${attended} aaye` },
    ];
    b.charts = [
      chart('Kis waqt rush hota hai', 'bar', 'count', Array.from({ length: 24 }, (_, h) => ({ name: `${h}:00`, value: visits.find((v) => v.hour === h)?.visits ?? 0 }))),
      chart('Members ka maqsad', 'pie', 'count', byGoal.map((g) => ({ name: pretty(g.primaryGoal), value: g._count._all }))),
    ];
    b.tables = [{
      title: 'Plan war membership', columns: [{ label: 'Plan', fmt: 'text' }, { label: 'Biki', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }, { label: 'Mila', fmt: 'money' }],
      rows: sold.sort((a, z) => num(z._sum.totalPrice) - num(a._sum.totalPrice)).map((s) => [pName.get(s.planId) ?? 'Plan', s._count._all, r2(num(s._sum.totalPrice)), r2(num(s._sum.paidAmount))]),
    }];
    return b;
  }

  // ─── Jewelry ──────────────────────────────────────────────

  private async jewelry(c: Ctx): Promise<Block> {
    const sale: Prisma.JewelrySaleWhereInput = { tenantId: c.tenantId, ...c.shop, saleDate: within(c.r), cancelledAt: null, isReturned: false };
    const item: Prisma.JewelrySaleItemWhereInput = { sale };
    const [sales, byMetal, byPurity, byCategory, designs, exchanges] = await Promise.all([
      this.prisma.jewelrySale.aggregate({ where: sale, _sum: { total: true, makingCharges: true, netWeight: true, exchangeValue: true, gstAmount: true }, _count: { _all: true } }),
      this.prisma.jewelrySaleItem.groupBy({ by: ['metalType'], where: item, _sum: { netWeight: true, itemTotal: true, makingTotal: true, quantity: true } }),
      this.prisma.jewelrySaleItem.groupBy({ by: ['purity'], where: item, _sum: { netWeight: true, itemTotal: true, quantity: true } }),
      this.prisma.jewelrySaleItem.groupBy({ by: ['category'], where: item, _sum: { netWeight: true, itemTotal: true, quantity: true } }),
      this.prisma.jewelrySaleItem.groupBy({ by: ['productName'], where: item, _sum: { netWeight: true, itemTotal: true, quantity: true }, orderBy: { _sum: { itemTotal: 'desc' } }, take: 15 }),
      this.prisma.jewelryExchange.aggregate({ where: { tenantId: c.tenantId, exchangeDate: within(c.r) }, _sum: { netWeight: true, netValue: true, grossWeight: true }, _count: { _all: true } }),
    ]);
    const gold = byMetal.filter((m) => ['GOLD', 'ROSE_GOLD', 'WHITE_GOLD'].includes(m.metalType)).reduce((s, m) => s + num(m._sum.netWeight), 0);
    const b = empty();
    b.kpis = [
      { label: 'Bill', value: sales._count._all, fmt: 'count' },
      { label: 'Bikri', value: r2(num(sales._sum.total)), fmt: 'money' },
      { label: 'Sona bika', value: r2(gold), fmt: 'grams' },
      { label: 'Kul wazan', value: r2(num(sales._sum.netWeight)), fmt: 'grams' },
      { label: 'Banwai (making)', value: r2(num(sales._sum.makingCharges)), fmt: 'money' },
      { label: 'Purana sona liya', value: r2(num(exchanges._sum.netWeight ?? exchanges._sum.grossWeight)), fmt: 'grams', hint: `${exchanges._count._all} exchange · ${rs(num(exchanges._sum.netValue))}` },
    ];
    b.charts = [
      chart('Dhaat war bikri', 'pie', 'money', byMetal.map((m) => ({ name: pretty(m.metalType), value: r2(num(m._sum.itemTotal)) }))),
      chart('Purity war wazan (gram)', 'bar', 'grams', byPurity.map((p) => ({ name: pretty(p.purity).replace('Karat ', '') + (p.purity.startsWith('KARAT') ? 'K' : ''), value: r2(num(p._sum.netWeight)) }))),
    ];
    const weightRow = (name: string, s: { netWeight: number | null; itemTotal: number | null; quantity: number | null }) => [name, num(s.quantity), r2(num(s.netWeight)), r2(num(s.itemTotal))];
    const cols = (first: string) => [{ label: first, fmt: 'text' as Fmt }, { label: 'Nag', fmt: 'count' as Fmt }, { label: 'Wazan', fmt: 'grams' as Fmt }, { label: 'Raqam', fmt: 'money' as Fmt }];
    b.tables = [
      { title: 'Dhaat war', columns: [...cols('Dhaat'), { label: 'Banwai', fmt: 'money' }], rows: byMetal.map((m) => [...weightRow(pretty(m.metalType), m._sum), r2(num(m._sum.makingTotal))]) },
      { title: 'Purity war', columns: cols('Purity'), rows: byPurity.map((p) => weightRow(pretty(p.purity), p._sum)) },
      { title: 'Zevar ki qism', columns: cols('Qism'), rows: byCategory.sort((a, z) => num(z._sum.itemTotal) - num(a._sum.itemTotal)).map((x) => weightRow(pretty(x.category), x._sum)) },
      { title: 'Sab se zyada bikne wale design', columns: cols('Design'), rows: designs.map((d) => weightRow(d.productName, d._sum)) },
    ];
    b.notes.push('Exchange (purana sona) har branch ka mila kar hai.');
    return b;
  }

  // ─── Mobile ───────────────────────────────────────────────

  private async mobile(c: Ctx): Promise<Block> {
    const [sold, soldPta, stockPta, repairs, repairMoney, repairBrands, usedIn, usedOut, emi, turnaround] = await Promise.all([
      this.prisma.productImei.aggregate({ where: { tenantId: c.tenantId, ...c.shop, status: 'SOLD', soldAt: within(c.r) }, _sum: { soldPrice: true, costPrice: true }, _count: { _all: true } }),
      this.prisma.productImei.groupBy({ by: ['ptaStatus'], where: { tenantId: c.tenantId, ...c.shop, status: 'SOLD', soldAt: within(c.r) }, _count: { _all: true }, _sum: { soldPrice: true } }),
      this.prisma.productImei.groupBy({ by: ['ptaStatus'], where: { tenantId: c.tenantId, ...c.shop, status: 'IN_STOCK' }, _count: { _all: true }, _sum: { costPrice: true } }),
      this.prisma.repairTicket.groupBy({ by: ['status'], where: { tenantId: c.tenantId, ...c.shop, receivedAt: within(c.r) }, _count: { _all: true } }),
      this.prisma.repairTicket.aggregate({ where: { tenantId: c.tenantId, ...c.shop, receivedAt: within(c.r), status: { not: 'CANCELLED' } }, _sum: { totalCost: true, paidAmount: true, partsCost: true, balanceDue: true } }),
      this.prisma.repairTicket.groupBy({ by: ['deviceBrand'], where: { tenantId: c.tenantId, ...c.shop, receivedAt: within(c.r) }, _count: { _all: true }, _sum: { totalCost: true }, orderBy: { _count: { deviceBrand: 'desc' } }, take: 10 }),
      this.prisma.usedPhone.aggregate({ where: { tenantId: c.tenantId, ...c.shop, receivedAt: within(c.r) }, _sum: { totalCost: true }, _count: { _all: true } }),
      this.prisma.usedPhone.aggregate({ where: { tenantId: c.tenantId, ...c.shop, status: 'SOLD', soldAt: within(c.r) }, _sum: { finalSoldPrice: true, totalCost: true }, _count: { _all: true } }),
      this.prisma.emiPlan.aggregate({ where: { tenantId: c.tenantId, status: 'ACTIVE' }, _sum: { remainingAmount: true }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ hours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM (t."deliveredAt" - t."receivedAt")) / 3600)::float AS hours
        FROM "RepairTicket" t
        WHERE t."tenantId" = ${c.tenantId} AND t."deliveredAt" IS NOT NULL
          ${c.scope.shopId ? Prisma.sql`AND t."shopId" = ${c.scope.shopId}` : Prisma.empty}
          ${c.r.gte ? Prisma.sql`AND t."receivedAt" >= ${c.r.gte}` : Prisma.empty} AND t."receivedAt" < ${c.r.lt}`,
    ]);
    const repairCount = repairs.reduce((s, x) => s + x._count._all, 0);
    const b = empty();
    b.kpis = [
      { label: 'IMEI wale phone bike', value: sold._count._all, fmt: 'count', hint: `${rs(num(sold._sum.soldPrice))} ke` },
      { label: 'Phone ka munafa', value: r2(num(sold._sum.soldPrice) - num(sold._sum.costPrice)), fmt: 'cost' },
      { label: 'Stock me IMEI', value: stockPta.reduce((s, x) => s + x._count._all, 0), fmt: 'count' },
      { label: 'Repair aaye', value: repairCount, fmt: 'count', hint: turnaround[0]?.hours ? `ausat ${Math.round(num(turnaround[0].hours))} ghante` : undefined },
      { label: 'Repair ki kamai', value: r2(num(repairMoney._sum.totalCost)), fmt: 'money', hint: `baqi ${rs(num(repairMoney._sum.balanceDue))}` },
      { label: 'Used phone khareede', value: usedIn._count._all, fmt: 'count', hint: `${rs(num(usedIn._sum.totalCost))} ke` },
      { label: 'Used phone bike', value: usedOut._count._all, fmt: 'count', hint: `${rs(num(usedOut._sum.finalSoldPrice))} ke` },
      { label: 'Used phone munafa', value: r2(num(usedOut._sum.finalSoldPrice) - num(usedOut._sum.totalCost)), fmt: 'cost' },
      { label: 'Qiston me baqi', value: r2(num(emi._sum.remainingAmount)), fmt: 'money', hint: `${emi._count._all} chalu plan` },
    ];
    b.charts = [
      chart('Bike phone — PTA', 'pie', 'count', soldPta.map((p) => ({ name: pretty(p.ptaStatus), value: p._count._all }))),
      chart('Repair ki halat', 'bar', 'count', repairs.map((x) => ({ name: pretty(x.status), value: x._count._all }))),
    ];
    b.tables = [
      { title: 'Stock me phone — PTA', columns: [{ label: 'PTA', fmt: 'text' }, { label: 'Phone', fmt: 'count' }, { label: 'Lagat', fmt: 'cost' }],
        rows: stockPta.map((p) => [pretty(p.ptaStatus), p._count._all, r2(num(p._sum.costPrice))]) },
      { title: 'Kis company ke phone repair aaye', columns: [{ label: 'Company', fmt: 'text' }, { label: 'Tickets', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }],
        rows: repairBrands.map((x) => [x.deviceBrand, x._count._all, r2(num(x._sum.totalCost))]) },
    ];
    b.notes.push('Qiston (EMI) ka hisaab har branch ka mila kar hai.');
    return b;
  }

  // ─── Carpet ───────────────────────────────────────────────

  private async carpet(c: Ctx): Promise<Block> {
    const roll = c.scope.shopId ? { roll: { shopId: c.scope.shopId } } : {};
    const mv = (type: string): Prisma.CarpetRollMovementWhereInput => ({ tenantId: c.tenantId, ...roll, type, createdAt: within(c.r) });
    const [cut, damage, byRoll, stock] = await Promise.all([
      this.prisma.carpetRollMovement.aggregate({ where: mv('CUT_FOR_SALE'), _sum: { sqft: true, lengthFt: true }, _count: { _all: true } }),
      this.prisma.carpetRollMovement.aggregate({ where: mv('DAMAGE'), _sum: { sqft: true } }),
      this.prisma.carpetRollMovement.groupBy({ by: ['rollId'], where: mv('CUT_FOR_SALE'), _sum: { sqft: true }, _count: { _all: true } }),
      this.prisma.carpetRoll.findMany({
        where: { tenantId: c.tenantId, ...c.shop, remainingSqft: { gt: 0 } },
        select: { id: true, remainingSqft: true, costPerSqft: true, salePricePerSqft: true, productId: true, designCode: true },
      }),
    ]);
    const rollIds = byRoll.map((x) => x.rollId);
    const rolls = rollIds.length ? await this.prisma.carpetRoll.findMany({ where: { id: { in: rollIds } }, select: { id: true, productId: true, designCode: true, salePricePerSqft: true, costPerSqft: true } }) : [];
    const productIds = [...new Set([...rolls.map((x) => x.productId), ...stock.map((x) => x.productId)])];
    const products = productIds.length ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];
    const pName = new Map(products.map((p) => [p.id, p.name]));
    const rMap = new Map(rolls.map((x) => [x.id, x]));
    const designs = new Map<string, { name: string; sqft: number; cuts: number; value: number; cost: number }>();
    for (const g of byRoll) {
      const rl = rMap.get(g.rollId);
      const key = rl?.productId ?? g.rollId;
      const d = designs.get(key) ?? { name: (rl && pName.get(rl.productId)) ?? rl?.designCode ?? 'Design', sqft: 0, cuts: 0, value: 0, cost: 0 };
      const sq = num(g._sum.sqft);
      d.sqft += sq; d.cuts += g._count._all; d.value += sq * (rl?.salePricePerSqft ?? 0); d.cost += sq * (rl?.costPerSqft ?? 0);
      designs.set(key, d);
    }
    const stockSqft = stock.reduce((s, x) => s + x.remainingSqft, 0);
    const b = empty();
    b.kpis = [
      { label: 'Sqft bika', value: r2(num(cut._sum.sqft)), fmt: 'sqft', hint: `${cut._count._all} cutting` },
      { label: 'Lambai biki', value: r2(num(cut._sum.lengthFt)), fmt: 'qty', hint: 'feet' },
      { label: 'Kharab hua', value: r2(num(damage._sum.sqft)), fmt: 'sqft' },
      { label: 'Stock me rolls', value: stock.length, fmt: 'count', hint: `${r2(stockSqft)} sqft` },
      { label: 'Stock ki lagat', value: r2(stock.reduce((s, x) => s + x.remainingSqft * x.costPerSqft, 0)), fmt: 'cost' },
    ];
    const top = [...designs.values()].sort((a, z) => z.sqft - a.sqft).slice(0, 20);
    b.charts = [chart('Design war sqft', 'bar', 'sqft', top.slice(0, 10).map((d) => ({ name: d.name, value: r2(d.sqft) })))];
    b.tables = [{
      title: 'Design war bikri', hint: 'Raqam roll ke sqft rate se andaza',
      columns: [{ label: 'Design', fmt: 'text' }, { label: 'Sqft', fmt: 'sqft' }, { label: 'Cutting', fmt: 'count' }, { label: 'Andazan raqam', fmt: 'money' }, { label: 'Andazan munafa', fmt: 'cost' }],
      rows: top.map((d) => [d.name, r2(d.sqft), d.cuts, r2(d.value), r2(d.value - d.cost)]),
    }];
    return b;
  }

  // ─── Pharmacy ─────────────────────────────────────────────

  private async pharmacy(c: Ctx): Promise<Block> {
    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * DAY);
    const [batches, schedule, rx, rxCount, controlled] = await Promise.all([
      this.prisma.productBatch.findMany({
        where: { tenantId: c.tenantId, isActive: true, quantity: { gt: 0 }, expiryDate: { not: null, lt: in90 } },
        select: { id: true, batchNumber: true, expiryDate: true, quantity: true, costPrice: true, product: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' }, take: 500,
      }),
      this.soldBy(c, Prisma.sql`JOIN "PharmacyMedicine" pm ON pm."productId" = si."productId"`, Prisma.sql`pm."scheduleClass"::text`),
      this.soldBy(c, Prisma.sql`JOIN "PharmacyMedicine" pm ON pm."productId" = si."productId"`, Prisma.sql`CASE WHEN pm."requiresPrescription" THEN 'rx' ELSE 'otc' END`),
      this.prisma.prescription.groupBy({ by: ['status'], where: { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r) }, _count: { _all: true } }),
      this.prisma.controlledSubstanceLog.count({ where: { tenantId: c.tenantId, logDate: within(c.r), isReversed: false } }),
    ]);
    const bucket = (b: (typeof batches)[number]) => {
      const days = Math.floor((b.expiryDate!.getTime() - now.getTime()) / DAY);
      return days < 0 ? 'expired' : days <= 30 ? '30' : '90';
    };
    const sum = (k: string) => batches.filter((x) => bucket(x) === k);
    const value = (list: typeof batches) => r2(list.reduce((s, x) => s + x.quantity * x.costPrice, 0));
    const rxSold = rx.find((x) => x.key === 'rx');
    const b = empty();
    b.kpis = [
      { label: 'Expire ho chuki', value: sum('expired').length, fmt: 'count', hint: 'batch — shelf se hatayein' },
      { label: 'Expired maal', value: value(sum('expired')), fmt: 'cost' },
      { label: '30 din me expiry', value: sum('30').length, fmt: 'count', hint: 'batch' },
      { label: '30 din wala maal', value: value(sum('30')), fmt: 'cost' },
      { label: '90 din me expiry', value: sum('90').length, fmt: 'count', hint: 'batch' },
      { label: 'Nuskhe wali dawai biki', value: r2(num(rxSold?.revenue)), fmt: 'money' },
      { label: 'Nuskhe (prescriptions)', value: rxCount.reduce((s, x) => s + x._count._all, 0), fmt: 'count' },
      { label: 'Controlled register', value: controlled, fmt: 'count', hint: 'entries' },
    ];
    b.charts = [chart('Schedule war bikri', 'pie', 'money', schedule.map((x) => ({ name: pretty(x.key, 'OTC'), value: r2(x.revenue) })))];
    b.tables = [
      this.soldTable('Schedule war bikri', 'Schedule', schedule, (k) => pretty(k, 'OTC')),
      {
        title: 'Jaldi expire hone wali batches', hint: 'Agle 90 din, sab branches',
        columns: [{ label: 'Dawai', fmt: 'text' }, { label: 'Batch', fmt: 'text' }, { label: 'Expiry', fmt: 'date' }, { label: 'Miqdar', fmt: 'qty' }, { label: 'Lagat', fmt: 'cost' }],
        rows: batches.slice(0, 40).map((x) => [x.product?.name ?? 'Dawai', x.batchNumber, x.expiryDate!.toISOString(), r2(x.quantity), r2(x.quantity * x.costPrice)]),
      },
      { title: 'Nuskhon ki halat', columns: [{ label: 'Halat', fmt: 'text' }, { label: 'Ginti', fmt: 'count' }], rows: rxCount.map((x) => [pretty(x.status), x._count._all]) },
    ];
    b.notes.push('Batch aur expiry har branch ki mila kar hain.');
    return b;
  }

  // ─── Bakery ───────────────────────────────────────────────

  private async bakery(c: Ctx): Promise<Block> {
    const plan: Prisma.BakeryProductionPlanWhereInput = { tenantId: c.tenantId, ...c.shop, planDate: within(c.r) };
    const [made, byItem, waste, cakes, cakeOcc, bulk] = await Promise.all([
      this.prisma.bakeryProductionItem.aggregate({ where: { plan }, _sum: { plannedQty: true, producedQty: true, failedQty: true, totalCost: true } }),
      this.prisma.bakeryProductionItem.groupBy({ by: ['productName'], where: { plan }, _sum: { plannedQty: true, producedQty: true, failedQty: true }, orderBy: { _sum: { producedQty: 'desc' } }, take: 20 }),
      this.prisma.bakeryFreshnessLog.groupBy({ by: ['productName'], where: { tenantId: c.tenantId, ...c.shop, productionDate: within(c.r) }, _sum: { initialQty: true, soldQty: true, wastedQty: true, discountedQty: true }, orderBy: { _sum: { wastedQty: 'desc' } }, take: 20 }),
      this.prisma.bakeryCakeOrder.aggregate({ where: { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r), status: { notIn: ['CANCELLED', 'REFUNDED', 'DRAFT'] } }, _sum: { total: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.bakeryCakeOrder.groupBy({ by: ['occasion'], where: { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r), status: { notIn: ['CANCELLED', 'REFUNDED', 'DRAFT'] } }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.bakeryBulkOrder.aggregate({ where: { tenantId: c.tenantId, createdAt: within(c.r), status: { notIn: ['CANCELLED', 'REFUNDED', 'DRAFT'] } }, _sum: { quotedPrice: true, paidAmount: true }, _count: { _all: true } }),
    ]);
    const planned = num(made._sum.plannedQty);
    const produced = num(made._sum.producedQty);
    const wasted = waste.reduce((s, x) => s + num(x._sum.wastedQty), 0);
    const b = empty();
    b.kpis = [
      { label: 'Socha tha', value: planned, fmt: 'qty' },
      { label: 'Bana', value: produced, fmt: 'qty', hint: planned ? `${Math.round((produced / planned) * 100)}% plan ka` : undefined },
      { label: 'Kharab bana', value: num(made._sum.failedQty), fmt: 'qty' },
      { label: 'Banane ki lagat', value: r2(num(made._sum.totalCost)), fmt: 'cost' },
      { label: 'Phenkna para', value: wasted, fmt: 'qty' },
      { label: 'Cake orders', value: cakes._count._all, fmt: 'count', hint: `${rs(num(cakes._sum.total))} ke` },
      { label: 'Bare orders', value: bulk._count._all, fmt: 'count', hint: `${rs(num(bulk._sum.quotedPrice))} ke` },
    ];
    b.charts = [chart('Cake kis mauqe ke', 'pie', 'count', cakeOcc.map((o) => ({ name: pretty(o.occasion), value: o._count._all })))];
    b.tables = [
      { title: 'Plan vs bana', columns: [{ label: 'Cheez', fmt: 'text' }, { label: 'Socha', fmt: 'qty' }, { label: 'Bana', fmt: 'qty' }, { label: 'Kharab', fmt: 'qty' }],
        rows: byItem.map((x) => [x.productName, num(x._sum.plannedQty), num(x._sum.producedQty), num(x._sum.failedQty)]) },
      { title: 'Bana hua maal kahan gaya', hint: 'Sab se zyada phenka pehle', columns: [{ label: 'Cheez', fmt: 'text' }, { label: 'Bana', fmt: 'qty' }, { label: 'Bika', fmt: 'qty' }, { label: 'Sasta becha', fmt: 'qty' }, { label: 'Phenka', fmt: 'qty' }],
        rows: waste.map((x) => [x.productName, num(x._sum.initialQty), num(x._sum.soldQty), num(x._sum.discountedQty), num(x._sum.wastedQty)]) },
    ];
    return b;
  }

  // ─── Agri ─────────────────────────────────────────────────

  private async agri(c: Ctx): Promise<Block> {
    const join = Prisma.sql`JOIN "AgriProductProfile" ap ON ap."productId" = si."productId"`;
    const [byKind, bySeason, farmers, byDistrict, byCrop, regSoon] = await Promise.all([
      this.soldBy(c, join, Prisma.sql`ap.category::text`),
      this.soldBy(c, join, Prisma.sql`ap.season::text`),
      this.prisma.agriFarmer.findMany({ where: { tenantId: c.tenantId, isActive: true, currentBalance: { gt: 0 } }, orderBy: { currentBalance: 'desc' }, take: 20, select: { fullName: true, phone: true, village: true, currentBalance: true, lastPurchaseAt: true } }),
      this.prisma.agriFarmer.groupBy({ by: ['district'], where: { tenantId: c.tenantId, isActive: true }, _count: { _all: true }, _sum: { currentBalance: true } }),
      this.prisma.agriFarmer.groupBy({ by: ['currentCrop'], where: { tenantId: c.tenantId, isActive: true, currentCrop: { not: null } }, _count: { _all: true } }),
      this.prisma.agriProductProfile.count({ where: { tenantId: c.tenantId, govtRegExpiry: { lt: new Date(Date.now() + 30 * DAY) } } }),
    ]);
    const owed = await this.prisma.agriFarmer.aggregate({ where: { tenantId: c.tenantId, isActive: true, currentBalance: { gt: 0 } }, _sum: { currentBalance: true }, _count: { _all: true } });
    const b = empty();
    b.kpis = [
      { label: 'Farmer par udhaar', value: r2(num(owed._sum.currentBalance)), fmt: 'money', hint: `${owed._count._all} farmer` },
      { label: 'Sab se bari qism', value: r2(num(byKind[0]?.revenue)), fmt: 'money', hint: pretty(byKind[0]?.key, '—') },
      { label: 'Registration khatam / qareeb', value: regSoon, fmt: 'count', hint: '30 din me' },
    ];
    b.charts = [
      chart('Qism war bikri', 'bar', 'money', byKind.map((x) => ({ name: pretty(x.key), value: r2(x.revenue) }))),
      chart('Mausam war bikri', 'pie', 'money', bySeason.map((x) => ({ name: pretty(x.key, 'Har mausam'), value: r2(x.revenue) }))),
    ];
    b.tables = [
      this.soldTable('Qism war bikri', 'Qism', byKind, (k) => pretty(k)),
      this.soldTable('Mausam war bikri', 'Mausam', bySeason, (k) => pretty(k, 'Har mausam')),
      { title: 'Sab se zyada udhaar', columns: [{ label: 'Farmer', fmt: 'text' }, { label: 'Phone', fmt: 'text' }, { label: 'Gaon', fmt: 'text' }, { label: 'Aakhri kharidari', fmt: 'date' }, { label: 'Baqi', fmt: 'money' }],
        rows: farmers.map((f) => [f.fullName, f.phone, f.village, f.lastPurchaseAt?.toISOString() ?? null, r2(f.currentBalance)]) },
      { title: 'Zila war farmer', columns: [{ label: 'Zila', fmt: 'text' }, { label: 'Farmer', fmt: 'count' }, { label: 'Udhaar', fmt: 'money' }],
        rows: byDistrict.sort((a, z) => z._count._all - a._count._all).map((d) => [d.district ?? 'Baghair zila', d._count._all, r2(num(d._sum.currentBalance))]) },
      { title: 'Kaunsi fasal', columns: [{ label: 'Fasal', fmt: 'text' }, { label: 'Farmer', fmt: 'count' }],
        rows: byCrop.sort((a, z) => z._count._all - a._count._all).map((x) => [x.currentCrop ?? '—', x._count._all]) },
    ];
    b.notes.push('Farmer ka udhaar har branch ka mila kar hai.');
    return b;
  }

  // ─── Garments ─────────────────────────────────────────────

  private async garments(c: Ctx): Promise<Block> {
    const variant = Prisma.sql`JOIN "SaleItemVariant" sv ON sv."saleItemId" = si.id JOIN "ProductVariant" pv ON pv.id = sv."variantId"`;
    const profile = Prisma.sql`JOIN "GarmentProductProfile" gp ON gp."productId" = si."productId"`;
    const tWhere: Prisma.GarmentTailoringOrderWhereInput = { tenantId: c.tenantId, ...c.shop, orderDate: within(c.r), orderStatus: { notIn: ['CANCELLED', 'DRAFT'] } };
    const [bySize, byColor, bySeason, byGender, tailoring, tStatus, late] = await Promise.all([
      this.soldBy(c, variant, Prisma.sql`NULLIF(trim(pv.size), '')`),
      this.soldBy(c, variant, Prisma.sql`NULLIF(trim(pv.color), '')`),
      this.soldBy(c, profile, Prisma.sql`gp.season::text`),
      this.soldBy(c, profile, Prisma.sql`gp.gender::text`),
      this.prisma.garmentTailoringOrder.aggregate({ where: tWhere, _sum: { total: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.garmentTailoringOrder.groupBy({ by: ['orderStatus'], where: tWhere, _count: { _all: true } }),
      this.prisma.garmentTailoringOrder.count({ where: { tenantId: c.tenantId, ...c.shop, promisedDate: { lt: new Date() }, orderStatus: { notIn: ['DELIVERED', 'CANCELLED', 'READY'] } } }),
    ]);
    const b = empty();
    b.kpis = [
      { label: 'Sab se zyada size', value: r2(num(bySize[0]?.qty)), fmt: 'qty', hint: bySize[0]?.key ?? '—' },
      { label: 'Sab se zyada rang', value: r2(num(byColor[0]?.qty)), fmt: 'qty', hint: byColor[0]?.key ?? '—' },
      { label: 'Silai ke order', value: tailoring._count._all, fmt: 'count', hint: `${rs(num(tailoring._sum.total))} ke` },
      { label: 'Silai ka baqi', value: r2(num(tailoring._sum.total) - num(tailoring._sum.paidAmount)), fmt: 'money' },
      { label: 'Late silai', value: late, fmt: 'count', hint: 'waade ki tareekh guzar gayi' },
    ];
    b.charts = [
      chart('Size war (nag)', 'bar', 'qty', bySize.map((x) => ({ name: x.key ?? '—', value: r2(x.qty) }))),
      chart('Rang war (nag)', 'pie', 'qty', byColor.slice(0, 10).map((x) => ({ name: x.key ?? '—', value: r2(x.qty) }))),
    ];
    b.tables = [
      this.soldTable('Size war bikri', 'Size', bySize, (k) => k ?? 'Baghair size'),
      this.soldTable('Rang war bikri', 'Rang', byColor, (k) => k ?? 'Baghair rang'),
      this.soldTable('Season war bikri', 'Season', bySeason, (k) => pretty(k)),
      this.soldTable('Kis ke liye (gender)', 'Kis ke liye', byGender, (k) => pretty(k)),
      { title: 'Silai ki halat', columns: [{ label: 'Halat', fmt: 'text' }, { label: 'Order', fmt: 'count' }], rows: tStatus.map((x) => [pretty(x.orderStatus), x._count._all]) },
    ];
    return b;
  }

  // ─── Electronics ──────────────────────────────────────────

  private async electronics(c: Ctx): Promise<Block> {
    const [byType, serialSold, stockSerials, claims, claimMoney] = await Promise.all([
      this.soldBy(c, Prisma.sql`JOIN "ElectronicsProductProfile" ep ON ep."productId" = si."productId"`, Prisma.sql`ep."categoryType"::text`),
      this.prisma.electronicsSerialTracking.aggregate({ where: { tenantId: c.tenantId, ...c.shop, status: 'SOLD', soldAt: within(c.r) }, _sum: { soldPrice: true, purchasePrice: true }, _count: { _all: true } }),
      this.prisma.electronicsSerialTracking.findMany({ where: { tenantId: c.tenantId, ...c.shop, status: 'IN_STOCK' }, select: { purchaseDate: true, createdAt: true, purchasePrice: true } }),
      this.prisma.electronicsWarrantyClaim.groupBy({ by: ['status'], where: { tenantId: c.tenantId, claimDate: within(c.r) }, _count: { _all: true } }),
      this.prisma.electronicsWarrantyClaim.aggregate({ where: { tenantId: c.tenantId, claimDate: within(c.r) }, _sum: { repairCost: true, paidByBrand: true, paidByCustomer: true } }),
    ]);
    const block = this.deviceBlock({
      byType, typeTitle: 'Qism war bikri',
      serial: { sold: serialSold._count._all, revenue: num(serialSold._sum.soldPrice), cost: num(serialSold._sum.purchasePrice), stock: stockSerials.map((s) => ({ at: s.purchaseDate ?? s.createdAt, cost: num(s.purchasePrice) })) },
      claims: claims.map((x) => ({ name: pretty(x.status), value: x._count._all })),
      claimKpis: [
        { label: 'Warranty claims', value: claims.reduce((s, x) => s + x._count._all, 0), fmt: 'count' },
        { label: 'Claim ka kharcha', value: r2(num(claimMoney._sum.repairCost)), fmt: 'cost', hint: `brand ne diye ${rs(num(claimMoney._sum.paidByBrand))}` },
      ],
    });
    block.notes.push('Warranty claims har branch ke mila kar hain.');
    return block;
  }

  // ─── Appliances ───────────────────────────────────────────

  private async appliances(c: Ctx): Promise<Block> {
    const [byType, serialSold, stockSerials, claims, claimMoney, service, serviceMoney, installs] = await Promise.all([
      this.soldBy(c, Prisma.sql`JOIN "ApplianceProductProfile" ap ON ap."productId" = si."productId"`, Prisma.sql`ap."categoryType"::text`),
      this.prisma.applianceSerialTracking.aggregate({ where: { tenantId: c.tenantId, status: 'SOLD', soldAt: within(c.r) }, _sum: { soldPrice: true, purchasePrice: true }, _count: { _all: true } }),
      this.prisma.applianceSerialTracking.findMany({ where: { tenantId: c.tenantId, status: 'IN_STOCK' }, select: { purchaseDate: true, createdAt: true, purchasePrice: true } }),
      this.prisma.applianceWarrantyClaim.groupBy({ by: ['status'], where: { tenantId: c.tenantId, claimDate: within(c.r) }, _count: { _all: true } }),
      this.prisma.applianceWarrantyClaim.aggregate({ where: { tenantId: c.tenantId, claimDate: within(c.r) }, _sum: { claimedAmount: true, receivedAmount: true } }),
      this.prisma.applianceServiceRequest.groupBy({ by: ['status'], where: { tenantId: c.tenantId, requestedAt: within(c.r) }, _count: { _all: true } }),
      this.prisma.applianceServiceRequest.aggregate({ where: { tenantId: c.tenantId, requestedAt: within(c.r), status: { not: 'CANCELLED' } }, _sum: { totalCharge: true, paidAmount: true } }),
      this.prisma.applianceInstallation.groupBy({ by: ['status'], where: { tenantId: c.tenantId, createdAt: within(c.r) }, _count: { _all: true } }),
    ]);
    const block = this.deviceBlock({
      byType, typeTitle: 'Qism war bikri',
      serial: { sold: serialSold._count._all, revenue: num(serialSold._sum.soldPrice), cost: num(serialSold._sum.purchasePrice), stock: stockSerials.map((s) => ({ at: s.purchaseDate ?? s.createdAt, cost: num(s.purchasePrice) })) },
      claims: claims.map((x) => ({ name: pretty(x.status), value: x._count._all })),
      claimKpis: [
        { label: 'Warranty claims', value: claims.reduce((s, x) => s + x._count._all, 0), fmt: 'count' },
        { label: 'Brand se lena', value: r2(num(claimMoney._sum.claimedAmount) - num(claimMoney._sum.receivedAmount)), fmt: 'money', hint: `mila ${rs(num(claimMoney._sum.receivedAmount))}` },
      ],
    });
    const done = (list: Array<{ status: string; _count: { _all: number } }>) => list.find((x) => x.status === 'COMPLETED')?._count._all ?? 0;
    block.kpis.push(
      { label: 'Service calls', value: service.reduce((s, x) => s + x._count._all, 0), fmt: 'count', hint: `${done(service)} mukammal` },
      { label: 'Service ki kamai', value: r2(num(serviceMoney._sum.totalCharge)), fmt: 'money', hint: `mila ${rs(num(serviceMoney._sum.paidAmount))}` },
      { label: 'Installations', value: installs.reduce((s, x) => s + x._count._all, 0), fmt: 'count', hint: `${done(installs)} lag gayi` },
    );
    block.charts.push(chart('Service calls ki halat', 'bar', 'count', service.map((x) => ({ name: pretty(x.status), value: x._count._all }))));
    block.notes.push('Serial, service, installation aur claims har branch ke mila kar hain.');
    return block;
  }

  private deviceBlock(d: {
    byType: SoldRow[]; typeTitle: string;
    serial: { sold: number; revenue: number; cost: number; stock: Array<{ at: Date; cost: number }> };
    claims: Array<{ name: string; value: number }>; claimKpis: BlockKpi[];
  }): Block {
    const now = Date.now();
    const ages = [
      { name: '30 din tak', max: 30 }, { name: '31–60 din', max: 60 }, { name: '61–90 din', max: 90 }, { name: '90 din se zyada', max: Infinity },
    ].map((a, i, all) => {
      const min = i ? all[i - 1].max + 1 : 0;
      const list = d.serial.stock.filter((s) => { const days = (now - s.at.getTime()) / DAY; return days >= min && days <= a.max; });
      return { name: a.name, count: list.length, cost: list.reduce((s, x) => s + x.cost, 0) };
    });
    const b = empty();
    b.kpis = [
      { label: 'Serial wale bike', value: d.serial.sold, fmt: 'count', hint: `${rs(d.serial.revenue)} ke` },
      { label: 'Serial wala munafa', value: r2(d.serial.revenue - d.serial.cost), fmt: 'cost' },
      { label: 'Stock me serial', value: d.serial.stock.length, fmt: 'count', hint: `${ages[3].count} purane (90+ din)` },
      ...d.claimKpis,
    ];
    b.charts = [
      chart(d.typeTitle, 'bar', 'money', d.byType.slice(0, 12).map((x) => ({ name: pretty(x.key), value: r2(x.revenue) }))),
      chart('Warranty claims ki halat', 'pie', 'count', d.claims),
    ];
    b.tables = [
      this.soldTable(d.typeTitle, 'Qism', d.byType, (k) => pretty(k)),
      { title: 'Maal ki umar (serial wale)', columns: [{ label: 'Kitna purana', fmt: 'text' }, { label: 'Units', fmt: 'count' }, { label: 'Lagat', fmt: 'cost' }], rows: ages.map((a) => [a.name, a.count, r2(a.cost)]) },
    ];
    return b;
  }

  // ─── Hardware ─────────────────────────────────────────────

  private async hardware(c: Ctx): Promise<Block> {
    const q: Prisma.HardwareQuotationWhereInput = { tenantId: c.tenantId, ...c.shop, quotationDate: within(c.r) };
    const [projects, newProjects, quotes, converted, qStatus, deliveries, dStatus] = await Promise.all([
      this.prisma.hardwareProject.aggregate({ where: { tenantId: c.tenantId, ...c.shop, isActive: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, _sum: { totalQuoted: true, totalDelivered: true, totalPending: true }, _count: { _all: true } }),
      this.prisma.hardwareProject.count({ where: { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r) } }),
      this.prisma.hardwareQuotation.aggregate({ where: q, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.hardwareQuotation.aggregate({ where: { ...q, OR: [{ status: { in: ['CONVERTED', 'ACCEPTED'] } }, { convertedAt: { not: null } }] }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.hardwareQuotation.groupBy({ by: ['status'], where: q, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.hardwareDelivery.aggregate({ where: { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r) }, _sum: { totalCharges: true }, _count: { _all: true } }),
      this.prisma.hardwareDelivery.groupBy({ by: ['status'], where: { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r) }, _count: { _all: true } }),
    ]);
    const top = await this.prisma.hardwareProject.findMany({
      where: { tenantId: c.tenantId, ...c.shop, isActive: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { totalPending: 'desc' }, take: 15,
      select: { name: true, customerName: true, status: true, totalQuoted: true, totalDelivered: true, totalPaid: true, totalPending: true },
    });
    const b = empty();
    b.kpis = [
      { label: 'Chalu projects', value: projects._count._all, fmt: 'count', hint: `${newProjects} naye` },
      { label: 'Projects ka baqi', value: r2(num(projects._sum.totalPending)), fmt: 'money' },
      { label: 'Quotations', value: quotes._count._all, fmt: 'count', hint: `${rs(num(quotes._sum.total))} ki` },
      { label: 'Order bani', value: quotes._count._all ? r2((converted._count._all / quotes._count._all) * 100) : 0, fmt: 'pct', hint: `${converted._count._all} quotation` },
      { label: 'Deliveries', value: deliveries._count._all, fmt: 'count', hint: `charges ${rs(num(deliveries._sum.totalCharges))}` },
    ];
    b.charts = [
      chart('Quotation ki halat', 'pie', 'count', qStatus.map((x) => ({ name: pretty(x.status), value: x._count._all }))),
      chart('Delivery ki halat', 'bar', 'count', dStatus.map((x) => ({ name: pretty(x.status), value: x._count._all }))),
    ];
    b.tables = [{
      title: 'Chalu projects — sab se zyada baqi', columns: [{ label: 'Project', fmt: 'text' }, { label: 'Customer', fmt: 'text' }, { label: 'Halat', fmt: 'text' }, { label: 'Quote', fmt: 'money' }, { label: 'Pohncha', fmt: 'money' }, { label: 'Mila', fmt: 'money' }, { label: 'Baqi', fmt: 'money' }],
      rows: top.map((p) => [p.name, p.customerName, pretty(p.status), r2(p.totalQuoted), r2(p.totalDelivered), r2(p.totalPaid), r2(p.totalPending)]),
    }];
    return b;
  }

  // ─── Dairy ────────────────────────────────────────────────

  private async dairy(c: Ctx): Promise<Block> {
    const d: Prisma.DairyDeliveryWhereInput = { tenantId: c.tenantId, deliveryDate: within(c.r) };
    const [bySlot, byStatus, subs, owed, committed, top, saleSlots] = await Promise.all([
      this.prisma.dairyDelivery.groupBy({ by: ['slot'], where: { ...d, status: 'DELIVERED' }, _sum: { deliveredQty: true, totalAmount: true }, _count: { _all: true } }),
      this.prisma.dairyDelivery.groupBy({ by: ['status'], where: d, _count: { _all: true } }),
      this.prisma.dairyCustomer.groupBy({ by: ['status'], where: { tenantId: c.tenantId }, _count: { _all: true } }),
      this.prisma.dairyCustomer.aggregate({ where: { tenantId: c.tenantId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true }, _count: { _all: true } }),
      this.prisma.dairyCustomer.aggregate({ where: { tenantId: c.tenantId, status: 'ACTIVE' }, _sum: { morningQuantity: true, eveningQuantity: true } }),
      this.prisma.dairyCustomer.findMany({ where: { tenantId: c.tenantId, currentBalance: { gt: 0 } }, orderBy: { currentBalance: 'desc' }, take: 20, select: { name: true, phone: true, area: true, currentBalance: true, lastPaymentDate: true } }),
      this.prisma.$queryRaw<Array<{ slot: string; bills: number; net: number }>>`
        SELECT CASE WHEN EXTRACT(HOUR FROM ${localTime(Prisma.sql`s."soldAt"`, c.r)}) < 14 THEN 'Subah' ELSE 'Shaam' END AS slot,
          COUNT(*)::int AS bills, SUM(s.total - s."refundedAmount")::float AS net
        FROM "Sale" s WHERE ${saleSql(c.tenantId, c.scope, c.r)} GROUP BY 1`,
    ]);
    const status = (k: string) => byStatus.find((x) => x.status === k)?._count._all ?? 0;
    const b = empty();
    b.kpis = [
      { label: 'Doodh pohncha', value: r2(bySlot.reduce((s, x) => s + num(x._sum.deliveredQty), 0)), fmt: 'litre', hint: `${bySlot.reduce((s, x) => s + x._count._all, 0)} delivery` },
      { label: 'Delivery ki raqam', value: r2(bySlot.reduce((s, x) => s + num(x._sum.totalAmount), 0)), fmt: 'money' },
      { label: 'Reh gayi', value: status('MISSED') + status('SKIPPED'), fmt: 'count', hint: 'missed / skip' },
      { label: 'Roz ka waada', value: r2(num(committed._sum.morningQuantity) + num(committed._sum.eveningQuantity)), fmt: 'litre', hint: `subah ${r2(num(committed._sum.morningQuantity))} · shaam ${r2(num(committed._sum.eveningQuantity))}` },
      { label: 'Gahak', value: subs.find((x) => x.status === 'ACTIVE')?._count._all ?? 0, fmt: 'count', hint: 'chalu' },
      { label: 'Khaton me baqi', value: r2(num(owed._sum.currentBalance)), fmt: 'money', hint: `${owed._count._all} gahak` },
    ];
    b.charts = [
      chart('Counter bikri — subah vs shaam', 'pie', 'money', saleSlots.map((x) => ({ name: x.slot, value: r2(x.net) }))),
      chart('Delivery — waqt war (litre)', 'bar', 'litre', bySlot.map((x) => ({ name: pretty(x.slot), value: r2(num(x._sum.deliveredQty)) }))),
    ];
    b.tables = [
      { title: 'Sab se zyada baqi', columns: [{ label: 'Gahak', fmt: 'text' }, { label: 'Phone', fmt: 'text' }, { label: 'Ilaqa', fmt: 'text' }, { label: 'Aakhri adaigi', fmt: 'date' }, { label: 'Baqi', fmt: 'money' }],
        rows: top.map((x) => [x.name, x.phone, x.area, x.lastPaymentDate?.toISOString() ?? null, r2(x.currentBalance)]) },
      { title: 'Delivery ki halat', columns: [{ label: 'Halat', fmt: 'text' }, { label: 'Ginti', fmt: 'count' }], rows: byStatus.map((x) => [pretty(x.status), x._count._all]) },
    ];
    b.notes.push('Delivery aur khate har branch ke mila kar hain.');
    return b;
  }

  // ─── Meat ─────────────────────────────────────────────────

  private async meat(c: Ctx): Promise<Block> {
    const join = Prisma.sql`JOIN "MeatProductProfile" mp ON mp."productId" = si."productId"`;
    const [byAnimal, byCut, live, bought, slaughter] = await Promise.all([
      this.soldBy(c, join, Prisma.sql`mp."animalType"::text`),
      this.soldBy(c, join, Prisma.sql`mp."cutCategory"::text`, 15),
      this.prisma.meatLiveAnimal.aggregate({ where: { tenantId: c.tenantId, ...c.shop, isActive: true, isSlaughtered: false, isSold: false }, _sum: { purchasePrice: true, totalFeedCost: true, weightKg: true }, _count: { _all: true } }),
      this.prisma.meatLiveAnimal.aggregate({ where: { tenantId: c.tenantId, ...c.shop, purchaseDate: within(c.r) }, _sum: { purchasePrice: true }, _count: { _all: true } }),
      this.prisma.meatSlaughterLog.findMany({ where: { tenantId: c.tenantId, ...c.shop, slaughterDate: within(c.r) }, select: { isHalal: true, vetInspection: true, liveWeightKg: true, dressedWeightKg: true } }),
    ]);
    const live_ = slaughter.reduce((s, x) => s + x.liveWeightKg, 0);
    const dressed = slaughter.reduce((s, x) => s + num(x.dressedWeightKg), 0);
    const b = empty();
    b.kpis = [
      { label: 'Gosht bika', value: r2(byAnimal.reduce((s, x) => s + x.qty, 0)), fmt: 'kg' },
      { label: 'Zinda janwar', value: live._count._all, fmt: 'count', hint: `${r2(num(live._sum.weightKg))} kg` },
      { label: 'Janwaron ki lagat', value: r2(num(live._sum.purchasePrice) + num(live._sum.totalFeedCost)), fmt: 'cost' },
      { label: 'Janwar khareede', value: bought._count._all, fmt: 'count' },
      { label: 'Zibah', value: slaughter.length, fmt: 'count', hint: live_ ? `gosht ${Math.round((dressed / live_) * 100)}% nikla` : undefined },
      { label: 'Halal record', value: slaughter.length ? r2((slaughter.filter((x) => x.isHalal).length / slaughter.length) * 100) : 0, fmt: 'pct', hint: `${slaughter.filter((x) => x.vetInspection).length} vet check` },
    ];
    b.charts = [chart('Janwar war bikri (kg)', 'pie', 'kg', byAnimal.map((x) => ({ name: pretty(x.key), value: r2(x.qty) })))];
    b.tables = [
      this.soldTable('Janwar war bikri', 'Janwar', byAnimal, (k) => pretty(k), 'kg'),
      this.soldTable('Cut war bikri', 'Cut', byCut, (k) => pretty(k), 'kg'),
    ];
    return b;
  }

  // ─── Auto parts / workshop ────────────────────────────────

  private async autoparts(c: Ctx): Promise<Block> {
    const where: Prisma.WorkshopJobWhereInput = { tenantId: c.tenantId, ...c.shop, receivedAt: within(c.r) };
    const done: Prisma.WorkshopJobWhereInput = { ...where, status: { in: ['COMPLETED', 'DELIVERED'] } };
    const [byStatus, money, byMechanic, byMake, byType] = await Promise.all([
      this.prisma.workshopJob.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.workshopJob.aggregate({ where: { ...where, status: { not: 'CANCELLED' } }, _sum: { total: true, paidAmount: true, laborTotal: true, partsTotal: true } }),
      this.prisma.workshopJob.groupBy({ by: ['primaryMechanicId'], where: { ...done, primaryMechanicId: { not: null } }, _sum: { total: true, laborTotal: true }, _count: { _all: true } }),
      this.prisma.workshopJob.groupBy({ by: ['makeName'], where, _sum: { total: true }, _count: { _all: true }, orderBy: { _count: { makeName: 'desc' } }, take: 12 }),
      this.prisma.workshopJob.groupBy({ by: ['jobType'], where, _count: { _all: true }, _sum: { total: true } }),
    ]);
    const mechanics = byMechanic.length
      ? await this.prisma.mechanicProfile.findMany({ where: { id: { in: byMechanic.map((m) => m.primaryMechanicId!) } }, select: { id: true, staffId: true } })
      : [];
    const names = await this.people(mechanics.map((m) => m.staffId));
    const mName = new Map(mechanics.map((m) => [m.id, names.get(m.staffId) ?? 'Mistri']));
    const total = byStatus.reduce((s, x) => s + x._count._all, 0);
    const b = empty();
    b.kpis = [
      { label: 'Gaariyan aayin', value: total, fmt: 'count' },
      { label: 'Kaam mukammal', value: byStatus.filter((x) => ['COMPLETED', 'DELIVERED'].includes(x.status)).reduce((s, x) => s + x._count._all, 0), fmt: 'count' },
      { label: 'Kaam ki raqam', value: r2(num(money._sum.total)), fmt: 'money', hint: `mila ${rs(num(money._sum.paidAmount))}` },
      { label: 'Mazdoori', value: r2(num(money._sum.laborTotal)), fmt: 'money' },
      { label: 'Parts', value: r2(num(money._sum.partsTotal)), fmt: 'money' },
    ];
    b.charts = [
      chart('Job ki halat', 'bar', 'count', byStatus.map((x) => ({ name: pretty(x.status), value: x._count._all }))),
      chart('Kaam ki qism', 'pie', 'count', byType.map((x) => ({ name: pretty(x.jobType), value: x._count._all }))),
    ];
    b.tables = [
      { title: 'Mistri war', columns: [{ label: 'Mistri', fmt: 'text' }, { label: 'Jobs', fmt: 'count' }, { label: 'Mazdoori', fmt: 'money' }, { label: 'Kul', fmt: 'money' }],
        rows: byMechanic.sort((a, z) => num(z._sum.total) - num(a._sum.total)).map((m) => [mName.get(m.primaryMechanicId!) ?? 'Mistri', m._count._all, r2(num(m._sum.laborTotal)), r2(num(m._sum.total))]) },
      { title: 'Gaari ki company', columns: [{ label: 'Company', fmt: 'text' }, { label: 'Jobs', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }],
        rows: byMake.map((x) => [x.makeName ?? 'Na-maloom', x._count._all, r2(num(x._sum.total))]) },
    ];
    return b;
  }

  // ─── Bookstore ────────────────────────────────────────────

  private async bookstore(c: Ctx): Promise<Block> {
    const join = Prisma.sql`LEFT JOIN "BookProfile" bp ON bp."productId" = si."productId"
      LEFT JOIN "StationeryProfile" sp ON sp."productId" = si."productId"
      LEFT JOIN "ArtSupplyProfile" ap ON ap."productId" = si."productId"`;
    const [byType, byBookCat, byStationery] = await Promise.all([
      this.soldBy(c, join, Prisma.sql`CASE WHEN bp.id IS NOT NULL THEN 'Kitabein' WHEN sp.id IS NOT NULL THEN 'Stationery' WHEN ap.id IS NOT NULL THEN 'Art ka saamaan' ELSE 'Baqi' END`),
      this.soldBy(c, Prisma.sql`JOIN "BookProfile" bp ON bp."productId" = si."productId"`, Prisma.sql`bp.category::text`, 15),
      this.soldBy(c, Prisma.sql`JOIN "StationeryProfile" sp ON sp."productId" = si."productId"`, Prisma.sql`sp.category::text`, 15),
    ]);
    const share = (k: string) => r2(byType.find((x) => x.key === k)?.revenue ?? 0);
    const b = empty();
    b.kpis = [
      { label: 'Kitabein', value: share('Kitabein'), fmt: 'money' },
      { label: 'Stationery', value: share('Stationery'), fmt: 'money' },
      { label: 'Art ka saamaan', value: share('Art ka saamaan'), fmt: 'money' },
    ];
    b.charts = [chart('Kya zyada bika', 'pie', 'money', byType.map((x) => ({ name: x.key ?? 'Baqi', value: r2(x.revenue) })))];
    b.tables = [
      this.soldTable('Qism war', 'Qism', byType, (k) => k ?? 'Baqi'),
      this.soldTable('Kitabon ki qism', 'Qism', byBookCat, (k) => pretty(k)),
      this.soldTable('Stationery ki qism', 'Qism', byStationery, (k) => pretty(k)),
    ];
    return b;
  }

  // ─── Services ─────────────────────────────────────────────

  private async servicesBiz(c: Ctx): Promise<Block> {
    const where: Prisma.ServiceJobWhereInput = { tenantId: c.tenantId, ...c.shop, createdAt: within(c.r) };
    const [byStatus, byPriority, byCategory, money, byTech] = await Promise.all([
      this.prisma.serviceJob.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.serviceJob.groupBy({ by: ['priority'], where, _count: { _all: true } }),
      this.prisma.serviceJob.groupBy({ by: ['category'], where, _count: { _all: true }, _sum: { totalCharge: true } }),
      this.prisma.serviceJob.aggregate({ where: { ...where, status: { not: 'CANCELLED' } }, _sum: { totalCharge: true, paidAmount: true } }),
      this.prisma.serviceJob.groupBy({ by: ['primaryTechnicianId'], where: { ...where, primaryTechnicianId: { not: null }, status: 'COMPLETED' }, _count: { _all: true }, _sum: { totalCharge: true } }),
    ]);
    const names = await this.people(byTech.map((t) => t.primaryTechnicianId));
    const total = byStatus.reduce((s, x) => s + x._count._all, 0);
    const doneCount = byStatus.find((x) => x.status === 'COMPLETED')?._count._all ?? 0;
    const b = empty();
    b.kpis = [
      { label: 'Jobs', value: total, fmt: 'count' },
      { label: 'Mukammal', value: doneCount, fmt: 'count', hint: total ? `${Math.round((doneCount / total) * 100)}%` : undefined },
      { label: 'Kaam ki raqam', value: r2(num(money._sum.totalCharge)), fmt: 'money' },
      { label: 'Baqi', value: r2(num(money._sum.totalCharge) - num(money._sum.paidAmount)), fmt: 'money' },
    ];
    b.charts = [
      chart('Job ki halat', 'bar', 'count', byStatus.map((x) => ({ name: pretty(x.status), value: x._count._all }))),
      chart('Zaroorat (priority)', 'pie', 'count', byPriority.map((x) => ({ name: pretty(x.priority), value: x._count._all }))),
    ];
    b.tables = [
      { title: 'Technician war', columns: [{ label: 'Technician', fmt: 'text' }, { label: 'Mukammal jobs', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }],
        rows: byTech.sort((a, z) => num(z._sum.totalCharge) - num(a._sum.totalCharge)).map((t) => [names.get(t.primaryTechnicianId!) ?? 'Technician', t._count._all, r2(num(t._sum.totalCharge))]) },
      { title: 'Service ki qism', columns: [{ label: 'Qism', fmt: 'text' }, { label: 'Jobs', fmt: 'count' }, { label: 'Raqam', fmt: 'money' }],
        rows: byCategory.sort((a, z) => z._count._all - a._count._all).map((x) => [pretty(x.category), x._count._all, r2(num(x._sum.totalCharge))]) },
    ];
    return b;
  }
}

/** Drops cost and profit figures for users without cost access. */
function withoutCost(b: Block): Block {
  return {
    ...b,
    kpis: b.kpis.filter((k) => k.fmt !== 'cost'),
    charts: b.charts.filter((c) => c.fmt !== 'cost'),
    tables: b.tables.map((t) => {
      const keep = t.columns.map((col) => col.fmt !== 'cost');
      return { ...t, columns: t.columns.filter((_, i) => keep[i]), rows: t.rows.map((row) => row.filter((_, i) => keep[i])) };
    }),
  };
}
