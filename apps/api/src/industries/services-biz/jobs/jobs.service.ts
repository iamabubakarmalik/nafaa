import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
/** The sale a finished job is billed under. */
const billNo = (jobNumber: string) => `SVC-${jobNumber}`;

export interface BillJobInput {
  paidAmount: number;
  paymentMethod?: string;
  shopId?: string;
}

export interface CounterSaleInput {
  shopId?: string;
  customerId?: string;
  paymentMethod?: string;
  paidAmount: number;
  discount?: number;
  items: { serviceId: string; quantity?: number; price?: number; lineDiscount?: number; note?: string }[];
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const jobNumber = await this.nextJobNumber(user.tenantId);

    // Enrich from service catalog
    let serviceName = dto.serviceName;
    let businessType = dto.businessType;
    let category = dto.category;
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

    category = category || 'REPAIR';
    if (!serviceName?.trim()) throw new BadRequestException('Service chunein ya service ka naam likhein');
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { name: true, phone: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      dto.customerName = dto.customerName?.trim() || c.name;
      dto.customerPhone = dto.customerPhone?.trim() || c.phone || undefined;
    } else if (!dto.customerName?.trim()) {
      throw new BadRequestException('Customer ka naam likhein');
    }
    // The job card needs a problem line; fall back to the service name.
    dto.problemDescription = dto.problemDescription?.trim() || serviceName;

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
        shopId: dto.shopId || user.shopId || null,
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

