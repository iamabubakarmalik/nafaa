import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AmcService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.numberOfVisits || dto.numberOfVisits < 1) throw new BadRequestException('Visit count required');

    const count = await this.prisma.serviceAmc.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const amcNumber = 'AMC-' + year + '-' + String(count + 1).padStart(4, '0');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const amc = await this.prisma.serviceAmc.create({
      data: {
        tenantId: user.tenantId,
        amcNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        type: dto.type ?? 'STANDARD',
        coveredItems: dto.coveredItems ?? [],
        coveredServiceTypes: dto.coveredServiceTypes ?? [],
        numberOfVisits: Number(dto.numberOfVisits),
        visitsRemaining: Number(dto.numberOfVisits),
        includesParts: dto.includesParts ?? false,
        includesLabour: dto.includesLabour ?? true,
        partsCapAmount: dto.partsCapAmount,
        emergencyIncluded: dto.emergencyIncluded ?? false,
        emergencyDiscountPct: Number(dto.emergencyDiscountPct) || 0,
        contractValue: Number(dto.contractValue),
        amountPaid: Number(dto.amountPaid) || 0,
        paymentMode: dto.paymentMode,
        paymentInstallments: Number(dto.paymentInstallments) || 1,
        startDate,
        endDate,
        autoRenew: dto.autoRenew ?? false,
        reminderDaysBefore: Number(dto.reminderDaysBefore) || 30,
        serviceAddress: dto.serviceAddress,
        city: dto.city,
        numberOfSites: Number(dto.numberOfSites) || 1,
        contractDocUrl: dto.contractDocUrl,
        termsConditions: dto.termsConditions,
        specialConditions: dto.specialConditions,
        createdById: user.id,
        notes: dto.notes,
      },
    });

    // Auto-schedule visits
    if (dto.autoScheduleVisits) {
      const daysBetween = Math.floor((endDate.getTime() - startDate.getTime()) / (dto.numberOfVisits * 24 * 60 * 60 * 1000));
      for (let i = 1; i <= dto.numberOfVisits; i++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + i * daysBetween);
        await this.prisma.serviceAmcVisit.create({
          data: {
            amcId: amc.id,
            visitNumber: i,
            scheduledDate,
            status: 'SCHEDULED',
          },
        });
      }
    }

    return this.prisma.serviceAmc.findUnique({
      where: { id: amc.id },
      include: { visits: { orderBy: { visitNumber: 'asc' } } },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; type?: string; search?: string }) {
    return this.prisma.serviceAmc.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.type && { type: params.type as any }),
        ...(params.search && {
          OR: [
            { amcNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { visits: { orderBy: { visitNumber: 'asc' } } },
      orderBy: { endDate: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.serviceAmc.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { visits: { orderBy: { visitNumber: 'asc' } } },
    });
    if (!a) throw new NotFoundException('AMC not found');
    return a;
  }

  async completeVisit(user: AuthenticatedUser, amcId: string, visitId: string, dto: any) {
    const amc = await this.prisma.serviceAmc.findFirst({ where: { id: amcId, tenantId: user.tenantId } });
    if (!amc) throw new NotFoundException('AMC not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.serviceAmcVisit.update({
        where: { id: visitId },
        data: {
          completedAt: new Date(),
          status: 'COMPLETED',
          technicianId: dto.technicianId,
          serviceJobId: dto.serviceJobId,
          visitType: dto.visitType,
          checklistCompleted: dto.checklistCompleted,
          workDone: dto.workDone,
          partsReplaced: dto.partsReplaced,
          recommendations: dto.recommendations,
          customerRating: dto.customerRating,
        },
      });

      return tx.serviceAmc.update({
        where: { id: amcId },
        data: {
          visitsUsed: amc.visitsUsed + 1,
          visitsRemaining: Math.max(amc.visitsRemaining - 1, 0),
        },
        include: { visits: true },
      });
    });
  }

  async scheduleVisit(user: AuthenticatedUser, amcId: string, dto: { scheduledDate: string; visitType?: string; technicianId?: string }) {
    const amc = await this.prisma.serviceAmc.findFirst({ where: { id: amcId, tenantId: user.tenantId }, include: { visits: true } });
    if (!amc) throw new NotFoundException('AMC not found');

    const visitNumber = amc.visits.length + 1;
    return this.prisma.serviceAmcVisit.create({
      data: {
        amcId,
        visitNumber,
        scheduledDate: new Date(dto.scheduledDate),
        visitType: dto.visitType ?? 'MAINTENANCE',
        technicianId: dto.technicianId,
      },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string, refundAmount?: number) {
    return this.prisma.serviceAmc.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundAmount,
      },
    });
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.serviceAmc.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        endDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }

  async renewalDue(user: AuthenticatedUser, daysAhead: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.prisma.serviceAmc.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: cutoff },
      },
      orderBy: { endDate: 'asc' },
    });
  }
}
