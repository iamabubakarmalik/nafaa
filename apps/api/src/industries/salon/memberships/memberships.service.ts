/**
 * Memberships: plans (price, days, discount on services) and the customers
 * who hold one. Selling a membership is income on the day it is sold (a
 * bill through the khata helper; any unpaid part goes on khata). The
 * discount is applied at the counter bill. A voided membership bill
 * cancels the membership (SalonBillVoidService).
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale } from '../../_shared/industry-sale.helper';
import { DAY_MS, r2, withNextNumber } from '../common/salon-common';
import { CreatePlanDto, SubscribeDto, UpdatePlanDto } from './dto/membership.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPlanName(tenantId: string, name: string, exceptId?: string) {
    const dup = await this.prisma.salonMembershipPlan.findFirst({
      where: { tenantId, name: { equals: name.trim(), mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) }, select: { id: true },
    });
    if (dup) throw new BadRequestException(`"${name.trim()}" naam ka plan pehle se hai`);
  }

  private async assertServices(tenantId: string, ids?: string[]) {
    if (!ids?.length) return;
    const n = await this.prisma.salonService.count({ where: { tenantId, id: { in: [...new Set(ids)] } } });
    if (n !== new Set(ids).size) throw new NotFoundException('Koi service nahi mili');
  }

  async createPlan(user: AuthenticatedUser, dto: CreatePlanDto) {
    await this.assertPlanName(user.tenantId, dto.name);
    await this.assertServices(user.tenantId, dto.freeServiceIds);
    return this.prisma.salonMembershipPlan.create({ data: { ...dto, name: dto.name.trim(), tenantId: user.tenantId } });
  }

  async listPlans(user: AuthenticatedUser, params: { active?: boolean }) {
    return this.prisma.salonMembershipPlan.findMany({
      where: { tenantId: user.tenantId, ...(params.active !== undefined && { isActive: params.active }) },
      orderBy: [{ isActive: 'desc' }, { displayOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async updatePlan(user: AuthenticatedUser, id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    if (dto.name && dto.name.trim().toLowerCase() !== plan.name.toLowerCase()) await this.assertPlanName(user.tenantId, dto.name, id);
    await this.assertServices(user.tenantId, dto.freeServiceIds);
    return this.prisma.salonMembershipPlan.update({ where: { id }, data: { ...dto, ...(dto.name && { name: dto.name.trim() }) } });
  }

  async removePlan(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    return this.prisma.salonMembershipPlan.update({ where: { id }, data: { isActive: false } });
  }

  async subscribe(user: AuthenticatedUser, dto: SubscribeDto) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id: dto.planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    if (!plan.isActive) throw new BadRequestException('Ye plan band hai');
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const amountPaid = r2(dto.amountPaid);
    if (amountPaid > plan.price + 0.01) throw new BadRequestException(`Plan ki qeemat sirf Rs ${plan.price} hai`);
    const running = await this.prisma.salonMembership.findFirst({
      where: { tenantId: user.tenantId, customerId: dto.customerId, planId: plan.id, status: 'ACTIVE', expiryDate: { gte: new Date() } },
      select: { membershipNumber: true },
    });
    if (running) throw new BadRequestException(`Is customer ki ${plan.name} membership pehle se chal rahi hai (${running.membershipNumber})`);

    const expiryDate = new Date(Date.now() + plan.durationDays * DAY_MS);
    const year = new Date().getUTCFullYear();
    return withNextNumber(
      (prefix) => this.prisma.salonMembership.findFirst({ where: { tenantId: user.tenantId, membershipNumber: { startsWith: prefix } }, orderBy: { membershipNumber: 'desc' }, select: { membershipNumber: true } }).then((r) => r?.membershipNumber),
      `MEM-${year}-`,
      (membershipNumber) => this.prisma.$transaction(async (tx) => {
        const membership = await tx.salonMembership.create({
          data: {
            tenantId: user.tenantId, planId: dto.planId, customerId: dto.customerId, membershipNumber, expiryDate, amountPaid,
            paymentMethod: dto.paymentMethod, autoRenew: dto.autoRenew ?? false, notes: dto.notes?.trim() || null, createdById: user.id,
          },
        });
        await tx.salonMembershipPlan.update({ where: { id: dto.planId }, data: { totalSubscribers: { increment: 1 } } });
        // Membership fee is income on the day it is sold; any unpaid part goes on khata.
        if (plan.price > 0) {
          await postIndustrySale(tx, user, {
            saleNumber: `SLN-${membershipNumber}`,
            sourceRef: membershipNumber,
            shopId: dto.shopId,
            customerId: dto.customerId,
            lines: [{ label: `Membership: ${plan.name} (${plan.durationDays} din)`, amount: plan.price }],
            paidAmount: amountPaid,
            paymentMethod: dto.paymentMethod,
          });
        }
        return membership;
      }),
    );
  }

  async listMemberships(user: AuthenticatedUser, params: { status?: string; customerId?: string; planId?: string; search?: string }) {
    await this.expireOldOnes(user);
    const term = params.search?.trim();
    const customerIds = term
      ? (await this.prisma.customer.findMany({
          where: { tenantId: user.tenantId, OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }] },
          select: { id: true }, take: 200,
        })).map((c) => c.id)
      : undefined;
    const rows = await this.prisma.salonMembership.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.planId && { planId: params.planId }),
        ...(term && { OR: [{ membershipNumber: { contains: term, mode: 'insensitive' as const } }, { customerId: { in: customerIds } }] }),
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.customerId))] } },
      select: { id: true, name: true, phone: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));
    return rows.map((r) => ({ ...r, customer: byId.get(r.customerId) ?? null }));
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const m = await this.prisma.salonMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership nahi mili');
    if (m.status === 'CANCELLED') throw new BadRequestException('Ye membership pehle hi cancel hai');
    return this.prisma.salonMembership.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason?.trim() || null },
    });
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.salonMembership.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', expiryDate: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }
}
