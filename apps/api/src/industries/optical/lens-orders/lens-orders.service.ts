import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateLensOrderDto, LensOrderPaymentDto, UpdateLensOrderStatusDto } from './dto/create-lens-order.dto';

const VALID_STATUSES = ['ORDERED', 'SENT_TO_LAB', 'AT_LAB', 'RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED', 'CANCELLED'];

@Injectable()
export class LensOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateLensOrderDto) {
    const count = await this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = `LO-${year}-${String(count + 1).padStart(5, '0')}`;

    // Pull prescription values if linked
    let rx: any = null;
    if (dto.prescriptionId) {
      rx = await this.prisma.opticalPrescription.findFirst({
        where: { id: dto.prescriptionId, tenantId: user.tenantId },
      });
      if (!rx) throw new NotFoundException('Prescription not found');
      if (rx.expiryDate && new Date(rx.expiryDate) < new Date()) {
        throw new BadRequestException('Prescription has expired — renew it before ordering lenses');
      }
    }

    const framePrice = dto.framePrice ?? 0;
    const lensPrice = dto.lensPrice ?? 0;
    const fittingCharge = dto.fittingCharge ?? 0;
    const totalPrice = framePrice + lensPrice + fittingCharge;
    const paidAmount = dto.paidAmount ?? 0;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.opticalLensOrder.create({
        data: {
          tenantId: user.tenantId,
          orderNumber,
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          prescriptionId: dto.prescriptionId,
          frameProductId: dto.frameProductId,
          frameName: dto.frameName,
          lensType: dto.lensType,
          lensMaterial: dto.lensMaterial,
          lensIndex: dto.lensIndex,
          lensCoatings: dto.lensCoatings ?? [],
          rightSph: dto.rightSph ?? rx?.rightSph,
          rightCyl: dto.rightCyl ?? rx?.rightCyl,
          rightAxis: dto.rightAxis ?? rx?.rightAxis,
          rightAdd: dto.rightAdd ?? rx?.rightAdd,
          leftSph: dto.leftSph ?? rx?.leftSph,
          leftCyl: dto.leftCyl ?? rx?.leftCyl,
          leftAxis: dto.leftAxis ?? rx?.leftAxis,
          leftAdd: dto.leftAdd ?? rx?.leftAdd,
          pupilDistance: dto.pupilDistance ?? rx?.pupilDistance,
          labName: dto.labName,
          labOrderRef: dto.labOrderRef,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : addDays(new Date(), 7),
          framePrice, lensPrice, fittingCharge, totalPrice,
          paidAmount,
          remainingAmount: Math.max(totalPrice - paidAmount, 0),
          status: 'ORDERED',
          notes: dto.notes,
        },
      });

      if (dto.prescriptionId) {
        await tx.opticalPrescription.update({
          where: { id: dto.prescriptionId },
          data: { timesUsed: { increment: 1 } },
        });
      }

