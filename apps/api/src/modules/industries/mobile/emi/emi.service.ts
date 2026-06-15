import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateEmiDto } from './dto/create-emi.dto';

@Injectable()
export class EmiService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.emiPlan.count({ where: { tenantId } });
    return `EMI-${String(count + 1).padStart(4, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateEmiDto) {
    const downPayment = dto.downPayment ?? 0;
    const financedAmount = dto.totalAmount - downPayment;
    if (financedAmount <= 0) {
      throw new BadRequestException('Financed amount must be positive');
    }

    const installmentAmount = Math.ceil(financedAmount / dto.installmentCount);
    const planNumber = await this.nextNumber(user.tenantId);
    const startDate = new Date(dto.startDate);

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.emiPlan.create({
        data: {
          tenantId: user.tenantId,
          saleId: dto.saleId,
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          planNumber,
          totalAmount: dto.totalAmount,
          downPayment,
          financedAmount,
          installmentCount: dto.installmentCount,
          installmentAmount,
          startDate,
          remainingAmount: financedAmount,
          notes: dto.notes,
        },
      });

      const installments = [];
      for (let i = 1; i <= dto.installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          planId: plan.id,
          installmentNumber: i,
          amount: i === dto.installmentCount
            ? financedAmount - installmentAmount * (dto.installmentCount - 1)
            : installmentAmount,
          dueDate,
        });
      }

      await tx.emiInstallment.createMany({ data: installments });

      return tx.emiPlan.findUnique({
        where: { id: plan.id },
        include: { installments: { orderBy: { installmentNumber: 'asc' } } },
      });
    });
  }

  async list(user: AuthenticatedUser, status?: string) {
    return this.prisma.emiPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status && { status: status as any }),
      },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.emiPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('EMI plan not found');
    return plan;
  }

  async payInstallment(user: AuthenticatedUser, planId: string, installmentId: string, paidAmount: number) {
    const plan = await this.findOne(user, planId);
    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException('Installment not found');
    if (installment.status === 'PAID') throw new BadRequestException('Already paid');

    return this.prisma.$transaction(async (tx) => {
      const newPaidAmount = installment.paidAmount + paidAmount;
      const isFullyPaid = newPaidAmount >= installment.amount;

      await tx.emiInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: isFullyPaid ? new Date() : null,
          status: isFullyPaid ? 'PAID' : 'PENDING',
        },
      });

      const updatedPlan = await tx.emiPlan.update({
        where: { id: planId },
        data: {
          paidAmount: { increment: paidAmount },
          remainingAmount: { decrement: paidAmount },
        },
      });

      // Check if all installments paid
      const remaining = await tx.emiInstallment.count({
        where: { planId, status: { not: 'PAID' } },
      });

      if (remaining === 0) {
        await tx.emiPlan.update({
          where: { id: planId },
          data: { status: 'COMPLETED' },
        });
      }

      return updatedPlan;
    });
  }

  async stats(user: AuthenticatedUser) {
    const [active, completed, overdue, totalFinanced, totalCollected] = await Promise.all([
      this.prisma.emiPlan.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.emiPlan.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.emiInstallment.count({
        where: {
          plan: { tenantId: user.tenantId },
          status: 'PENDING',
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { financedAmount: true },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { paidAmount: true },
      }),
    ]);

    return {
      active,
      completed,
      overdue,
      totalFinanced: totalFinanced._sum.financedAmount || 0,
      totalCollected: totalCollected._sum.paidAmount || 0,
    };
  }

  async cancel(user: AuthenticatedUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.emiPlan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
