/**
 * Salon side of a customer: hair and skin notes, allergies, the favourite
 * stylist, and the visit history the stylist reads before starting (last
 * services, colour formula notes, products used). Visits and spend are
 * kept up to date by the counter bill.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS, paging, r2 } from '../common/salon-common';
import { UpsertCustomerProfileDto } from './dto/customer-profile.dto';

const AWAY_DAYS = 45;
const VIEWS = ['all', 'regular', 'away', 'allergy'] as const;
type View = (typeof VIEWS)[number];

@Injectable()
export class CustomerProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertCustomerProfileDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    if (dto.preferredStaffId) {
      const sp = await this.prisma.salonStaffProfile.findFirst({ where: { id: dto.preferredStaffId, tenantId: user.tenantId }, select: { id: true } });
      if (!sp) throw new NotFoundException('Stylist nahi mila');
    }
    const data = { ...dto, allergies: dto.allergies?.map((a) => a.trim()).filter(Boolean) };
    return this.prisma.salonCustomerProfile.upsert({
      where: { customerId: dto.customerId },
      update: data,
      create: { ...data, tenantId: user.tenantId },
    });
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.salonCustomerProfile.findFirst({ where: { customerId, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { search?: string }) {
    const term = params.search?.trim();
    const ids = term
      ? (await this.prisma.customer.findMany({
          where: { tenantId: user.tenantId, OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }] },
          select: { id: true }, take: 100,
        })).map((c) => c.id)
      : undefined;
    return this.prisma.salonCustomerProfile.findMany({
      where: { tenantId: user.tenantId, ...(ids && { customerId: { in: ids } }) },
      orderBy: { lastVisitAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Salon customers page. Without a search it lists customers with a salon
   * profile (made on the first bill or when notes are saved), newest visit
   * first; a search looks through every customer of the shop.
   */
  async page(user: AuthenticatedUser, q: { search?: string; view?: string; page?: string; limit?: string }) {
    const tenantId = user.tenantId;
    const { page, limit, skip } = paging(q, 100);
    const view: View = (VIEWS as readonly string[]).includes(q.view ?? '') ? (q.view as View) : 'all';
    const term = q.search?.trim();
    const awaySince = new Date(Date.now() - AWAY_DAYS * DAY_MS);
    const views: Record<View, Prisma.SalonCustomerProfileWhereInput> = {
      all: {},
      regular: { totalVisits: { gte: 3 } },
      away: { lastVisitAt: { lt: awaySince } },
      allergy: { NOT: { allergies: { isEmpty: true } } },
    };
    const counts = Object.fromEntries(await Promise.all(VIEWS.map(async (v) => [v, await this.prisma.salonCustomerProfile.count({ where: { tenantId, ...views[v] } })] as const)));

    if (term) {
      const where: Prisma.CustomerWhereInput = {
        tenantId, isActive: true,
        OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }],
      };
      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({ where, select: { id: true, name: true, phone: true, balance: true }, orderBy: { name: 'asc' }, skip, take: limit }),
        this.prisma.customer.count({ where }),
      ]);
      const profiles = await this.prisma.salonCustomerProfile.findMany({ where: { tenantId, customerId: { in: customers.map((c) => c.id) } } });
      const byId = new Map(profiles.map((p) => [p.customerId, p]));
      return { items: customers.map((c) => ({ customer: c, profile: byId.get(c.id) ?? null })), total, page, limit, pages: Math.max(Math.ceil(total / limit), 1), counts };
    }

    const where: Prisma.SalonCustomerProfileWhereInput = { tenantId, ...views[view] };
    const [profiles, total] = await Promise.all([
      this.prisma.salonCustomerProfile.findMany({ where, orderBy: [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }], skip, take: limit }),
      this.prisma.salonCustomerProfile.count({ where }),
    ]);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: profiles.map((p) => p.customerId) } },
      select: { id: true, name: true, phone: true, balance: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));
    return {
      items: profiles.filter((p) => byId.has(p.customerId)).map((p) => ({ customer: byId.get(p.customerId)!, profile: p })),
      total, page, limit, pages: Math.max(Math.ceil(total / limit), 1), counts,
    };
  }

  async history(user: AuthenticatedUser, customerId: string) {
    const tenantId = user.tenantId;
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, name: true, phone: true, balance: true, createdAt: true },
    });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const [profile, visits, packages, memberships] = await Promise.all([
      this.prisma.salonCustomerProfile.findFirst({ where: { tenantId, customerId } }),
      this.prisma.salonAppointment.findMany({
        where: { tenantId, customerId },
        include: { services: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { scheduledStart: 'desc' },
        take: 60,
      }),
      this.prisma.salonPackagePurchase.findMany({ where: { tenantId, customerId }, include: { package: { select: { name: true, totalSessions: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.salonMembership.findMany({ where: { tenantId, customerId }, include: { plan: { select: { name: true, tier: true, discountPct: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const saleIds = visits.map((v) => v.saleId).filter((x): x is string => !!x);
    const sales = saleIds.length
      ? await this.prisma.sale.findMany({ where: { tenantId, id: { in: saleIds } }, select: { id: true, saleNumber: true, status: true, total: true } })
      : [];
    const saleOf = new Map(sales.map((s) => [s.id, s]));
    const billed = visits.filter((v) => v.saleId && saleOf.get(v.saleId)?.status !== 'VOIDED');

    const tally = (key: (l: (typeof visits)[number]['services'][number]) => string | null) => {
      const m = new Map<string, number>();
      for (const v of billed) for (const l of v.services) { const k = key(l); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
      return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    };
    const dates = billed.map((v) => v.actualEnd ?? v.scheduledStart).sort((a, b) => a.getTime() - b.getTime());
    const gaps = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / DAY_MS);

    return {
      customer,
      profile,
      stats: {
        visits: billed.length,
        spent: r2(billed.reduce((s, v) => s + (saleOf.get(v.saleId!)?.total ?? 0), 0)),
        lastVisit: dates[dates.length - 1] ?? null,
        favouriteStylist: tally((l) => l.staffName),
        favouriteService: tally((l) => l.serviceName),
        everyDays: gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null,
        noShows: visits.filter((v) => v.status === 'NO_SHOW').length,
      },
      visits: visits.map((v) => ({
        id: v.id, appointmentNumber: v.appointmentNumber, status: v.status, at: v.actualEnd ?? v.scheduledStart,
        total: v.total, paidAmount: v.paidAmount, sale: v.saleId ? saleOf.get(v.saleId) ?? null : null,
        services: v.services.map((l) => ({ serviceName: l.serviceName, staffName: l.staffName, total: l.total, notes: l.notes, productsUsed: l.productsUsed })),
      })),
      packages,
      memberships,
    };
  }
}
