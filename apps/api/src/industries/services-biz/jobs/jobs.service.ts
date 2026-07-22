import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.serviceJob.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const jobNumber = 'JOB-' + year + '-' + String(count + 1).padStart(5, '0');

    // Enrich from service catalog
    let serviceName = dto.serviceName;
    let businessType = dto.businessType;
    let category = dto.category ?? 'REPAIR';
    let visitCharge = Number(dto.visitCharge) || 0;
    let labourCharge = Number(dto.labourCharge) || 0;

    if (dto.serviceId) {
      const svc = await this.prisma.serviceCatalog.findFirst({ where: { id: dto.serviceId, tenantId: user.tenantId } });
      if (svc) {
        serviceName = serviceName || svc.name;
        businessType = businessType || svc.businessType;
        category = category || svc.category;
        if (!dto.visitCharge) visitCharge = svc.visitCharge;
        if (!dto.labourCharge) labourCharge = svc.baseCharge;
      }
    }

    // Enrich parts
    const parts = (dto.parts ?? []).map((p: any, i: number) => {
      const qty = Number(p.quantity) || 1;
      const unitPrice = Number(p.unitPrice) || 0;
      return {
        productId: p.productId,
        partName: p.partName,
        partNumber: p.partNumber,
        brand: p.brand,
        quantity: qty,
        unitPrice,
        costPrice: Number(p.costPrice) || 0,
        total: qty * unitPrice,
        isCustomerSupplied: p.isCustomerSupplied ?? false,
        isUnderWarranty: p.isUnderWarranty ?? false,
        warrantyDays: Number(p.warrantyDays) || 0,
        serialNumber: p.serialNumber,
        notes: p.notes,
        displayOrder: i,
      };
    });

    const partsCharge = parts.reduce((s: number, p: any) => s + (p.isUnderWarranty ? 0 : p.total), 0);
    const transportCharge = Number(dto.transportCharge) || 0;
    const emergencyCharge = Number(dto.emergencyCharge) || 0;
    const discount = Number(dto.discountAmount) || 0;
    const tax = Number(dto.taxAmount) || 0;
    const totalCharge = Math.max(visitCharge + labourCharge + partsCharge + transportCharge + emergencyCharge + tax - discount, 0);

    // Advance calculation
    let advanceAmount = 0;
    if (dto.advanceRequired && dto.advancePct) {
      advanceAmount = (totalCharge * Number(dto.advancePct)) / 100;
    } else if (dto.advanceAmount) {
      advanceAmount = Number(dto.advanceAmount);
    }

    const job = await this.prisma.serviceJob.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        jobNumber,
        ticketNumber: dto.ticketNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAltPhone: dto.customerAltPhone,
        customerEmail: dto.customerEmail,
        customerType: dto.customerType ?? 'INDIVIDUAL',
        serviceId: dto.serviceId,
        serviceName,
        category,
        businessType,
        priority: dto.priority ?? 'NORMAL',
        status: dto.status ?? 'CONFIRMED',
        problemDescription: dto.problemDescription,
        customerReportedIssue: dto.customerReportedIssue,
        urgencyReason: dto.urgencyReason,
        brand: dto.brand,
        modelNumber: dto.modelNumber,
        serialNumber: dto.serialNumber,
        yearPurchased: dto.yearPurchased ? Number(dto.yearPurchased) : null,
        purchasedFrom: dto.purchasedFrom,
        underWarranty: dto.underWarranty ?? false,
        warrantyType: dto.warrantyType,
        warrantyExpiryDate: dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null,
        amcId: dto.amcId,
        locationType: dto.locationType ?? 'CUSTOMER_HOME',
        serviceAddress: dto.serviceAddress,
        city: dto.city,
        area: dto.area,
        landmark: dto.landmark,
        latitude: dto.latitude,
        longitude: dto.longitude,
        entryInstructions: dto.entryInstructions,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : null,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : null,
        preferredTimeSlot: dto.preferredTimeSlot,
        primaryTechnicianId: dto.primaryTechnicianId,
        assistantTechnicianIds: dto.assistantTechnicianIds ?? [],
        supervisorId: dto.supervisorId,
        visitCharge,
        labourCharge,
        partsCharge,
        transportCharge,
        emergencyCharge,
        discountAmount: discount,
        taxAmount: tax,
        totalCharge,
        advanceRequired: dto.advanceRequired ?? false,
        advanceAmount,
        jobWarrantyDays: Number(dto.jobWarrantyDays) || 0,
        jobWarrantyTerms: dto.jobWarrantyTerms,
        beforePhotoUrls: dto.beforePhotoUrls ?? [],
        technicianNotes: dto.technicianNotes,
        internalNotes: dto.internalNotes,
        createdById: user.id,
        parts: { create: parts },
        statusHistory: {
          create: [{
            toStatus: dto.status ?? 'CONFIRMED',
            changedBy: user.id,
            reason: 'Job created',
          }],
        },
      },
      include: { parts: true, statusHistory: true },
    });

    return job;
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; customerId?: string; technicianId?: string; businessType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.serviceJob.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.priority && { priority: params.priority as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.technicianId && { primaryTechnicianId: params.technicianId }),
        ...(params.businessType && { businessType: params.businessType as any }),
        ...(params.from || params.to ? {
          scheduledStart: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { jobNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { serviceName: { contains: params.search, mode: 'insensitive' } },
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { parts: true },
      orderBy: [{ priority: 'desc' }, { scheduledStart: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const j = await this.prisma.serviceJob.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { parts: true, timeLog: { orderBy: { timestamp: 'desc' } }, statusHistory: { orderBy: { changedAt: 'desc' } } },
    });
    if (!j) throw new NotFoundException('Job not found');

    let customer = null;
    let technician = null;
    if (j.customerId) customer = await this.prisma.customer.findUnique({ where: { id: j.customerId } });
    if (j.primaryTechnicianId) {
      const staff = await this.prisma.staff.findUnique({ where: { id: j.primaryTechnicianId } });
      const profile = await this.prisma.serviceTechnicianProfile.findFirst({ where: { staffId: j.primaryTechnicianId } });
      technician = { staff, profile };
    }

    return { ...j, customer, technician };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: { status: string; reason?: string; notes?: string; lat?: number; lng?: number }) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');

    const now = new Date();
    const patch: any = { status: dto.status };

    if (dto.status === 'ASSIGNED') patch.assignedAt = now;
    if (dto.status === 'DISPATCHED') patch.dispatchedAt = now;
    if (dto.status === 'EN_ROUTE') patch.enRouteAt = now;
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'IN_PROGRESS') patch.startedAt = patch.startedAt ?? now;
    if (dto.status === 'PAUSED') patch.pausedAt = now;
    if (dto.status === 'IN_PROGRESS' && j.pausedAt) patch.resumedAt = now;
    if (dto.status === 'COMPLETED') {
      patch.completedAt = now;
      if (j.jobWarrantyDays > 0) {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + j.jobWarrantyDays);
        patch.jobWarrantyExpiryDate = exp;
      }
    }
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.reason;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceJob.update({
        where: { id },
        data: patch,
        include: { parts: true, statusHistory: true },
      });

      // Status history
      await tx.serviceJobStatusHistory.create({
        data: {
          jobId: id,
          fromStatus: j.status,
          toStatus: dto.status as any,
          changedBy: user.id,
          reason: dto.reason,
          notes: dto.notes,
        },
      });

      // Time log with GPS
      await tx.serviceJobTimeLog.create({
        data: {
          jobId: id,
          technicianId: j.primaryTechnicianId,
          action: dto.status,
          latitude: dto.lat,
          longitude: dto.lng,
          notes: dto.notes,
        },
      });

      return updated;
    });
  }

  async assignTechnician(user: AuthenticatedUser, id: string, primaryTechnicianId: string, assistantIds?: string[]) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceJob.update({
        where: { id },
        data: {
          primaryTechnicianId,
          assistantTechnicianIds: assistantIds ?? [],
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
        include: { parts: true },
      });

      await tx.serviceJobStatusHistory.create({
        data: {
          jobId: id,
          fromStatus: j.status,
          toStatus: 'ASSIGNED',
          changedBy: user.id,
          reason: 'Technician assigned',
        },
      });

      return updated;
    });
  }

  async addPart(user: AuthenticatedUser, id: string, dto: any) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId }, include: { parts: true } });
    if (!j) throw new NotFoundException('Job not found');

    const qty = Number(dto.quantity) || 1;
    const price = Number(dto.unitPrice) || 0;

    const part = await this.prisma.serviceJobPart.create({
      data: {
        jobId: id,
        productId: dto.productId,
        partName: dto.partName,
        partNumber: dto.partNumber,
        brand: dto.brand,
        quantity: qty,
        unitPrice: price,
        costPrice: Number(dto.costPrice) || 0,
        total: qty * price,
        isCustomerSupplied: dto.isCustomerSupplied ?? false,
        isUnderWarranty: dto.isUnderWarranty ?? false,
        warrantyDays: Number(dto.warrantyDays) || 0,
        serialNumber: dto.serialNumber,
        notes: dto.notes,
      },
    });

    // Recalculate parts charge
    const newPartsCharge = [...j.parts, part]
      .filter((p) => !p.isUnderWarranty)
      .reduce((s, p) => s + p.total, 0);
    const newTotal = j.visitCharge + j.labourCharge + newPartsCharge + j.transportCharge + j.emergencyCharge + j.taxAmount - j.discountAmount;

    await this.prisma.serviceJob.update({
      where: { id },
      data: { partsCharge: newPartsCharge, totalCharge: Math.max(newTotal, 0) },
    });

    return part;
  }

  async removePart(user: AuthenticatedUser, jobId: string, partId: string) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id: jobId, tenantId: user.tenantId }, include: { parts: true } });
    if (!j) throw new NotFoundException('Job not found');

    await this.prisma.serviceJobPart.delete({ where: { id: partId } });

    const remaining = j.parts.filter((p) => p.id !== partId);
    const newPartsCharge = remaining.filter((p) => !p.isUnderWarranty).reduce((s, p) => s + p.total, 0);
    const newTotal = j.visitCharge + j.labourCharge + newPartsCharge + j.transportCharge + j.emergencyCharge + j.taxAmount - j.discountAmount;

    return this.prisma.serviceJob.update({
      where: { id: jobId },
      data: { partsCharge: newPartsCharge, totalCharge: Math.max(newTotal, 0) },
      include: { parts: true },
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number, isAdvance = false) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');

    const newPaid = j.paidAmount + amount;
    const newAdvanceCollected = isAdvance ? j.advanceCollected + amount : j.advanceCollected;

    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= j.totalCharge) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';

    return this.prisma.serviceJob.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        advanceCollected: newAdvanceCollected,
        paymentStatus,
      },
      include: { parts: true },
    });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string, wouldRecommend?: boolean, satisfaction?: string) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');
    return this.prisma.serviceJob.update({
      where: { id },
      data: {
        customerRating: rating,
        customerFeedback: feedback,
        wouldRecommend,
        customerSatisfaction: satisfaction,
      },
    });
  }

  async uploadCompletionSignature(user: AuthenticatedUser, id: string, signatureUrl: string) {
    return this.prisma.serviceJob.update({
      where: { id },
      data: { workCompletionSignatureUrl: signatureUrl },
    });
  }

  async addPhotos(user: AuthenticatedUser, id: string, stage: 'before' | 'during' | 'after', urls: string[]) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');

    const key = stage === 'before' ? 'beforePhotoUrls' : stage === 'during' ? 'duringPhotoUrls' : 'afterPhotoUrls';
    const current = (j as any)[key] as string[];

    return this.prisma.serviceJob.update({
      where: { id },
      data: { [key]: [...current, ...urls] },
      include: { parts: true },
    });
  }

  async createReturnVisit(user: AuthenticatedUser, id: string, dto: { returnVisitDate: string; reason: string }) {
    const parent = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!parent) throw new NotFoundException('Parent job not found');

    await this.prisma.serviceJob.update({
      where: { id },
      data: {
        needsReturnVisit: true,
        returnVisitReason: dto.reason,
        returnVisitDate: new Date(dto.returnVisitDate),
      },
    });

    const count = await this.prisma.serviceJob.count({ where: { tenantId: user.tenantId } });
    const jobNumber = 'JOB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    return this.prisma.serviceJob.create({
      data: {
        tenantId: user.tenantId,
        jobNumber,
        customerId: parent.customerId,
        customerName: parent.customerName,
        customerPhone: parent.customerPhone,
        serviceId: parent.serviceId,
        serviceName: parent.serviceName + ' - Return Visit',
        category: 'RETURN_VISIT',
        businessType: parent.businessType,
        priority: parent.priority,
        status: 'SCHEDULED',
        problemDescription: dto.reason,
        locationType: parent.locationType,
        serviceAddress: parent.serviceAddress,
        city: parent.city,
        area: parent.area,
        scheduledStart: new Date(dto.returnVisitDate),
        primaryTechnicianId: parent.primaryTechnicianId,
        parentJobId: parent.id,
        underWarranty: true,
        totalCharge: 0,
        createdById: user.id,
      },
      include: { parts: true },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason: string) {
    return this.updateStatus(user, id, { status: 'CANCELLED', reason });
  }

  async summary(user: AuthenticatedUser, from?: string, to?: string) {
    const where: any = { tenantId: user.tenantId };
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [total, byStatus, revenue, avgRating] = await Promise.all([
      this.prisma.serviceJob.count({ where }),
      this.prisma.serviceJob.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.serviceJob.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { totalCharge: true, paidAmount: true, labourCharge: true, partsCharge: true },
      }),
      this.prisma.serviceJob.aggregate({
        where: { ...where, customerRating: { not: null } },
        _avg: { customerRating: true },
      }),
    ]);

    return {
      total,
      byStatus,
      revenue: revenue._sum,
      avgRating: avgRating._avg.customerRating,
    };
  }
}
