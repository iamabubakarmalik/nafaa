import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CreateWorkshopJobDto, SetWarrantyDto, UpdateJobStatusDto } from './dto/create-workshop-job.dto';

@Injectable()
export class WorkshopJobsService {
  constructor(private readonly prisma: PrismaService) {}

  private computeTotals(labor: any[], parts: any[], external: any[], discount: number, tax: number) {
    const laborTotal = labor.reduce((s, l) => s + (l.hours || 1) * (l.ratePerHour || 0), 0);
    const partsTotal = parts.reduce((s, p) => s + ((p.unitPrice || 0) * (p.quantity || 1) - (p.discount || 0)), 0);
    const externalTotal = external.reduce((s, e) => s + (e.cost || 0) + (e.markup || 0), 0);
    const subtotal = laborTotal + partsTotal + externalTotal;
    const total = Math.max(subtotal + tax - discount, 0);
    return { laborTotal, partsTotal, externalTotal, subtotal, total };
  }

  async create(user: AuthenticatedUser, dto: CreateWorkshopJobDto) {
    const count = await this.prisma.workshopJob.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const jobNumber = `JOB-${year}-${String(count + 1).padStart(4, '0')}`;

    const labor = (dto.laborItems || []).map((l, i) => ({
      description: l.description,
      jobType: l.jobType,
      mechanicId: l.mechanicId,
      mechanicName: l.mechanicName,
      hours: l.hours ?? 1,
      ratePerHour: l.ratePerHour ?? 0,
      total: (l.hours ?? 1) * (l.ratePerHour ?? 0),
      notes: l.notes,
      displayOrder: i,
    }));

    const parts = (dto.partsUsed || []).map((p, i) => ({
      productId: p.productId,
      variantId: p.variantId,
      partName: p.partName,
      partNumber: p.partNumber,
      quantity: p.quantity ?? 1,
      unitPrice: p.unitPrice ?? 0,
      discount: p.discount ?? 0,
      total: (p.unitPrice ?? 0) * (p.quantity ?? 1) - (p.discount ?? 0),
      condition: p.condition ?? 'NEW',
      isCustomerSupplied: p.isCustomerSupplied ?? false,
      warrantyMonths: p.warrantyMonths ?? 0,
      warrantyKm: p.warrantyKm,
      notes: p.notes,
      displayOrder: i,
    }));

    const external = (dto.externalWork || []).map((e) => ({
      description: e.description,
      vendorName: e.vendorName,
      vendorPhone: e.vendorPhone,
      cost: e.cost ?? 0,
      markup: e.markup ?? 0,
      total: (e.cost ?? 0) + (e.markup ?? 0),
      notes: e.notes,
    }));

    const { laborTotal, partsTotal, externalTotal, subtotal, total } = this.computeTotals(
      labor, parts, external, dto.discount ?? 0, dto.taxAmount ?? 0
    );

    // If vehicleId is provided, auto-populate vehicle info
    let vehicleData: any = {};
    if (dto.vehicleId) {
      const v = await this.prisma.customerVehicle.findFirst({ where: { id: dto.vehicleId, tenantId: user.tenantId } });
      if (v) {
        vehicleData = {
          registrationNumber: v.registrationNumber,
          makeName: v.makeName,
          modelName: v.modelName,
          year: v.year,
          customerId: v.customerId || dto.customerId,
          customerName: dto.customerName || v.ownerName,
          customerPhone: dto.customerPhone || v.ownerPhone,
        };
      }
    }

    return this.prisma.workshopJob.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        jobNumber,
        status: 'DRAFT',
        priority: dto.priority ?? 'NORMAL',
        jobType: dto.jobType ?? 'GENERAL_SERVICE',
        vehicleId: dto.vehicleId,
        ...vehicleData,
        odometerKm: dto.odometerKm,
        customerComplaint: dto.customerComplaint,
        diagnosis: dto.diagnosis,
        workDescription: dto.workDescription,
        recommendations: dto.recommendations,
        primaryMechanicId: dto.primaryMechanicId,
        assistantMechanicIds: dto.assistantMechanicIds ?? [],
        bayNumber: dto.bayNumber,
        promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : null,
        fuelLevel: dto.fuelLevel,
        hasSpareTire: dto.hasSpareTire ?? false,
        hasToolkit: dto.hasToolkit ?? false,
        externalDamages: dto.externalDamages,
        inspectionImageUrls: dto.inspectionImageUrls ?? [],
        laborTotal,
        partsTotal,
        externalTotal,
        subtotal,
        discount: dto.discount ?? 0,
        taxAmount: dto.taxAmount ?? 0,
        total,
        isInsuranceClaim: dto.isInsuranceClaim ?? false,
        insuranceProvider: dto.insuranceProvider,
        insuranceClaimNumber: dto.insuranceClaimNumber,
        internalNotes: dto.internalNotes,
        imageUrls: dto.imageUrls ?? [],
        createdById: user.id,
        laborItems: { create: labor },
        partsUsed: { create: parts },
        externalWork: { create: external },
        statusLogs: { create: [{ toStatus: 'DRAFT', changedById: user.id, notes: 'Job created' }] },
      },
      include: { laborItems: true, partsUsed: true, externalWork: true, payments: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; jobType?: string; customerId?: string; vehicleId?: string; mechanicId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.workshopJob.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.priority && { priority: params.priority as any }),
        ...(params.jobType && { jobType: params.jobType as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.vehicleId && { vehicleId: params.vehicleId }),
        ...(params.mechanicId && {
          OR: [
            { primaryMechanicId: params.mechanicId },
            { assistantMechanicIds: { has: params.mechanicId } },
          ],
        }),
        ...(params.from || params.to ? {
          receivedAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { jobNumber: { contains: params.search, mode: 'insensitive' } },
            { registrationNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: { laborItems: { take: 3 }, partsUsed: { take: 3 }, payments: true },
      orderBy: [{ priority: 'desc' }, { promisedAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.workshopJob.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        laborItems: { orderBy: { displayOrder: 'asc' } },
        partsUsed: { orderBy: { displayOrder: 'asc' } },
        externalWork: true,
        payments: { orderBy: { paidAt: 'desc' } },
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    let customer = null;
    let vehicle = null;
    if (job.customerId) customer = await this.prisma.customer.findUnique({ where: { id: job.customerId } });
    if (job.vehicleId) vehicle = await this.prisma.customerVehicle.findUnique({ where: { id: job.vehicleId } });

    return { ...job, customer, vehicle };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.workshopJobStatusLog.create({
        data: {
          jobId: id,
          fromStatus: job.status,
          toStatus: dto.status,
          notes: dto.notes,
          changedById: user.id,
        },
      });

      const patch: any = { status: dto.status };
      const now = new Date();
      if (dto.status === 'IN_PROGRESS' && !job.startedAt) patch.startedAt = now;
      if (dto.status === 'COMPLETED') patch.completedAt = now;
      if (dto.status === 'DELIVERED') {
        patch.deliveredAt = now;
        // Update vehicle stats
        if (job.vehicleId) {
          await tx.customerVehicle.update({
            where: { id: job.vehicleId },
            data: {
              totalServices: { increment: 1 },
              totalSpent: { increment: job.total },
              lastServiceAt: now,
              lastOdometerKm: job.odometerKm ?? undefined,
            },
          });
        }
      }
      if (dto.status === 'CANCELLED') {
        patch.cancelledAt = now;
        patch.cancellationReason = dto.cancellationReason;
      }

      return tx.workshopJob.update({
        where: { id },
        data: patch,
        include: { laborItems: true, partsUsed: true, externalWork: true, payments: true },
      });
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.workshopJobPayment.create({
        data: {
          jobId: id,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: dto.notes,
          receivedById: user.id,
        },
      });

      const newPaid = job.paidAmount + dto.amount;
      let paymentStatus = 'PARTIALLY_PAID';
      if (newPaid >= job.total) paymentStatus = 'PAID';
      if (newPaid <= 0) paymentStatus = 'UNPAID';

      return tx.workshopJob.update({
        where: { id },
        data: { paidAmount: newPaid, paymentStatus },
        include: { payments: true },
      });
    });
  }

  async setWarranty(user: AuthenticatedUser, id: string, dto: SetWarrantyDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');

    const expiry = dto.warrantyMonths ? addMonths(new Date(), dto.warrantyMonths) : null;

    return this.prisma.workshopJob.update({
      where: { id },
      data: {
        warrantyStatus: dto.warrantyStatus,
        warrantyMonths: dto.warrantyMonths ?? 0,
        warrantyKm: dto.warrantyKm,
        warrantyExpiry: expiry,
        warrantyNotes: dto.warrantyNotes,
      },
    });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');
    return this.prisma.workshopJob.update({
      where: { id },
      data: { customerRating: rating, customerFeedback: feedback },
    });
  }

  async recalculate(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.workshopJob.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { laborItems: true, partsUsed: true, externalWork: true },
    });
    if (!job) throw new NotFoundException('Job not found');

    const { laborTotal, partsTotal, externalTotal, subtotal, total } = this.computeTotals(
      job.laborItems, job.partsUsed, job.externalWork, job.discount, job.taxAmount
    );

    return this.prisma.workshopJob.update({
      where: { id },
      data: { laborTotal, partsTotal, externalTotal, subtotal, total },
    });
  }
}
