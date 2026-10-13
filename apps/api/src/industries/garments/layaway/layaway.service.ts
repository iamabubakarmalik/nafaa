import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { nextRunningNumber } from '../common/service-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class LayawayService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any, activeShopId?: string | null) {
    dto.totalAmount = r2(dto.totalAmount);
    dto.installmentCount = Math.floor(Number(dto.installmentCount) || 0);
    if (!dto.totalAmount || dto.totalAmount <= 0) throw new BadRequestException('Total amount required');
    if (!dto.installmentCount || dto.installmentCount < 1) throw new BadRequestException('Installment count required');
    if (!String(dto.customerName ?? '').trim() && !dto.customerId) throw new BadRequestException('Customer ka naam zaroori hai');

    const planNumber = await nextRunningNumber(
      async (prefix) => (await this.prisma.garmentLayawayPlan.findFirst({
        where: { tenantId: user.tenantId, planNumber: { startsWith: prefix } },
        orderBy: { planNumber: 'desc' },
        select: { planNumber: true },
      }))?.planNumber,
      `LAY-${new Date().getFullYear()}-`,
    );

    const deposit = r2(Math.max(Number(dto.depositAmount) || 0, 0));
    if (deposit > dto.totalAmount + 0.01) throw new BadRequestException('Deposit kul amount se zyada nahi ho sakta');
    const remaining = r2(dto.totalAmount - deposit);
    const installmentAmount = Math.ceil((remaining / dto.installmentCount) * 100) / 100;

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const frequency = dto.frequency ?? 'MONTHLY';
    const daysStep = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30;

    // Every rupee taken on a layaway sits on the customer's khata until the
    // plan is paid off; the last payment turns the plan into a sale.
    const shopId = await resolveIndustryShopId(this.prisma as any, user, dto.shopId || activeShopId);
    const customerId = await ensureCustomer(this.prisma as any, user, {
      customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone, shopId,
    });
    const plan = await this.prisma.garmentLayawayPlan.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        planNumber,
        customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        productId: dto.productId,
        variantId: dto.variantId,
        tailoringOrderId: dto.tailoringOrderId,
        totalAmount: dto.totalAmount,
        depositAmount: deposit,
        paidAmount: deposit,
        remainingAmount: remaining,
        installmentCount: dto.installmentCount,
        installmentAmount,
        frequency,
        startDate,
        nextDueDate: new Date(startDate.getTime() + daysStep * 24 * 60 * 60 * 1000),
        finalDueDate: new Date(startDate.getTime() + daysStep * dto.installmentCount * 24 * 60 * 60 * 1000),
        notes: dto.notes,
        createdById: user.id,
      },
    });

    if (deposit > 0) {
      await recordKhataPayment(this.prisma as any, user, {
        customerId, shopId, amount: deposit, reference: planNumber, note: `Layaway deposit ${planNumber}`, method: dto.paymentMethod,
      });
    }

    // Auto-create installments
    for (let i = 1; i <= dto.installmentCount; i++) {
      const dueDate = new Date(startDate.getTime() + daysStep * i * 24 * 60 * 60 * 1000);
      await this.prisma.garmentLayawayInstallment.create({
        data: {
          planId: plan.id,
          installmentNo: i,
          dueDate,
          amount: installmentAmount,
        },
      });
    }

    return this.prisma.garmentLayawayPlan.findUnique({
      where: { id: plan.id },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string }) {
    return this.prisma.garmentLayawayPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
      },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
      orderBy: { nextDueDate: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async payInstallment(user: AuthenticatedUser, planId: string, installmentId: string, dto: { amount: number; paymentMethod: string; reference?: string; notes?: string }) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({ where: { id: planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    const installment = await this.prisma.garmentLayawayInstallment.findFirst({ where: { id: installmentId, planId } });
    if (!installment) throw new NotFoundException('Installment not found');

    if (plan.status !== 'ACTIVE') throw new BadRequestException('Yeh plan band ho chuka hai');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount sahi likhein');
    if (amount > r2(plan.remainingAmount) + 0.01) throw new BadRequestException(`Baqi sirf Rs ${r2(plan.remainingAmount)} hai`);

    return this.prisma.$transaction(async (tx) => {
      const newPaid = r2(installment.paidAmount + amount);
      let status: any = 'PARTIALLY_PAID';
      if (newPaid >= installment.amount - 0.01) status = 'PAID';

      await tx.garmentLayawayInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaid,
          status,
          paidAt: status === 'PAID' ? new Date() : null,
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      const shopId = await resolveIndustryShopId(tx, user, plan.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: plan.customerId, name: plan.customerName, phone: plan.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: plan.planNumber, note: `Layaway qist ${plan.planNumber}`, method: dto.paymentMethod,
      });

      const planPaid = r2(plan.paidAmount + amount);
      const planRemaining = r2(plan.totalAmount - planPaid);
      const isCompleted = planRemaining <= 0.01;

      if (isCompleted) {
        // Paid off: the goods are handed over and the plan becomes a sale,
        // paid from the money held on the khata.
        const legacyPaid = r2(Math.max(plan.paidAmount - (await paidOnKhata(tx, user.tenantId, plan.planNumber)) + amount, 0));
        await postIndustrySale(tx, user, {
          saleNumber: plan.planNumber,
          sourceRef: plan.planNumber,
          shopId,
          customerId,
          lines: [{ label: `Layaway ${plan.planNumber}${plan.notes ? ` — ${plan.notes}` : ''}`, amount: r2(plan.totalAmount) }],
          paidAmount: legacyPaid,
          paymentMethod: dto.paymentMethod,
        });
      }

      // Next due date — first unpaid installment
      const nextUnpaid = await tx.garmentLayawayInstallment.findFirst({
        where: { planId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] }, id: { not: installmentId } },
        orderBy: { installmentNo: 'asc' },
      });

      return tx.garmentLayawayPlan.update({
        where: { id: planId },
        data: {
          customerId,
          shopId,
          paidAmount: planPaid,
          remainingAmount: Math.max(planRemaining, 0),
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
          completedAt: isCompleted ? new Date() : null,
          nextDueDate: isCompleted ? null : nextUnpaid?.dueDate ?? null,
        },
        include: { installments: { orderBy: { installmentNo: 'asc' } } },
      });
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.status === 'COMPLETED') throw new BadRequestException('Poora plan cancel nahi ho sakta — bill ki Return karein');
    // Money already taken stays on the customer's khata as their advance.
    return this.prisma.garmentLayawayPlan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });
  }
}