    const billSale = await this.findBill(user.tenantId, j.jobNumber);
    return { ...j, customer, technician, billSale };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: { status: string; reason?: string; notes?: string; lat?: number; lng?: number }) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');
    if (j.status === dto.status) return this.getOne(user, id);
    const billed = await this.findBill(user.tenantId, j.jobNumber);
    if (billed && dto.status === 'CANCELLED') {
      throw new BadRequestException('Is job ka bill ban chuka hai — cancel nahi hota, bill ka return karein');
    }
    if (j.status === 'CANCELLED') throw new BadRequestException('Cancel job dobara nahi khulti — naya job banayein');
    // Completing posts the bill; money taken earlier stays as advance on khata.
    if (dto.status === 'COMPLETED' && !billed) {
      await this.bill(user, id, { paidAmount: 0 });
      return this.getOne(user, id);
    }

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
    if (await this.findBill(user.tenantId, j.jobNumber)) throw new BadRequestException('Bill ban chuka hai — ab parts nahi badalte');
    if (!dto.partName?.trim()) throw new BadRequestException('Part ka naam likhein');

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
    if (await this.findBill(user.tenantId, j.jobNumber)) throw new BadRequestException('Bill ban chuka hai — ab parts nahi badalte');
    if (!j.parts.some((p) => p.id === partId)) throw new NotFoundException('Part nahi mila');

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

  /**
   * Money taken outside the final bill. Before the bill it is an advance held
   * on the customer's khata; after the bill it pays off udhaar. Either way
   * the day book and cash register see it on the day it came in. Method left
   * out is cash.
   */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, isAdvance = false, paymentMethod?: string) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');
    if (j.status === 'CANCELLED') throw new BadRequestException('Cancel job par payment nahi li ja sakti');
    const value = r2(amount);
    if (!(value > 0)) throw new BadRequestException('Amount sahi likhein');
    const remaining = r2(j.totalCharge - j.paidAmount);
    if (remaining <= 0) throw new BadRequestException('Is job ka koi baqi nahi');
    if (value > remaining + 0.01) throw new BadRequestException(`Baqi sirf Rs ${remaining} hai`);
    const billed = await this.findBill(user.tenantId, j.jobNumber);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, j.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: j.customerId, name: j.customerName, phone: j.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId,
        shopId,
        amount: value,
        reference: j.jobNumber,
        note: `${billed ? 'Job baqi wasool' : 'Job advance'}: ${j.jobNumber}`,
        method: paymentMethod,
      });
      const newPaid = r2(j.paidAmount + value);
      return tx.serviceJob.update({
        where: { id },
        data: {
          customerId,
          shopId,
          paidAmount: newPaid,
          advanceCollected: !billed || isAdvance ? r2(j.advanceCollected + (billed ? 0 : value)) : j.advanceCollected,
          paymentStatus: newPaid >= j.totalCharge - 0.01 ? 'PAID' : 'PARTIALLY_PAID',
        },
        include: { parts: true },
      });
    });
  }

  /**
   * Final bill for a job: one sale with visit, labour, parts and other
   * charges. Advances already on khata are used first; money taken now is
   * `paidAmount`; anything still owed becomes the customer's udhaar.
   */
  async bill(user: AuthenticatedUser, id: string, dto: BillJobInput) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId }, include: { parts: true } });
    if (!j) throw new NotFoundException('Job not found');
    if (j.status === 'CANCELLED') throw new BadRequestException('Cancel job ka bill nahi banta');
    if (await this.findBill(user.tenantId, j.jobNumber)) throw new BadRequestException(`${j.jobNumber} ka bill pehle hi ban chuka hai`);

    const total = r2(j.totalCharge);
    const advance = r2(j.paidAmount);
    const due = r2(Math.max(total - advance, 0));
    const paidNow = r2(Math.max(Number(dto.paidAmount) || 0, 0));
    const kept = r2(Math.min(paidNow, due));

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId ?? j.shopId);
      const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, j.jobNumber)), 0));
      const stillOwed = r2(due - kept);
      let customerId = j.customerId;
      if (!customerId && stillOwed > 0) {
        if (!j.customerName?.trim()) {
          throw new BadRequestException(`Rs ${stillOwed} baqi hai — poori amount lein, ya udhaar ke liye customer jorein`);
        }
        customerId = await ensureCustomer(tx, user, { name: j.customerName, phone: j.customerPhone, shopId });
      }

      // Parts the shop paid for are a cost even when they are free to the customer.
      const partLines = j.parts.map((p) => ({
        label: `${p.partName}${p.isUnderWarranty ? ' (warranty)' : ''}`,
        amount: p.isUnderWarranty ? 0 : r2(p.total),
        cost: p.isCustomerSupplied ? 0 : r2((p.costPrice || 0) * (p.quantity || 1)),
        quantity: p.quantity || 1,
      }));
      const lines = [
        { label: `${j.serviceName || 'Service'} — visit`, amount: j.visitCharge },
        { label: `${j.serviceName || 'Service'} — labour`, amount: j.labourCharge },
        ...partLines,
        { label: 'Transport', amount: j.transportCharge },
        { label: 'Emergency charge', amount: j.emergencyCharge },
        { label: 'Tax', amount: j.taxAmount },
      ];
      // Charges kept only as a total (e.g. parts from a quote) get their own line.
      const partsRows = r2(partLines.reduce((a, l) => a + l.amount, 0));
      if (j.partsCharge - partsRows > 0.01) lines.push({ label: 'Parts', amount: r2(j.partsCharge - partsRows) });
      const gross = r2(lines.reduce((a, l) => a + Math.max(Number(l.amount) || 0, 0), 0));
      if (total + j.discountAmount - gross > 0.01) lines.push({ label: 'Other charges', amount: r2(total + j.discountAmount - gross) });
      const linesTotal = r2(lines.reduce((a, l) => a + Math.max(Number(l.amount) || 0, 0), 0));
      const hasMoney = lines.some((l) => (Number(l.amount) || 0) > 0 || (Number((l as any).cost) || 0) > 0);

      let sale: { id: string; saleNumber: string } | null = null;
      if (hasMoney) {
        const posted = await postIndustrySale(tx, user, {
          saleNumber: billNo(j.jobNumber),
          sourceRef: j.jobNumber,
          shopId,
          customerId,
          lines,
          discount: r2(Math.max(linesTotal - total, 0)),
          paidAmount: r2(paidNow + legacyPaid),
          paymentMethod: dto.paymentMethod,
        });
        sale = { id: posted.id, saleNumber: posted.saleNumber };
      }

      const paidTotal = r2(advance + kept);
      const now = new Date();
      const done = ['COMPLETED', 'CLOSED'].includes(j.status as string);
      const warrantyExp = !done && j.jobWarrantyDays > 0 ? new Date(now.getTime() + j.jobWarrantyDays * 86_400_000) : undefined;
      const updated = await tx.serviceJob.update({
        where: { id },
        data: {
          customerId,
          shopId,
          paidAmount: paidTotal,
          paymentStatus: paidTotal >= total - 0.01 ? 'PAID' : paidTotal > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          ...(!done && { status: 'COMPLETED', completedAt: now, ...(warrantyExp && { jobWarrantyExpiryDate: warrantyExp }) }),
        },
        include: { parts: true },
      });
      if (!done) {
        await tx.serviceJobStatusHistory.create({
          data: { jobId: id, fromStatus: j.status, toStatus: 'COMPLETED', changedBy: user.id, reason: 'Bill bana' },
        });
      }
      return { ...updated, sale, change: r2(paidNow - kept) };
    });
  }

  /**
   * Counter sale of catalogue services without a job card (walk-in work done
   * at the shop). Posted as one sale like any other bill.
   */
  async counterSale(user: AuthenticatedUser, dto: CounterSaleInput) {
    if (!dto.items?.length) throw new BadRequestException('Kam az kam ek service chunein');
    const ids = [...new Set(dto.items.map((i) => i.serviceId))];
    const services = await this.prisma.serviceCatalog.findMany({ where: { id: { in: ids }, tenantId: user.tenantId } });
    const byId = new Map(services.map((s) => [s.id, s]));
    const lines = dto.items.map((i) => {
      const svc = byId.get(i.serviceId);
      if (!svc) throw new BadRequestException('Service nahi mili');
      const qty = Number(i.quantity) > 0 ? Number(i.quantity) : 1;
      const price = i.price != null ? Number(i.price) : (svc.baseCharge || svc.visitCharge || svc.hourlyRate || 0);
      const amount = r2(Math.max(price * qty - (Number(i.lineDiscount) || 0), 0));
      return { label: `${svc.name}${i.note ? ` — ${i.note}` : ''}`, amount, quantity: qty };
    });

    return this.prisma.$transaction(async (tx) => {
      const sale = await postIndustrySale(tx, user, {
        saleNumber: `SVC-C-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase()}`,
        sourceRef: 'Counter',
        shopId: dto.shopId,
        customerId: dto.customerId || null,
        lines,
        discount: r2(dto.discount ?? 0),
        paidAmount: r2(dto.paidAmount),
        paymentMethod: dto.paymentMethod,
      });
      for (const s of services) {
        const n = dto.items.filter((i) => i.serviceId === s.id).length;
        await tx.serviceCatalog.updateMany({ where: { id: s.id, tenantId: user.tenantId }, data: { totalJobs: { increment: n } } });
      }
      return sale;
    });
  }

  private findBill(tenantId: string, jobNumber: string) {
    return this.prisma.sale.findFirst({ where: { tenantId, saleNumber: billNo(jobNumber) }, select: { id: true, saleNumber: true } });
  }

  /** Next JOB-YYYY-NNNNN; follows the last number so a gap never repeats one. */
  private async nextJobNumber(tenantId: string) {
    const prefix = `JOB-${new Date().getFullYear()}-`;
    const last = await this.prisma.serviceJob.findFirst({
      where: { tenantId, jobNumber: { startsWith: prefix } },
      orderBy: { jobNumber: 'desc' },
      select: { jobNumber: true },
    });
    return prefix + String((last ? Number(last.jobNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(5, '0');
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
      where: { id, tenantId: user.tenantId },
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

    const jobNumber = await this.nextJobNumber(user.tenantId);

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
