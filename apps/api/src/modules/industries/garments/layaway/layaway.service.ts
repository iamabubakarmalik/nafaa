import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class LayawayService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.totalAmount || dto.totalAmount <= 0) throw new BadRequestException('Total amount required');
    if (!dto.installmentCount || dto.installmentCount < 1) throw new BadRequestException('Installment count required');

    const count = await this.prisma.garmentLayawayPlan.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const planNumber = `LAY-${year}-${String(count + 1).padStart(4, '0')}`;

    const deposit = dto.depositAmount ?? 0;
    const remaining = dto.totalAmount - deposit;
    const installmentAmount = Math.ceil((remaining / dto.installmentCount) * 100) / 100;

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const frequency = dto.frequency ?? 'MONTHLY';
    const daysStep = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30;

    const plan = await this.prisma.garmentLayawayPlan.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        planNumber,
        customerId: dto.customerId,
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

    return this.prisma.$transaction(async (tx) => {
      const newPaid = installment.paidAmount + dto.amount;
      let status: any = 'PARTIALLY_PAID';
      if (newPaid >= installment.amount) status = 'PAID';

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

      const planPaid = plan.paidAmount + dto.amount;
      const planRemaining = plan.totalAmount - planPaid;
      const isCompleted = planRemaining <= 0.01;

      // Next due date — first unpaid installment
      const nextUnpaid = await tx.garmentLayawayInstallment.findFirst({
        where: { planId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] }, id: { not: installmentId } },
        orderBy: { installmentNo: 'asc' },
      });

      return tx.garmentLayawayPlan.update({
        where: { id: planId },
        data: {
          paidAmount: planPaid,
          remainingAmount: Math.max(planRemaining, 0),
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
          completedAt: isCompleted ? new Date() : null,
          nextDueDate: nextUnpaid?.dueDate ?? null,
        },
        include: { installments: { orderBy: { installmentNo: 'asc' } } },
      });
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.garmentLayawayPlan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });
  }
}
