import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CreateWorkshopJobDto, SetWarrantyDto, UpdateJobStatusDto } from './dto/create-workshop-job.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { claimShopStock } from '../../../modules/sales/sales/stock-claim.helper';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
/** Bill number for a job: one job, one sale. */
const jobSaleNumber = (jobNumber: string) => `WSJ-${jobNumber}`;

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

  async create(user: AuthenticatedUser, input: CreateWorkshopJobDto) {
    // The form sends "" for anything not picked; those are empty links, not ids.
    const blank = (v?: string) => (v && v.trim() ? v.trim() : undefined);
    const dto: CreateWorkshopJobDto = {
      ...input,
      vehicleId: blank(input.vehicleId),
      customerId: blank(input.customerId),
      primaryMechanicId: blank(input.primaryMechanicId),
      shopId: blank(input.shopId),
      promisedAt: blank(input.promisedAt),
    };
    if (dto.customerId && !(await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Customer nahi mila');
    }
    if (dto.primaryMechanicId && !(await this.prisma.mechanicProfile.findFirst({ where: { id: dto.primaryMechanicId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Mechanic nahi mila');
    }
    const partIds = [...new Set((dto.partsUsed || []).map((p) => p.productId).filter((x): x is string => !!x))];
    if (partIds.length) {
      const found = await this.prisma.product.count({ where: { id: { in: partIds }, tenantId: user.tenantId } });
      if (found !== partIds.length) throw new NotFoundException('Koi part product nahi mila');
    }
    for (const p of dto.partsUsed || []) {
      if (!((p.quantity ?? 1) > 0)) throw new BadRequestException(`"${p.partName}" ki quantity 0 se zyada honi chahiye`);
    }
    const prefix = `JOB-${new Date().getFullYear()}-`;

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
          customerId: v.customerId || dto.customerId || undefined,
          customerName: dto.customerName || v.ownerName,
          customerPhone: dto.customerPhone || v.ownerPhone,
        };
      }
    }

    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.workshopJob.findMany({
        where: { tenantId: user.tenantId, jobNumber: { startsWith: prefix } },
        select: { jobNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((j) => j.jobNumber),
      create: (jobNumber) => this.prisma.workshopJob.create({
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
    }),
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

    const sale = await this.prisma.sale.findFirst({
      where: { tenantId: user.tenantId, saleNumber: jobSaleNumber(job.jobNumber) },
      select: { id: true, saleNumber: true, total: true, creditAmount: true },
    });

    return { ...job, customer, vehicle, sale };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'DELIVERED' && dto.status !== 'DELIVERED') {
      throw new BadRequestException('Gaari de di gayi aur bill ban chuka — ab status nahi badalta. Return ho to bill se return karein');
    }
    if (job.status === 'CANCELLED' && dto.status !== 'CANCELLED') {
      throw new BadRequestException('Cancel job dobara nahi khulti — naya job banayein');
    }
    if (job.status === dto.status) return this.getOne(user, id);

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
        if (!job.completedAt) patch.completedAt = now;
        Object.assign(patch, await this.postJobBill(tx, user, job.id));
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

  /**
   * Handing the vehicle back closes the job's money:
   *  - the bill (labour, parts, outside work, tax, discount) becomes a Sale, so
   *    it shows in the day book, cash register, profit and every sales report;
   *  - parts taken from the shop's stock leave ShopStock and Product stock with
   *    a SALE_OUT movement;
   *  - payments taken earlier sit on the customer's khata as an advance and pay
   *    the bill; anything still owed stays on the khata as udhaar.
   */
  private async postJobBill(tx: any, user: AuthenticatedUser, jobId: string) {
    const job = await tx.workshopJob.findUnique({
      where: { id: jobId },
      include: { laborItems: true, partsUsed: true, externalWork: true },
    });
    const shopId = await resolveIndustryShopId(tx, user, job.shopId);

    const stockParts = job.partsUsed.filter((p: any) => p.productId && !p.isCustomerSupplied);
    const products: { id: string; name: string; costPrice: number | null }[] = stockParts.length
      ? await tx.product.findMany({
          where: { id: { in: stockParts.map((p: any) => p.productId) }, tenantId: user.tenantId },
          select: { id: true, name: true, costPrice: true },
        })
      : [];
    const productOf = new Map(products.map((p) => [p.id, p]));

    const vehicle = [job.registrationNumber, job.makeName, job.modelName].filter(Boolean).join(' ');
    const lines = [
      ...job.laborItems.map((l: any) => ({ label: `Mazdoori: ${l.description}`, amount: r2(l.total) })),
      ...job.partsUsed.map((p: any) => {
        const prod = p.productId && !p.isCustomerSupplied ? productOf.get(p.productId) : undefined;
        return {
          label: `${p.partName}${p.partNumber ? ` (${p.partNumber})` : ''}${p.isCustomerSupplied ? ' — customer ka part' : ''}`,
          amount: r2(p.total),
          cost: prod ? r2((Number(prod.costPrice) || 0) * p.quantity) : 0,
          quantity: p.quantity,
        };
      }),
      ...job.externalWork.map((e: any) => ({ label: `Bahar ka kaam: ${e.description}`, amount: r2(e.total), cost: r2(e.cost) })),
      { label: 'Tax', amount: r2(job.taxAmount) },
    ];
    const billable = lines.some((l) => l.amount > 0 || (l.cost ?? 0) > 0);

    // Payments recorded before khata posting existed count as paid with this bill.
    const legacyPaid = r2(Math.max(job.paidAmount - (await paidOnKhata(tx, user.tenantId, job.jobNumber)), 0));
    const owed = r2(Math.max(job.total - job.paidAmount, 0));
    let customerId: string | null = job.customerId || null;
    if (!customerId && owed > 0.009) {
      if (!job.customerName?.trim()) {
        throw new BadRequestException(`Rs ${owed} baqi hai — poori amount lein, ya udhaar ke liye customer ka naam/phone job me dalein`);
      }
      customerId = await ensureCustomer(tx, user, { name: job.customerName, phone: job.customerPhone, shopId });
    }

    let saleNumber: string | undefined;
    if (billable) {
      const sale = await postIndustrySale(tx, user, {
        saleNumber: jobSaleNumber(job.jobNumber),
        sourceRef: job.jobNumber,
        shopId,
        customerId,
        lines,
        discount: job.discount,
        paidAmount: legacyPaid,
        paymentMethod: 'CASH',
      });
      saleNumber = sale.saleNumber;
    }

    // Parts from stock leave the branch that did the job.
    for (const p of stockParts) {
      const prod = productOf.get(p.productId);
      if (!prod) continue;
      const row = await tx.shopStock.findFirst({
        where: { shopId, productId: p.productId, variantId: p.variantId ?? null },
        select: { id: true },
      });
      if (!row) throw new BadRequestException(`${prod.name} is branch me stock me nahi — pehle stock dalein`);
      const left = await claimShopStock(tx, row.id, p.quantity, 'is branch');
      if (p.variantId) {
        await tx.productVariant.update({ where: { id: p.variantId }, data: { stock: { decrement: p.quantity } } });
      }
      await tx.product.update({ where: { id: p.productId }, data: { stock: { decrement: p.quantity } } });
      await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: p.productId,
          type: 'SALE_OUT',
          quantity: -p.quantity,
          balanceAfter: left,
          reference: saleNumber ?? job.jobNumber,
          note: `Workshop job ${job.jobNumber}${vehicle ? ` • ${vehicle}` : ''}`,
        },
      });
    }

    const paid = r2(job.paidAmount);
    return {
      shopId,
      customerId,
      paymentStatus: paid >= job.total - 0.01 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      ...(saleNumber && { internalNotes: `${job.internalNotes ? `${job.internalNotes}\n` : ''}Bill: ${saleNumber}` }),
    };
  }

  /**
   * Money taken for a job. Before delivery it is an advance on the customer's
   * khata; after delivery it pays off the job's udhaar. Either way the day book
   * and the cash register see the cash on the day it came in.
   */
  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CANCELLED') throw new BadRequestException('Cancel job par payment nahi li ja sakti');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount 0 se zyada honi chahiye');
    const remaining = r2(job.total - job.paidAmount);
    if (amount > remaining + 0.01) throw new BadRequestException(`Sirf Rs ${Math.max(remaining, 0)} baqi hai`);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, job.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: job.customerId, name: job.customerName, phone: job.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId,
        shopId,
        amount,
        method: dto.paymentMethod,
        reference: job.status === 'DELIVERED' ? jobSaleNumber(job.jobNumber) : job.jobNumber,
        note: job.status === 'DELIVERED'
          ? `Workshop job ${job.jobNumber} ki wusooli${dto.reference ? ` (${dto.reference})` : ''}`
          : `Workshop job ${job.jobNumber} ka advance${dto.reference ? ` (${dto.reference})` : ''}`,
      });
      await tx.workshopJobPayment.create({
        data: {
          jobId: id,
          amount,
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: dto.notes,
          receivedById: user.id,
        },
      });

      const newPaid = r2(job.paidAmount + amount);
      return tx.workshopJob.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          paymentStatus: newPaid >= job.total - 0.01 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          customerId,
          shopId,
        },
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
