/**
 * Field work across all partners for admins: every lead, the visit audit
 * (fraud flags, photos, location) and the performance report.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PartnerEarningStatus, PartnerLeadStage, PartnerType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhone } from '../../modules/partners/shared/partner-utils';
import { meta, paging, pkDayRange } from './admin-partner-input';

/** Visits not marked fake. A plain NOT would also drop visits with no review (NULL). */
const NOT_FAKE = { OR: [{ review: null }, { review: { not: 'fake' } }] } satisfies Prisma.PartnerVisitWhereInput;

const STAGES = Object.values(PartnerLeadStage);

export interface LeadsQuery { partnerId?: string; stage?: string; city?: string; search?: string; sort?: string; page?: string; limit?: string }
export interface VisitsQuery { partnerId?: string; flagged?: string; review?: string; from?: string; to?: string; search?: string; page?: string; limit?: string }
export interface PerformanceQuery { from?: string; to?: string; group?: string; type?: string; search?: string; sort?: string; page?: string; limit?: string }

export interface PerfRow {
  key: string; label: string; sub: string | null; partnerId: string | null; partners: number;
  visits: number; leads: number; signups: number; activations: number; paid: number; earnings: number; revenue: number; roi: number | null;
}

@Injectable()
export class AdminPartnerActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /* ─────────────────────────── leads ─────────────────────────── */

  async leads(q: LeadsQuery) {
    const { page, limit, skip } = paging(q);
    const base: Prisma.PartnerLeadWhereInput = {};
    if (q.partnerId) base.partnerId = q.partnerId;
    if (q.city?.trim()) base.city = { contains: q.city.trim(), mode: 'insensitive' };
    const search = q.search?.trim();
    if (search) {
      const phone = normalizePhone(search);
      base.OR = [
        { shopName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: /^03\d{9}$/.test(phone) ? phone : search.replace(/\D/g, '') || search } },
      ];
    }
    const where: Prisma.PartnerLeadWhereInput = { ...base };
    if (q.stage && STAGES.includes(q.stage as PartnerLeadStage)) where.stage = q.stage as PartnerLeadStage;
    const orderBy: Prisma.PartnerLeadOrderByWithRelationInput[] =
      q.sort === 'follow_up' ? [{ followUpAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
        : q.sort === 'updated' ? [{ updatedAt: 'desc' }]
          : q.sort === 'oldest' ? [{ createdAt: 'asc' }]
            : [{ createdAt: 'desc' }];

    const [rows, total, stages] = await Promise.all([
      this.prisma.partnerLead.findMany({
        where, orderBy, skip, take: limit,
        select: {
          id: true, shopName: true, ownerName: true, phone: true, category: true, city: true, address: true, lat: true, lng: true, interest: true,
          stage: true, lostReason: true, followUpAt: true, notes: true, tenantId: true, lockedUntil: true, signedUpAt: true, activatedAt: true, paidAt: true,
          createdAt: true, updatedAt: true,
          partner: { select: { id: true, fullName: true, code: true } },
          _count: { select: { visits: true } },
        },
      }),
      this.prisma.partnerLead.count({ where }),
      this.prisma.partnerLead.groupBy({ by: ['stage'], where: base, _count: { _all: true } }),
    ]);
    const now = new Date();
    return {
      items: rows.map(({ _count, ...l }) => ({ ...l, visits: _count.visits, locked: l.lockedUntil > now })),
      stages: STAGES.map((s) => ({ stage: s, count: stages.find((r) => r.stage === s)?._count._all ?? 0 })),
      meta: meta(page, limit, total),
    };
  }

  /* ─────────────────────────── visits ─────────────────────────── */

  async visits(q: VisitsQuery) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.PartnerVisitWhereInput = {};
    if (q.partnerId) where.partnerId = q.partnerId;
    if (q.flagged === '1') where.flags = { isEmpty: false };
    if (q.review === 'none') where.review = null;
    else if (q.review === 'ok' || q.review === 'fake') where.review = q.review;
    const range = pkDayRange(q.from, q.to);
    if (range) where.visitedAt = range;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { lead: { shopName: { contains: s, mode: 'insensitive' } } },
        { partner: { fullName: { contains: s, mode: 'insensitive' } } },
        { partner: { code: { contains: s.toUpperCase() } } },
      ];
    }
    const [rows, total, open, fake] = await Promise.all([
      this.prisma.partnerVisit.findMany({
        where, orderBy: { visitedAt: 'desc' }, skip, take: limit,
        select: {
          id: true, lat: true, lng: true, accuracy: true, photoUrl: true, note: true, visitedAt: true, flags: true, review: true, reviewedAt: true, reviewedById: true, createdAt: true,
          lead: { select: { id: true, shopName: true, phone: true, city: true, stage: true } },
          partner: { select: { id: true, fullName: true, code: true } },
        },
      }),
      this.prisma.partnerVisit.count({ where }),
      this.prisma.partnerVisit.count({ where: { ...(q.partnerId ? { partnerId: q.partnerId } : {}), flags: { isEmpty: false }, review: null } }),
      this.prisma.partnerVisit.count({ where: { ...(q.partnerId ? { partnerId: q.partnerId } : {}), review: 'fake' } }),
    ]);
    const reviewerIds = [...new Set(rows.map((r) => r.reviewedById).filter((x): x is string => !!x))];
    const reviewers = reviewerIds.length ? await this.prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, fullName: true } }) : [];
    return {
      items: rows.map(({ reviewedById, ...v }) => ({ ...v, reviewedBy: reviewers.find((u) => u.id === reviewedById)?.fullName ?? null })),
      stats: { flaggedOpen: open, fake },
      meta: meta(page, limit, total),
    };
  }

  /** "ok" clears the flags as checked, "fake" marks the visit fake, null undoes the review. */
  async reviewVisit(adminId: string, id: string, review: unknown) {
    if (review !== null && review !== 'ok' && review !== 'fake') throw new BadRequestException('Review must be "ok" or "fake"');
    const v = await this.prisma.partnerVisit.findUnique({ where: { id }, select: { id: true } });
    if (!v) throw new NotFoundException('Visit not found');
    return this.prisma.partnerVisit.update({
      where: { id },
      data: review === null ? { review: null, reviewedById: null, reviewedAt: null } : { review, reviewedById: adminId, reviewedAt: new Date() },
      select: { id: true, review: true, reviewedAt: true },
    });
  }

  /* ─────────────────────────── performance ─────────────────────────── */

  /**
   * Per partner (or per city) for a period: visits (fake ones left out),
   * leads added, signups, activations, paid signups, earnings (not
   * reversed), revenue (approved payments of the partner's shops) and
   * ROI = revenue ÷ earnings.
   */
  async performance(q: PerformanceQuery) {
    const range = pkDayRange(q.from, q.to);
    const group = q.group === 'city' ? 'city' : 'partner';
    const partnerWhere: Prisma.PartnerWhereInput = { status: { not: 'REJECTED' } };
    if (q.type && Object.values(PartnerType).includes(q.type as PartnerType)) partnerWhere.type = q.type as PartnerType;
    const partners = await this.prisma.partner.findMany({ where: partnerWhere, select: { id: true, fullName: true, code: true, city: true, type: true, status: true } });
    const ids = partners.map((p) => p.id);
    if (!ids.length) return { group, rows: [], totals: this.emptyRow('total', 'Total'), meta: meta(1, 25, 0) };

    const inIds = { partnerId: { in: ids } };
    const reached = range ?? { not: null };
    const [visits, leads, signups, activations, paid, earnings, payments] = await Promise.all([
      this.prisma.partnerVisit.groupBy({ by: ['partnerId'], where: { ...inIds, ...(range ? { visitedAt: range } : {}), ...NOT_FAKE }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { ...inIds, ...(range ? { createdAt: range } : {}) }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { ...inIds, signedUpAt: reached }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { ...inIds, activatedAt: reached }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { ...inIds, paidAt: reached }, _count: { _all: true } }),
      this.prisma.partnerEarning.groupBy({ by: ['partnerId'], where: { ...inIds, status: { not: PartnerEarningStatus.REVERSED }, ...(range ? { createdAt: range } : {}) }, _sum: { amount: true } }),
      this.prisma.payment.findMany({
        where: {
          status: 'APPROVED',
          tenant: { partnerId: { in: ids } },
          ...(range ? { OR: [{ approvedAt: range }, { approvedAt: null, createdAt: range }] } : {}),
        },
        select: { amount: true, tenant: { select: { partnerId: true } } },
      }),
    ]);
    const count = (rows: Array<{ partnerId: string; _count: { _all: number } }>, id: string) => rows.find((r) => r.partnerId === id)?._count._all ?? 0;
    const revenue = new Map<string, number>();
    for (const p of payments) if (p.tenant.partnerId) revenue.set(p.tenant.partnerId, (revenue.get(p.tenant.partnerId) ?? 0) + p.amount);

    const perPartner: PerfRow[] = partners.map((p) => this.withRoi({
      key: p.id, label: p.fullName, sub: `${p.code}${p.city ? ` · ${p.city}` : ''}`, partnerId: p.id, partners: 1,
      visits: count(visits, p.id), leads: count(leads, p.id), signups: count(signups, p.id), activations: count(activations, p.id), paid: count(paid, p.id),
      earnings: earnings.find((r) => r.partnerId === p.id)?._sum.amount ?? 0, revenue: revenue.get(p.id) ?? 0, roi: null,
    }));

    let rows: PerfRow[] = perPartner;
    if (group === 'city') {
      const byCity = new Map<string, PerfRow>();
      partners.forEach((p, i) => {
        const city = p.city?.trim() || 'No city';
        const key = city.toLowerCase();
        const row = byCity.get(key) ?? this.emptyRow(key, city);
        this.add(row, perPartner[i]);
        byCity.set(key, row);
      });
      rows = [...byCity.values()].map((r) => this.withRoi(r));
    } else {
      // Partners with nothing in the period are left out of the per-partner list.
      rows = rows.filter((r) => r.visits || r.leads || r.signups || r.activations || r.paid || r.earnings || r.revenue);
    }
    const search = q.search?.trim().toLowerCase();
    if (search) rows = rows.filter((r) => r.label.toLowerCase().includes(search) || (r.sub ?? '').toLowerCase().includes(search));

    const sortKey = (['visits', 'leads', 'signups', 'activations', 'paid', 'earnings', 'revenue', 'roi'] as const).find((k) => k === q.sort) ?? 'paid';
    rows.sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1) || b.signups - a.signups || a.label.localeCompare(b.label));

    const totals = this.withRoi(rows.reduce((t, r) => this.add(t, r), this.emptyRow('total', 'Total')));
    const { page, limit, skip } = paging(q);
    return { group, rows: rows.slice(skip, skip + limit), totals, meta: meta(page, limit, rows.length) };
  }

  private emptyRow(key: string, label: string): PerfRow {
    return { key, label, sub: null, partnerId: null, partners: 0, visits: 0, leads: 0, signups: 0, activations: 0, paid: 0, earnings: 0, revenue: 0, roi: null };
  }

  private add(into: PerfRow, r: PerfRow): PerfRow {
    into.partners += r.partners;
    into.visits += r.visits; into.leads += r.leads; into.signups += r.signups; into.activations += r.activations; into.paid += r.paid;
    into.earnings += r.earnings; into.revenue += r.revenue;
    return into;
  }

  private withRoi(r: PerfRow): PerfRow {
    return { ...r, roi: r.earnings > 0 ? Math.round((r.revenue / r.earnings) * 100) / 100 : null };
  }
}
