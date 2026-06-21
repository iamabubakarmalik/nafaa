import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateEmiPlanDto } from './dto/create-emi-plan.dto';
import { UpdateEmiPlanDto } from './dto/update-emi-plan.dto';
import { RecordInstallmentPaymentDto } from './dto/record-installment-payment.dto';
import { QueryEmiPlansDto } from './dto/query-emi.dto';
import {
  Prisma, EmiPlanStatus, EmiInstallmentStatus,
} from '@prisma/client';

@Injectable()
export class EmiService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // CREATE EMI PLAN — auto-generates installments
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateEmiPlanDto) {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Validate sale (if linked)
    if (dto.saleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: dto.saleId, tenantId: user.tenantId },
      });
      if (!sale) throw new NotFoundException('Sale not found');

      const existingPlan = await this.prisma.emiPlan.findUnique({
        where: { saleId: dto.saleId },
      });
      if (existingPlan) {
        throw new BadRequestException('EMI plan already exists for this sale');
      }
    }

    // Calculate amounts
    const downPayment = dto.downPayment ?? 0;
    const financedAmount = dto.totalAmount - downPayment;

    if (financedAmount <= 0) {
      throw new BadRequestException('Financed amount must be > 0 (downpayment ≥ total not allowed)');
    }

    const installmentAmount = Number((financedAmount / dto.installmentCount).toFixed(2));

    // Generate plan number
    const year = new Date().getFullYear();
    const prefix = `EMI-${year}-`;
    const last = await this.prisma.emiPlan.findFirst({
      where: { tenantId: user.tenantId, planNumber: { startsWith: prefix } },
      orderBy: { planNumber: 'desc' },
      select: { planNumber: true },
    });
    let nextNum = 1;
    if (last?.planNumber) {
      const parts = last.planNumber.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) nextNum = n + 1;
    }
    const planNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      // Create plan
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
          startDate: new Date(dto.startDate),
          paidAmount: downPayment,
          remainingAmount: financedAmount,
          status: EmiPlanStatus.ACTIVE,
          notes: dto.notes,
        },
      });

      // Auto-generate installments (monthly intervals)
      const startDate = new Date(dto.startDate);
      const installmentsData = [];
      let runningTotal = 0;

      for (let i = 1; i <= dto.installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        // Last installment absorbs any rounding diff
        const amount = i === dto.installmentCount
          ? Number((financedAmount - runningTotal).toFixed(2))
          : installmentAmount;
        runningTotal += amount;

        installmentsData.push({
          planId: plan.id,
          installmentNumber: i,
          amount,
          dueDate,
          status: EmiInstallmentStatus.PENDING,
        });
      }

      await tx.emiInstallment.createMany({
        data: installmentsData,
      });

      return tx.emiPlan.findUnique({
        where: { id: plan.id },
        include: {
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
      });
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL + STATS
  // ════════════════════════════════════════════════════════

  async findAll(user: AuthenticatedUser, query: QueryEmiPlansDto) {
    const where: Prisma.EmiPlanWhereInput = {
      tenantId: user.tenantId,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { planNumber: { contains: query.search, mode: 'insensitive' as const } },
          { customerName: { contains: query.search, mode: 'insensitive' as const } },
          { customerPhone: { contains: query.search } },
        ],
      }),
    };

    // Filter: ONLY_OVERDUE / ONLY_UPCOMING
    if (query.filter === 'ONLY_OVERDUE') {
      where.installments = {
        some: {
          status: { in: [EmiInstallmentStatus.PENDING, EmiInstallmentStatus.OVERDUE] },
          dueDate: { lt: new Date() },
        },
      };
    } else if (query.filter === 'ONLY_UPCOMING') {
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);
      where.installments = {
        some: {
          status: EmiInstallmentStatus.PENDING,
          dueDate: { gte: new Date(), lte: next7Days },
        },
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.emiPlan.findMany({
        where,
        include: {
          installments: {
            orderBy: { installmentNumber: 'asc' },
            select: {
              id: true,
              installmentNumber: true,
              amount: true,
              dueDate: true,
              paidDate: true,
              paidAmount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emiPlan.count({ where }),
    ]);

    // Enrich each plan with computed fields
    const enriched = items.map((plan) => {
      const today = new Date();
      const overdueInstallments = plan.installments.filter(
        (i) =>
          i.status !== EmiInstallmentStatus.PAID &&
          i.status !== EmiInstallmentStatus.WAIVED &&
          new Date(i.dueDate) < today,
      );
      const nextDue = plan.installments
        .filter((i) => i.status === EmiInstallmentStatus.PENDING)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

      return {
        ...plan,
        overdueCount: overdueInstallments.length,
        overdueAmount: overdueInstallments.reduce(
          (s, i) => s + (Number(i.amount) - Number(i.paidAmount)),
          0,
        ),
        nextDueDate: nextDue?.dueDate ?? null,
        nextDueAmount: nextDue ? Number(nextDue.amount) - Number(nextDue.paidAmount) : 0,
        paidInstallmentCount: plan.installments.filter(
          (i) => i.status === EmiInstallmentStatus.PAID,
        ).length,
      };
    });

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.emiPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!plan) throw new NotFoundException('EMI plan not found');

    // Load customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: plan.customerId, tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        cnic: true,
        address: true,
        balance: true,
      },
    });

    const today = new Date();
    const overdueInstallments = plan.installments.filter(
      (i) =>
        i.status !== EmiInstallmentStatus.PAID &&
        i.status !== EmiInstallmentStatus.WAIVED &&
        new Date(i.dueDate) < today,
    );
    const nextDue = plan.installments
      .filter((i) => i.status === EmiInstallmentStatus.PENDING)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return {
      ...plan,
      customer,
      overdueCount: overdueInstallments.length,
      overdueAmount: overdueInstallments.reduce(
        (s, i) => s + (Number(i.amount) - Number(i.paidAmount)),
        0,
      ),
      nextDueDate: nextDue?.dueDate ?? null,
      nextDueAmount: nextDue ? Number(nextDue.amount) - Number(nextDue.paidAmount) : 0,
      paidInstallmentCount: plan.installments.filter(
        (i) => i.status === EmiInstallmentStatus.PAID,
      ).length,
    };
  }

  async stats(user: AuthenticatedUser) {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const [
      byStatus,
      totalFinanced,
      overdueAgg,
      upcomingAgg,
      collectedThisMonth,
    ] = await Promise.all([
      this.prisma.emiPlan.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId, status: EmiPlanStatus.ACTIVE },
        _sum: { financedAmount: true, paidAmount: true, remainingAmount: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: {
          plan: { tenantId: user.tenantId, status: EmiPlanStatus.ACTIVE },
          status: { in: [EmiInstallmentStatus.PENDING, EmiInstallmentStatus.OVERDUE] },
          dueDate: { lt: today },
        },
        _sum: { amount: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: {
          plan: { tenantId: user.tenantId, status: EmiPlanStatus.ACTIVE },
          status: EmiInstallmentStatus.PENDING,
          dueDate: { gte: today, lte: next7Days },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: {
          plan: { tenantId: user.tenantId },
          status: EmiInstallmentStatus.PAID,
          paidDate: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
        _sum: { paidAmount: true },
        _count: { _all: true },
      }),
    ]);

    const overdueAmount =
      (overdueAgg._sum.amount ?? 0) - (overdueAgg._sum.paidAmount ?? 0);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      activeFinanced: totalFinanced._sum.financedAmount ?? 0,
      activePaid: totalFinanced._sum.paidAmount ?? 0,
      activeRemaining: totalFinanced._sum.remainingAmount ?? 0,
      overdueCount: overdueAgg._count._all,
      overdueAmount,
      upcomingCount: upcomingAgg._count._all,
      upcomingAmount: upcomingAgg._sum.amount ?? 0,
      collectedThisMonth: collectedThisMonth._sum.paidAmount ?? 0,
      collectedCountThisMonth: collectedThisMonth._count._all,
    };
  }

  // ════════════════════════════════════════════════════════
  // UPDATE PLAN
  // ════════════════════════════════════════════════════════

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmiPlanDto) {
    const plan = await this.findOne(user, id);
    if (plan.status !== EmiPlanStatus.ACTIVE) {
      throw new BadRequestException(`Cannot edit ${plan.status} plan`);
    }

    // Disallow restructure if any installment has been paid
    const paidCount = plan.installments.filter((i) => Number(i.paidAmount) > 0).length;
    if (paidCount > 0 && (dto.totalAmount || dto.downPayment || dto.installmentCount)) {
      throw new BadRequestException(
        'Cannot restructure plan after payments. Use status transitions or installment edits.',
      );
    }

    return this.prisma.emiPlan.update({
      where: { id },
      data: {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        notes: dto.notes,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // RECORD INSTALLMENT PAYMENT
  // ════════════════════════════════════════════════════════

  async recordInstallmentPayment(
    user: AuthenticatedUser,
    planId: string,
    installmentId: string,
    dto: RecordInstallmentPaymentDto,
  ) {
    const plan = await this.prisma.emiPlan.findFirst({
      where: { id: planId, tenantId: user.tenantId },
      include: { installments: true },
    });
    if (!plan) throw new NotFoundException('EMI plan not found');
    if (plan.status !== EmiPlanStatus.ACTIVE) {
      throw new BadRequestException(`Cannot record payment for ${plan.status} plan`);
    }

    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException('Installment not found');

    if (installment.status === EmiInstallmentStatus.PAID) {
      throw new BadRequestException('Installment already fully paid');
    }
    if (installment.status === EmiInstallmentStatus.WAIVED) {
      throw new BadRequestException('Installment is waived');
    }

    const remainingDue = Number(installment.amount) - Number(installment.paidAmount);
    if (dto.amount > remainingDue + 0.01) {
      throw new BadRequestException(
        `Amount exceeds installment balance (Rs ${remainingDue.toFixed(2)})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newPaidAmount = Number(installment.paidAmount) + dto.amount;
      const isFullyPaid = Math.abs(newPaidAmount - Number(installment.amount)) < 0.01;

      // Update installment
      const updatedInstallment = await tx.emiInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: isFullyPaid
            ? (dto.paidDate ? new Date(dto.paidDate) : new Date())
            : installment.paidDate,
          status: isFullyPaid ? EmiInstallmentStatus.PAID : EmiInstallmentStatus.PENDING,
          notes: dto.notes ?? installment.notes,
        },
      });

      // Update plan aggregates
      const newPlanPaid = Number(plan.paidAmount) + dto.amount;
      const newPlanRemaining = Number(plan.financedAmount) - (newPlanPaid - Number(plan.downPayment));

      // Re-fetch all installments to determine plan status
      const allInstallments = await tx.emiInstallment.findMany({
        where: { planId },
      });
      const totalPaidByInstallments = allInstallments.reduce(
        (s, i) => s + Number(i.paidAmount),
        0,
      );
      const allInstallmentsPaid = allInstallments.every(
        (i) =>
          i.status === EmiInstallmentStatus.PAID ||
          i.status === EmiInstallmentStatus.WAIVED,
      );

      const planUpdate: any = {
        paidAmount: newPlanPaid,
        remainingAmount: Math.max(newPlanRemaining, 0),
      };
      if (allInstallmentsPaid) {
        planUpdate.status = EmiPlanStatus.COMPLETED;
      }

      const updatedPlan = await tx.emiPlan.update({
        where: { id: planId },
        data: planUpdate,
      });

      // Record customer ledger entry (payment received)
      await tx.customerLedger.create({
        data: {
          tenantId: user.tenantId,
          customerId: plan.customerId,
          createdById: user.id,
          type: 'PAYMENT_RECEIVED',
          amount: dto.amount,
          balanceAfter: 0, // ledger row, balance computed separately if needed
          reference: plan.planNumber,
          note: `EMI installment ${installment.installmentNumber}/${plan.installmentCount}`,
        },
      });

      return {
        installment: updatedInstallment,
        plan: updatedPlan,
      };
    });
  }

  // ════════════════════════════════════════════════════════
  // WAIVE INSTALLMENT (e.g., promotional / write-off)
  // ════════════════════════════════════════════════════════

  async waiveInstallment(
    user: AuthenticatedUser,
    planId: string,
    installmentId: string,
    reason?: string,
  ) {
    const plan = await this.prisma.emiPlan.findFirst({
      where: { id: planId, tenantId: user.tenantId },
      include: { installments: true },
    });
    if (!plan) throw new NotFoundException('EMI plan not found');

    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException('Installment not found');
    if (installment.status === EmiInstallmentStatus.PAID) {
      throw new BadRequestException('Cannot waive paid installment');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.emiInstallment.update({
        where: { id: installmentId },
        data: {
          status: EmiInstallmentStatus.WAIVED,
          notes: reason ?? 'Waived',
        },
      });

      // Recalc plan remaining (waived counts as cleared)
      const remainingDue = Number(installment.amount) - Number(installment.paidAmount);
      const newRemaining = Math.max(Number(plan.remainingAmount) - remainingDue, 0);

      // Check if all are paid/waived
      const allInstallments = await tx.emiInstallment.findMany({ where: { planId } });
      const allDone = allInstallments.every(
        (i) =>
          i.status === EmiInstallmentStatus.PAID ||
          i.status === EmiInstallmentStatus.WAIVED,
      );

      await tx.emiPlan.update({
        where: { id: planId },
        data: {
          remainingAmount: newRemaining,
          status: allDone ? EmiPlanStatus.COMPLETED : plan.status,
        },
      });

      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // MARK DEFAULTED
  // ════════════════════════════════════════════════════════

  async markDefaulted(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.findOne(user, id);
    if (plan.status !== EmiPlanStatus.ACTIVE) {
      throw new BadRequestException(`Cannot default ${plan.status} plan`);
    }

    return this.prisma.emiPlan.update({
      where: { id },
      data: {
        status: EmiPlanStatus.DEFAULTED,
        notes: reason ? `${plan.notes ?? ''}\n[DEFAULTED] ${reason}`.trim() : plan.notes,
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // CANCEL PLAN
  // ════════════════════════════════════════════════════════

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.findOne(user, id);
    if (plan.status === EmiPlanStatus.COMPLETED) {
      throw new BadRequestException('Completed plan cannot be cancelled');
    }

    return this.prisma.emiPlan.update({
      where: { id },
      data: {
        status: EmiPlanStatus.CANCELLED,
        notes: reason ? `${plan.notes ?? ''}\n[CANCELLED] ${reason}`.trim() : plan.notes,
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // UPDATE OVERDUE FLAGS (Cron job calls this)
  // ════════════════════════════════════════════════════════

  /**
   * Marks PENDING installments as OVERDUE if dueDate < today.
   * Returns count of installments updated.
   */
  async updateOverdueFlags(user: AuthenticatedUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.emiInstallment.updateMany({
      where: {
        plan: { tenantId: user.tenantId, status: EmiPlanStatus.ACTIVE },
        status: EmiInstallmentStatus.PENDING,
        dueDate: { lt: today },
      },
      data: { status: EmiInstallmentStatus.OVERDUE },
    });

    return { updatedCount: result.count };
  }

  // ════════════════════════════════════════════════════════
  // DELETE (only if no payments)
  // ════════════════════════════════════════════════════════

  async remove(user: AuthenticatedUser, id: string) {
    const plan = await this.findOne(user, id);
    if (Number(plan.paidAmount) > Number(plan.downPayment)) {
      throw new BadRequestException(
        'Cannot delete — installment payments recorded. Use Cancel instead.',
      );
    }
    await this.prisma.emiPlan.delete({ where: { id } });
    return { message: 'EMI plan deleted', planNumber: plan.planNumber };
  }
}
