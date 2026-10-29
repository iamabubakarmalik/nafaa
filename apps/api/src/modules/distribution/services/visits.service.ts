/**
 * Booker visits: GPS check-in at a customer and what came of it (an order,
 * no order with a reason, shop closed, recovery only). A check-in far from
 * the customer's saved location is kept and flagged, never refused: phones
 * work offline and GPS is often rough indoors.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { NO_ORDER_REASONS } from '../distribution.constants';
import { CreateVisitDto, ListVisitsDto } from '../dto/field.dto';
import { distanceMetres } from '../helpers/logistics';
import { readSettings } from '../helpers/pricing-loader';
import { customerCards, dayRange, routeNames, userNames } from '../distribution.support';

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async create(user: AuthenticatedUser, dto: CreateVisitDto) {
    const tenantId = user.tenantId;
    const clientRef = dto.clientRef?.trim() || null;
    if (clientRef) {
      const seen = await this.prisma.distVisit.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } } });
      if (seen) return { visit: seen, duplicate: true };
    }
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true, routeId: true, latitude: true, longitude: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    if (dto.outcome === 'NO_ORDER' && !dto.noOrderReason) throw new BadRequestException('Order na milne ki wajah chunein');
    if (dto.noOrderReason && !NO_ORDER_REASONS.some((r) => r.code === dto.noOrderReason)) throw new BadRequestException('Wajah sahi nahi');

    let salesOrderId: string | null = null;
    if (dto.salesOrderId || dto.salesOrderClientRef) {
      const o = await this.prisma.salesOrder.findFirst({
        where: { tenantId, ...(dto.salesOrderId ? { id: dto.salesOrderId } : { clientRef: dto.salesOrderClientRef }) },
        select: { id: true, customerId: true },
      });
      if (o && o.customerId === customer.id) salesOrderId = o.id;
    }

    const settings = await readSettings(this.prisma, tenantId);
    const hasGps = dto.latitude != null && dto.longitude != null;
    const distanceM = hasGps && customer.latitude != null && customer.longitude != null
      ? distanceMetres(dto.latitude!, dto.longitude!, customer.latitude, customer.longitude)
      : null;
    const radius = settings?.checkInRadiusM ?? 150;
    const withinRadius = distanceM == null ? null : distanceM <= radius + Math.min(Number(dto.accuracyM) || 0, 100);
    const now = new Date();
    const checkInAt = dto.checkInAt ? new Date(Math.min(new Date(dto.checkInAt).getTime(), now.getTime())) : now;

    try {
      const visit = await this.prisma.distVisit.create({
        data: {
          tenantId, customerId: customer.id, routeId: dto.routeId || customer.routeId || null, userId: user.id,
          checkInAt, checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
          latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, accuracyM: dto.accuracyM ?? null,
          distanceM, withinRadius, outcome: dto.outcome, noOrderReason: dto.noOrderReason ?? null,
          note: dto.note?.trim() || null, salesOrderId, photoUrl: dto.photoUrl || null, clientRef,
        },
      });
      return { visit, duplicate: false, warning: settings?.requireCheckIn && withinRadius === false ? `Customer ki location se ${distanceM} meter door check-in` : null };
    } catch (e) {
      if (clientRef && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const seen = await this.prisma.distVisit.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } } });
        if (seen) return { visit: seen, duplicate: true };
      }
      throw e;
    }
  }

  async list(user: AuthenticatedUser, q: ListVisitsDto, restrictToUser?: string) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const r = dayRange(clock, q.from, q.to ?? q.from);
    const where: Prisma.DistVisitWhereInput = {
      tenantId, checkInAt: { gte: r.gte, lt: r.lt },
      ...((restrictToUser ?? q.userId) && { userId: restrictToUser ?? q.userId }),
      ...(q.routeId && { routeId: q.routeId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.outcome && { outcome: q.outcome }),
    };
    const [total, rows, byOutcome] = await Promise.all([
      this.prisma.distVisit.count({ where }),
      this.prisma.distVisit.findMany({ where, orderBy: { checkInAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.distVisit.groupBy({ by: ['outcome'], where, _count: { _all: true } }),
    ]);
    const [customers, users, routes] = await Promise.all([
      customerCards(this.prisma, tenantId, rows.map((v) => v.customerId)),
      userNames(this.prisma, tenantId, rows.map((v) => v.userId)),
      routeNames(this.prisma, tenantId, rows.map((v) => v.routeId)),
    ]);
    const reason = new Map(NO_ORDER_REASONS.map((x) => [x.code, x.label]));
    return {
      total, page, limit, from: r.from, to: r.to,
      byOutcome: Object.fromEntries(byOutcome.map((b) => [b.outcome, b._count._all])),
      visits: rows.map((v) => ({
        ...v,
        customer: customers.get(v.customerId) ?? null,
        userName: users.get(v.userId) ?? null,
        routeName: v.routeId ? routes.get(v.routeId) ?? null : null,
        noOrderReasonLabel: v.noOrderReason ? reason.get(v.noOrderReason) ?? v.noOrderReason : null,
      })),
    };
  }
}