      return created;
    });

    return order;
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; labName?: string;
    pendingPayment?: boolean; overdue?: boolean;
    from?: string; to?: string; search?: string;
  }) {
    return this.prisma.opticalLensOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.labName && { labName: { contains: params.labName, mode: 'insensitive' } }),
        ...(params.pendingPayment && { remainingAmount: { gt: 0 } }),
        ...(params.overdue && {
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
          expectedDate: { lt: new Date() },
        }),
        ...(params.from || params.to ? {
          orderedAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { frameName: { contains: params.search, mode: 'insensitive' } },
            { labOrderRef: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { orderedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');

    let prescription = null;
    if (o.prescriptionId) {
      prescription = await this.prisma.opticalPrescription.findUnique({ where: { id: o.prescriptionId } });
    }

    const daysWaiting = Math.floor((Date.now() - new Date(o.orderedAt).getTime()) / 86400000);
    const isOverdue = o.expectedDate ? new Date(o.expectedDate) < new Date() && !['DELIVERED', 'CANCELLED'].includes(o.status) : false;

    return { ...o, prescription, computed: { daysWaiting, isOverdue } };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateLensOrderStatusDto) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (!VALID_STATUSES.includes(dto.status)) {
      throw new BadRequestException(`Invalid status. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    const now = new Date();
    const patch: any = { status: dto.status };

    if (dto.status === 'RECEIVED' || dto.status === 'QC_PASSED') patch.receivedAt = o.receivedAt ?? now;
    if (dto.status === 'FITTED') patch.fittedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.labOrderRef) patch.labOrderRef = dto.labOrderRef;
    if (dto.qcNotes) patch.qcNotes = dto.qcNotes;
    if (dto.fittingNotes) patch.fittingNotes = dto.fittingNotes;
    if (dto.notes) patch.notes = ((o.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.opticalLensOrder.update({ where: { id }, data: patch });
  }

  async sendToLab(user: AuthenticatedUser, id: string, body: { labName: string; labOrderRef?: string; expectedDate?: string }) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        labName: body.labName,
        labOrderRef: body.labOrderRef ?? o.labOrderRef,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : o.expectedDate,
        status: 'SENT_TO_LAB',
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: LensOrderPaymentDto) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');

    const newPaid = o.paidAmount + dto.amount;
    if (newPaid > o.totalPrice) throw new BadRequestException('Payment exceeds total price');

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        remainingAmount: Math.max(o.totalPrice - newPaid, 0),
      },
    });
  }

  async deliver(user: AuthenticatedUser, id: string, body?: { fittingNotes?: string }) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (o.remainingAmount > 0) {
      throw new BadRequestException(`Outstanding balance of ${o.remainingAmount} must be cleared before delivery`);
    }

    return this.prisma.opticalLensOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        fittedAt: o.fittedAt ?? new Date(),
        fittingNotes: body?.fittingNotes ?? o.fittingNotes,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalLensOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Lens order not found');
    if (['FITTED', 'DELIVERED'].includes(o.status)) {
      throw new BadRequestException('Cannot delete a fitted/delivered order');
    }
    return this.prisma.opticalLensOrder.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [ordered, atLab, received, ready, delivered, overdue, financial] = await Promise.all([
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: 'ORDERED' } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['SENT_TO_LAB', 'AT_LAB'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['RECEIVED', 'QC_PASSED'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['FITTED', 'READY'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.opticalLensOrder.count({
        where: { tenantId: user.tenantId, status: { notIn: ['DELIVERED', 'CANCELLED'] }, expectedDate: { lt: new Date() } },
      }),
      this.prisma.opticalLensOrder.aggregate({
        where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } },
        _sum: { totalPrice: true, paidAmount: true, remainingAmount: true },
      }),
    ]);

    const monthly = await this.prisma.opticalLensOrder.aggregate({
      where: { tenantId: user.tenantId, orderedAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    });

    return {
      ordered, atLab, received, ready, delivered, overdue,
      totalBilled: financial._sum.totalPrice ?? 0,
      totalCollected: financial._sum.paidAmount ?? 0,
      totalReceivable: financial._sum.remainingAmount ?? 0,
      monthlyOrders: monthly._count._all,
      monthlyValue: monthly._sum.totalPrice ?? 0,
    };
  }

  async labPerformance(user: AuthenticatedUser) {
    const rows = await this.prisma.opticalLensOrder.groupBy({
      by: ['labName'],
      where: { tenantId: user.tenantId, labName: { not: null } },
      _count: { _all: true },
      _sum: { lensPrice: true },
    });

    const withDelays = await Promise.all(
      rows.map(async (r) => {
        const delivered = await this.prisma.opticalLensOrder.findMany({
          where: { tenantId: user.tenantId, labName: r.labName, receivedAt: { not: null } },
          select: { orderedAt: true, receivedAt: true, expectedDate: true },
          take: 100,
        });
        const turnarounds = delivered
          .filter((d) => d.receivedAt)
          .map((d) => (new Date(d.receivedAt!).getTime() - new Date(d.orderedAt).getTime()) / 86400000);
        const avgDays = turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : 0;
        const lateCount = delivered.filter((d) => d.expectedDate && d.receivedAt && new Date(d.receivedAt) > new Date(d.expectedDate)).length;

        return {
          labName: r.labName,
          totalOrders: r._count._all,
          lensRevenue: r._sum.lensPrice ?? 0,
          avgTurnaroundDays: Number(avgDays.toFixed(1)),
          lateDeliveries: lateCount,
          onTimePct: delivered.length ? Number((((delivered.length - lateCount) / delivered.length) * 100).toFixed(1)) : 100,
        };
      }),
    );

    return withDelays.sort((a, b) => b.totalOrders - a.totalOrders);
  }
}
