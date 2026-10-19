/**
 * Salon service list: price, time, commission and who it is for. Each
 * service is billed against its own service product, which is kept in step
 * here. Removing a service only switches it off; its history stays.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureServiceProduct, r2, serviceSku } from '../common/salon-common';
import { UpdateServiceDto, UpsertServiceDto } from './dto/upsert-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private clean<T extends UpdateServiceDto>(dto: T): T {
    const out = { ...dto };
    delete out.shopId;
    if (out.name !== undefined) out.name = out.name.trim();
    if (out.discountPrice != null && out.price != null && out.discountPrice >= out.price) out.discountPrice = null;
    return out;
  }

  private async assertName(tenantId: string, name: string, exceptId?: string) {
    const dup = await this.prisma.salonService.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (dup) throw new BadRequestException(`"${name}" naam ki service pehle se hai`);
  }

  async create(user: AuthenticatedUser, dto: UpsertServiceDto) {
    const data = this.clean(dto);
    await this.assertName(user.tenantId, data.name);
    return this.prisma.$transaction(async (tx) => {
      const svc = await tx.salonService.create({ data: { ...data, tenantId: user.tenantId } });
      await ensureServiceProduct(tx, user.tenantId, svc);
      return svc;
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; forGender?: string; search?: string; active?: boolean; featured?: boolean; popular?: boolean }) {
    return this.prisma.salonService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as never }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.forGender === 'MEN' && { forMen: true }),
        ...(params.forGender === 'WOMEN' && { forWomen: true }),
        ...(params.forGender === 'KIDS' && { forKids: true }),
        ...(params.search?.trim() && {
          OR: [
            { name: { contains: params.search.trim(), mode: 'insensitive' as const } },
            { code: { contains: params.search.trim(), mode: 'insensitive' as const } },
          ],
        }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.salonService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service nahi mili');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateServiceDto) {
    const s = await this.getOne(user, id);
    const data = this.clean({ ...dto, price: dto.price ?? s.price });
    if (data.name && data.name.toLowerCase() !== s.name.toLowerCase()) await this.assertName(user.tenantId, data.name, id);
    return this.prisma.$transaction(async (tx) => {
      const svc = await tx.salonService.update({ where: { id }, data });
      await ensureServiceProduct(tx, user.tenantId, svc);
      return svc;
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.$transaction(async (tx) => {
      const svc = await tx.salonService.update({ where: { id }, data: { isActive: false } });
      await tx.product.updateMany({ where: { tenantId: user.tenantId, sku: serviceSku(id) }, data: { isActive: false } });
      return svc;
    });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.salonService.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    const grouped: Record<string, typeof all> = {};
    all.forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });
    return grouped;
  }

  /**
   * Work on one service from billed appointments (voided bills left out):
   * last 90 days by stylist, the month trend and the latest 20 visits.
   */
  async stats(user: AuthenticatedUser, id: string) {
    const svc = await this.getOne(user, id);
    const since = new Date(Date.now() - 90 * 86_400_000);
    const lines = await this.prisma.salonAppointmentService.findMany({
      where: { serviceId: id, appointment: { tenantId: user.tenantId, saleId: { not: null }, scheduledStart: { gte: since } } },
      select: {
        staffProfileId: true, staffName: true, total: true, commissionAmount: true, notes: true,
        appointment: { select: { id: true, appointmentNumber: true, customerName: true, scheduledStart: true, saleId: true } },
      },
      orderBy: { appointment: { scheduledStart: 'desc' } },
      take: 5000,
    });
    const saleIds = [...new Set(lines.map((l) => l.appointment.saleId!).filter(Boolean))];
    const voided = new Set((await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, id: { in: saleIds }, status: 'VOIDED' }, select: { id: true },
    })).map((s) => s.id));
    const live = lines.filter((l) => !voided.has(l.appointment.saleId!));
    const staff = new Map<string, { staffProfileId: string; name: string; count: number; revenue: number; commission: number }>();
    for (const l of live) {
      const key = l.staffProfileId ?? '';
      const row = staff.get(key) ?? { staffProfileId: key, name: l.staffName ?? 'Bina stylist', count: 0, revenue: 0, commission: 0 };
      row.count += 1; row.revenue = r2(row.revenue + l.total); row.commission = r2(row.commission + l.commissionAmount);
      staff.set(key, row);
    }
    const [assigned, product] = await Promise.all([
      this.prisma.salonStaffService.findMany({ where: { serviceId: id, staffProfile: { tenantId: user.tenantId, isActive: true } }, select: { staffProfileId: true, customPrice: true, customDuration: true, customCommissionPct: true } }),
      this.prisma.product.findFirst({ where: { tenantId: user.tenantId, sku: serviceSku(id) }, select: { id: true } }),
    ]);
    return {
      service: svc,
      productId: product?.id ?? null,
      last90: { count: live.length, revenue: r2(live.reduce((s, l) => s + l.total, 0)), commission: r2(live.reduce((s, l) => s + l.commissionAmount, 0)) },
      staff: [...staff.values()].sort((a, b) => b.count - a.count),
      assigned,
      recent: live.slice(0, 20).map((l) => ({
        appointmentId: l.appointment.id, appointmentNumber: l.appointment.appointmentNumber, customerName: l.appointment.customerName,
        at: l.appointment.scheduledStart, staffName: l.staffName, total: l.total, notes: l.notes,
      })),
    };
  }
}
