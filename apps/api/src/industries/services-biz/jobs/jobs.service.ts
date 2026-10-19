/**
 * Service jobs (work orders): intake with the customer and the item or site,
 * estimate, advance on khata, technician, status pipeline, parts used and
 * the final bill.
 *
 * Money and stock go only through the shared helpers: advances and later
 * payments are khata receipts, the bill is one Sale (postIndustrySale) and
 * shelf parts leave stock when the job is billed. A voided bill puts the job
 * back to "ready" so it can be corrected and billed again; the void itself
 * returns the parts to the shelf and keeps advances on the khata.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { Prisma, type PaymentMethod, type ServiceJobStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { applyStockDelta, isServiceProduct } from '../../../common/shop-scope';
import { saveSalePayments, splitTender } from '../../../common/helpers/sale-payments.helper';
import { addDaysTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId, toPaymentMethod, type IndustrySaleLine,
} from '../../_shared/industry-sale.helper';
import { serviceProductIds } from '../catalog/service-product';
import {
  BOOKED, CLOSED, NOT_STARTED, OPEN, READY, WAITING, WORKING, blank, dayRange, jobBillNumber, jobBillPrefix, jobNumberOfBill, jobTotal, nextJobNumber, payStatus, r2,
} from './job-rules';
import type {
  AssignJobDto, BillJobDto, CounterSaleDto, CreateJobDto, JobDetailsDto, JobPartDto, JobStatusDto, ListJobsQuery, RatingDto, ReturnVisitDto, UpdateJobDto,
} from './dto/job.dto';

type Tx = Prisma.TransactionClient;
const TX = { timeout: 30_000 } as const;
/** Statuses a technician is busy in. */
const BUSY: ServiceJobStatus[] = ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly log = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
  ) {}

  /** A voided job bill reopens the job; a return on it settles what the job still shows as due. */
  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.reopenAfterVoid(tenantId, saleId).then(() => undefined));
    this.returns.onReturn((tenantId, saleId) => this.afterReturn(tenantId, saleId).catch((e) => {
      this.log.warn(`Returned bill ${saleId} not applied to its job: ${(e as Error).message}`);
    }));
  }

  /** Money returned on each job's live bill, by job number. */
  private async returnedOn(tenantId: string, jobNumbers: string[]) {
    if (!jobNumbers.length) return new Map<string, number>();
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, status: { not: 'VOIDED' }, OR: jobNumbers.map((n) => ({ saleNumber: { startsWith: jobBillPrefix(n) } })), returns: { some: {} } },
      select: { saleNumber: true, returns: { select: { refundAmount: true } } },
    });
    const out = new Map<string, number>();
    for (const s of sales) {
      const n = jobNumberOfBill(s.saleNumber);
      if (n) out.set(n, r2((out.get(n) ?? 0) + s.returns.reduce((a, x) => a + (Number(x.refundAmount) || 0), 0)));
    }
    return out;
  }

  /**
   * Goods or work returned on a job bill. The shared return already took the
   * refund off the udhaar first and paid the rest back, so the job now owes
   * at most its bill less what came back.
   */
  async afterReturn(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, returns: { select: { refundAmount: true, returnNumber: true }, orderBy: { createdAt: 'desc' } } } });
    const jobNumber = sale ? jobNumberOfBill(sale.saleNumber) : null;
    if (!sale || !jobNumber) return;
    const job = await this.prisma.serviceJob.findFirst({ where: { tenantId, jobNumber }, select: { id: true, status: true, totalCharge: true, paidAmount: true } });
    if (!job || job.status !== 'COMPLETED') return;
    const returned = r2(sale.returns.reduce((a, x) => a + (Number(x.refundAmount) || 0), 0));
    const owes = r2(Math.max(job.totalCharge - returned, 0));
    const paid = r2(Math.min(job.paidAmount, owes));
    await this.prisma.$transaction([
      this.prisma.serviceJob.update({ where: { id: job.id }, data: { paidAmount: paid, paymentStatus: payStatus(paid, owes) } }),
      this.prisma.serviceJobStatusHistory.create({
        data: { jobId: job.id, fromStatus: 'COMPLETED', toStatus: 'COMPLETED', reason: `Return ${sale.returns[0]?.returnNumber ?? ''}: bill se Rs ${returned} wapas`.replace('  ', ' ') },
      }),
    ]);
  }

  // ─────────────────────────── intake ───────────────────────────

  private async customerFields(user: AuthenticatedUser, dto: JobDetailsDto) {
    if (!dto.customerId) return { customerName: blank(dto.customerName), customerPhone: blank(dto.customerPhone) };
    const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { name: true, phone: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    return { customerName: blank(dto.customerName) ?? c.name, customerPhone: blank(dto.customerPhone) ?? c.phone ?? undefined };
  }

  private async staffExists(user: AuthenticatedUser, ids: string[]) {
    const want = [...new Set(ids.filter(Boolean))];
    if (!want.length) return;
    const n = await this.prisma.staff.count({ where: { tenantId: user.tenantId, id: { in: want } } });
    if (n !== want.length) throw new NotFoundException('Technician nahi mila');
  }

  private dates(dto: JobDetailsDto) {
    const start = dto.scheduledStart ? new Date(dto.scheduledStart) : undefined;
    const end = dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined;
    if (start && end && end < start) throw new BadRequestException('Khatam hone ka waqt shuru se pehle nahi ho sakta');
    return { start, end };
  }

  /** Parts as stored on the job; shelf parts are checked against this tenant's products. */
  private async partRows(user: AuthenticatedUser, parts: JobPartDto[]) {
    const ids = [...new Set(parts.map((p) => p.productId).filter((x): x is string => !!x))];
    const products = ids.length
      ? await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, name: true, costPrice: true } })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return parts.map((p, i) => {
      const prod = p.productId ? byId.get(p.productId) : undefined;
      if (p.productId && !prod) throw new NotFoundException(`"${p.partName}" ka product nahi mila`);
      const name = blank(p.partName) ?? prod?.name;
      if (!name) throw new BadRequestException('Part ka naam likhein');
      const quantity = Number(p.quantity) > 0 ? Number(p.quantity) : 1;
      const unitPrice = p.isCustomerSupplied ? 0 : r2(p.unitPrice ?? 0);
      return {
        productId: prod?.id ?? null,
        partName: name,
        partNumber: blank(p.partNumber) ?? null,
        brand: blank(p.brand) ?? null,
        quantity,
        unitPrice,
        // Shelf parts are costed from the product when billed; outside parts keep what the shop paid.
        costPrice: prod ? Number(prod.costPrice) || 0 : r2(p.costPrice ?? 0),
        total: r2(quantity * unitPrice),
        isCustomerSupplied: !!p.isCustomerSupplied,
        isUnderWarranty: !!p.isUnderWarranty,
        warrantyDays: p.warrantyDays ?? 0,
        serialNumber: blank(p.serialNumber) ?? null,
        notes: blank(p.notes) ?? null,
        displayOrder: i,
      };
    });
  }

  private partsCharge(parts: Array<{ total: number; isUnderWarranty: boolean }>) {
    return r2(parts.filter((p) => !p.isUnderWarranty).reduce((s, p) => s + p.total, 0));
  }

  async create(user: AuthenticatedUser, dto: CreateJobDto) {
    let serviceName = blank(dto.serviceName);
    let category = dto.category;
    let businessType: Prisma.ServiceJobCreateInput['businessType'];
    let visitCharge = dto.visitCharge;
    let labourCharge = dto.labourCharge;
    let warrantyDays = dto.jobWarrantyDays;
    if (dto.serviceId) {
      const svc = await this.prisma.serviceCatalog.findFirst({ where: { id: dto.serviceId, tenantId: user.tenantId } });
      if (!svc) throw new NotFoundException('Service nahi mili');
      serviceName = serviceName ?? svc.name;
      category = category ?? svc.category;
      businessType = svc.businessType;
      visitCharge = visitCharge ?? svc.visitCharge;
      labourCharge = labourCharge ?? (svc.baseCharge || svc.hourlyRate);
      warrantyDays = warrantyDays ?? svc.warrantyDays;
    }
    if (!serviceName) throw new BadRequestException('Service chunein ya kaam ka naam likhein');
    const who = await this.customerFields(user, dto);
    if (!dto.customerId && !who.customerName) throw new BadRequestException('Customer ka naam likhein');
    await this.staffExists(user, [dto.primaryTechnicianId ?? '', ...(dto.assistantTechnicianIds ?? [])]);
    if (dto.amcId && !(await this.prisma.serviceAmc.findFirst({ where: { id: dto.amcId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('AMC contract nahi mila');
    }
    const { start, end } = this.dates(dto);
    const parts = await this.partRows(user, dto.parts ?? []);
    const charges = {
      visitCharge: r2(visitCharge ?? 0), labourCharge: r2(labourCharge ?? 0), partsCharge: this.partsCharge(parts),
      transportCharge: r2(dto.transportCharge ?? 0), emergencyCharge: r2(dto.emergencyCharge ?? 0),
      discountAmount: r2(dto.discountAmount ?? 0), taxAmount: r2(dto.taxAmount ?? 0),
    };
    const gross = r2(charges.visitCharge + charges.labourCharge + charges.partsCharge + charges.transportCharge + charges.emergencyCharge + charges.taxAmount);
    if (charges.discountAmount > gross + 0.001) throw new BadRequestException(`Discount bill (Rs ${gross}) se zyada nahi ho sakta`);
    const totalCharge = jobTotal(charges);
    const advance = r2(dto.advancePaid ?? 0);
    if (advance > 0 && !hasPermission(user.role, user.permissions, PERMISSIONS.POS_USE)) throw new ForbiddenException('Advance lene ke liye counter (POS) ki permission chahiye');
    if (advance > 0 && totalCharge > 0 && advance > totalCharge + 0.01) throw new BadRequestException(`Advance bill (Rs ${totalCharge}) se zyada nahi ho sakta`);
    const status: ServiceJobStatus = dto.primaryTechnicianId ? 'ASSIGNED' : start ? 'SCHEDULED' : 'CONFIRMED';

    for (let attempt = 0; ; attempt++) {
      try {
        const id = await this.prisma.$transaction(async (tx) => {
          const shopId = await resolveIndustryShopId(tx, user, dto.shopId);
          const jobNumber = await nextJobNumber(tx, user.tenantId);
          let customerId = dto.customerId ?? null;
          if (advance > 0) customerId = await ensureCustomer(tx, user, { customerId, name: who.customerName, phone: who.customerPhone, shopId });
          const job = await tx.serviceJob.create({
            data: {
              tenantId: user.tenantId, shopId, jobNumber, ticketNumber: blank(dto.ticketNumber),
              customerId, customerName: who.customerName, customerPhone: who.customerPhone,
              customerAltPhone: blank(dto.customerAltPhone), customerEmail: blank(dto.customerEmail), customerType: dto.customerType ?? 'INDIVIDUAL',
              serviceId: dto.serviceId, serviceName, category: category ?? 'REPAIR', businessType,
              priority: dto.priority ?? 'NORMAL', status,
              problemDescription: blank(dto.problemDescription) ?? serviceName,
              brand: blank(dto.brand), modelNumber: blank(dto.modelNumber), serialNumber: blank(dto.serialNumber), underWarranty: !!dto.underWarranty,
              amcId: dto.amcId, locationType: dto.locationType ?? 'IN_SHOP',
              serviceAddress: blank(dto.serviceAddress), city: blank(dto.city), area: blank(dto.area), landmark: blank(dto.landmark),
              scheduledStart: start, scheduledEnd: end, preferredTimeSlot: blank(dto.preferredTimeSlot),
              primaryTechnicianId: dto.primaryTechnicianId, assistantTechnicianIds: dto.assistantTechnicianIds ?? [],
              ...(dto.primaryTechnicianId && { assignedAt: new Date() }),
              ...charges, totalCharge,
              advanceRequired: (dto.advanceAmount ?? 0) > 0, advanceAmount: r2(dto.advanceAmount ?? 0),
              jobWarrantyDays: warrantyDays ?? 0, jobWarrantyTerms: blank(dto.jobWarrantyTerms),
              technicianNotes: blank(dto.technicianNotes), internalNotes: blank(dto.internalNotes),
              createdById: user.id,
              parts: { create: parts },
              statusHistory: { create: [{ toStatus: status, changedBy: user.id, reason: 'Job bani' }] },
            },
            select: { id: true, jobNumber: true },
          });
          if (advance > 0 && customerId) {
            await recordKhataPayment(tx, user, { customerId, shopId, amount: advance, reference: job.jobNumber, note: `Job advance: ${job.jobNumber}`, method: dto.advanceMethod });
            await tx.serviceJob.update({
              where: { id: job.id },
              data: { paidAmount: advance, advanceCollected: advance, paymentStatus: payStatus(advance, totalCharge) },
            });
          }
          return job.id;
        }, TX);
        return this.getOne(user, id);
      } catch (e) {
        // Two jobs saved at the same moment can pick the same number; take the next one.
        if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** Changes details or charges of a job that is not billed or cancelled. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateJobDto) {
    const j = await this.openJob(user, id);
    const who = dto.customerId !== undefined || dto.customerName !== undefined || dto.customerPhone !== undefined
      ? await this.customerFields(user, { ...dto, customerId: dto.customerId ?? j.customerId ?? undefined })
      : {};
    let serviceName = blank(dto.serviceName);
    if (dto.serviceId && dto.serviceId !== j.serviceId) {
      const svc = await this.prisma.serviceCatalog.findFirst({ where: { id: dto.serviceId, tenantId: user.tenantId }, select: { name: true } });
      if (!svc) throw new NotFoundException('Service nahi mili');
      serviceName = serviceName ?? svc.name;
    }
    const { start, end } = this.dates({ scheduledStart: dto.scheduledStart ?? j.scheduledStart?.toISOString(), scheduledEnd: dto.scheduledEnd ?? j.scheduledEnd?.toISOString() });
    const charges = {
      visitCharge: r2(dto.visitCharge ?? j.visitCharge), labourCharge: r2(dto.labourCharge ?? j.labourCharge), partsCharge: j.partsCharge,
      transportCharge: r2(dto.transportCharge ?? j.transportCharge), emergencyCharge: r2(dto.emergencyCharge ?? j.emergencyCharge),
      discountAmount: r2(dto.discountAmount ?? j.discountAmount), taxAmount: r2(dto.taxAmount ?? j.taxAmount),
    };
    const gross = r2(charges.visitCharge + charges.labourCharge + charges.partsCharge + charges.transportCharge + charges.emergencyCharge + charges.taxAmount);
    if (charges.discountAmount > gross + 0.001) throw new BadRequestException(`Discount bill (Rs ${gross}) se zyada nahi ho sakta`);
    const totalCharge = jobTotal(charges);
    if (j.paidAmount > totalCharge + 0.01 && totalCharge > 0) {
      throw new BadRequestException(`Rs ${j.paidAmount} pehle mil chuke — bill is se kam nahi ho sakta`);
    }
    await this.prisma.serviceJob.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...who,
        ...(dto.customerAltPhone !== undefined && { customerAltPhone: blank(dto.customerAltPhone) ?? null }),
        ...(dto.customerEmail !== undefined && { customerEmail: blank(dto.customerEmail) ?? null }),
        ...(dto.customerType && { customerType: dto.customerType }),
        ...(dto.serviceId !== undefined && { serviceId: dto.serviceId || null }),
        ...(serviceName && { serviceName }),
        ...(dto.category && { category: dto.category }),
        ...(dto.priority && { priority: dto.priority }),
        ...(blank(dto.problemDescription) && { problemDescription: blank(dto.problemDescription) }),
        ...(dto.brand !== undefined && { brand: blank(dto.brand) ?? null }),
        ...(dto.modelNumber !== undefined && { modelNumber: blank(dto.modelNumber) ?? null }),
        ...(dto.serialNumber !== undefined && { serialNumber: blank(dto.serialNumber) ?? null }),
        ...(dto.underWarranty !== undefined && { underWarranty: dto.underWarranty }),
        ...(dto.locationType && { locationType: dto.locationType }),
        ...(dto.serviceAddress !== undefined && { serviceAddress: blank(dto.serviceAddress) ?? null }),
        ...(dto.city !== undefined && { city: blank(dto.city) ?? null }),
        ...(dto.area !== undefined && { area: blank(dto.area) ?? null }),
        ...(dto.landmark !== undefined && { landmark: blank(dto.landmark) ?? null }),
        ...(dto.scheduledStart !== undefined && { scheduledStart: start ?? null }),
        ...(dto.scheduledEnd !== undefined && { scheduledEnd: end ?? null }),
        ...(dto.preferredTimeSlot !== undefined && { preferredTimeSlot: blank(dto.preferredTimeSlot) ?? null }),
        ...(dto.advanceAmount !== undefined && { advanceAmount: r2(dto.advanceAmount), advanceRequired: dto.advanceAmount > 0 }),
        ...(dto.jobWarrantyDays !== undefined && { jobWarrantyDays: dto.jobWarrantyDays }),
        ...(dto.jobWarrantyTerms !== undefined && { jobWarrantyTerms: blank(dto.jobWarrantyTerms) ?? null }),
        ...(dto.technicianNotes !== undefined && { technicianNotes: blank(dto.technicianNotes) ?? null }),
        ...(dto.internalNotes !== undefined && { internalNotes: blank(dto.internalNotes) ?? null }),
        ...charges,
        totalCharge,
        paymentStatus: payStatus(j.paidAmount, totalCharge),
      },
    });
    return this.getOne(user, id);
  }

  // ─────────────────────────── reading ───────────────────────────

  private listWhere(user: AuthenticatedUser, q: ListJobsQuery): Prisma.ServiceJobWhereInput {
    const and: Prisma.ServiceJobWhereInput[] = [{ tenantId: user.tenantId }];
    if (q.shopId) and.push({ OR: [{ shopId: q.shopId }, { shopId: null }] });
    const now = new Date();
    switch (q.view) {
      case 'open': and.push({ status: { in: OPEN } }); break;
      case 'booked': and.push({ status: { in: BOOKED } }); break;
      case 'working': and.push({ status: { in: WORKING } }); break;
      case 'waiting': and.push({ status: { in: WAITING } }); break;
      case 'ready': and.push({ status: { in: READY } }); break;
      case 'late': and.push(this.lateWhere(now)); break;
      case 'unpaid': and.push({ status: 'COMPLETED', paymentStatus: { not: 'PAID' }, totalCharge: { gt: 0 } }); break;
      case 'closed': and.push({ status: { in: CLOSED } }); break;
      default: break;
    }
    if (q.status) and.push({ status: q.status });
    if (q.priority) and.push({ priority: q.priority });
    if (q.customerId) and.push({ customerId: q.customerId });
    if (q.technicianId) and.push({ OR: [{ primaryTechnicianId: q.technicianId }, { assistantTechnicianIds: { has: q.technicianId } }] });
    if (q.businessType) and.push({ businessType: q.businessType as Prisma.ServiceJobWhereInput['businessType'] });
    // Plain days (YYYY-MM-DD) are shop days; full timestamps are taken as given.
    const DAY = /^\d{4}-\d{2}-\d{2}$/;
    const range: Prisma.DateTimeFilter = {
      ...(q.from && { gte: DAY.test(q.from) ? dayRange(q.from, q.from).gte : new Date(q.from) }),
      ...(q.to && { lte: DAY.test(q.to) ? dayRange(q.to, q.to).lte : new Date(q.to) }),
    };
    if (range.gte || range.lte) and.push(q.view === 'closed' || q.view === 'unpaid' ? { OR: [{ completedAt: range }, { cancelledAt: range }] } : { createdAt: range });
    const s = q.search?.trim();
    if (s) {
      and.push({
        OR: [
          { jobNumber: { contains: s, mode: 'insensitive' } },
          { ticketNumber: { contains: s, mode: 'insensitive' } },
          { customerName: { contains: s, mode: 'insensitive' } },
          { customerPhone: { contains: s } },
          { serviceName: { contains: s, mode: 'insensitive' } },
          { brand: { contains: s, mode: 'insensitive' } },
          { modelNumber: { contains: s, mode: 'insensitive' } },
          { serialNumber: { contains: s, mode: 'insensitive' } },
          { area: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return { AND: and };
  }

  /** Open, not ready, and past the promised time (or the booked time if none was promised). */
  private lateWhere(now: Date): Prisma.ServiceJobWhereInput {
    return {
      status: { in: OPEN.filter((s) => !READY.includes(s)) },
      OR: [
        { scheduledEnd: { lt: now } },
        { scheduledEnd: null, scheduledStart: { lt: now }, status: { in: NOT_STARTED } },
      ],
    };
  }

  private isLate(j: { status: ServiceJobStatus; scheduledStart: Date | null; scheduledEnd: Date | null }, now = Date.now()) {
    if (!OPEN.includes(j.status) || READY.includes(j.status)) return false;
    if (j.scheduledEnd) return j.scheduledEnd.getTime() < now;
    return !!j.scheduledStart && j.scheduledStart.getTime() < now && NOT_STARTED.includes(j.status);
  }

  private async staffNames(tenantId: string, ids: Array<string | null>) {
    const want = [...new Set(ids.filter((x): x is string => !!x))];
    if (!want.length) return new Map<string, string>();
    const staff = await this.prisma.staff.findMany({ where: { tenantId, id: { in: want } }, select: { id: true, fullName: true } });
    return new Map(staff.map((s) => [s.id, s.fullName.trim()]));
  }

  /**
   * Without `page` the old shape (a plain array, 200 rows) is returned so
   * existing screens keep working; with `page` a page with totals.
   */
  async list(user: AuthenticatedUser, q: ListJobsQuery) {
    const where = this.listWhere(user, q);
    const orderBy: Prisma.ServiceJobOrderByWithRelationInput[] =
      q.sort === 'new' ? [{ createdAt: 'desc' }]
        : q.sort === 'old' ? [{ createdAt: 'asc' }]
          : q.sort === 'amount' ? [{ totalCharge: 'desc' }]
            : q.view === 'closed' || q.view === 'unpaid' ? [{ completedAt: { sort: 'desc', nulls: 'last' } }, { cancelledAt: 'desc' }]
              : [{ priority: 'desc' }, { scheduledStart: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }];
    if (!q.page) return this.prisma.serviceJob.findMany({ where, include: { parts: true }, orderBy, take: 200 });

    const limit = q.limit ?? 40;
    const [items, total, sums] = await Promise.all([
      this.prisma.serviceJob.findMany({ where, include: { parts: { take: 5 } }, orderBy, skip: (q.page - 1) * limit, take: limit }),
      this.prisma.serviceJob.count({ where }),
      this.prisma.serviceJob.aggregate({ where: { AND: [where, { status: { not: 'CANCELLED' } }] }, _sum: { totalCharge: true, paidAmount: true } }),
    ]);
    const [names, returned] = await Promise.all([
      this.staffNames(user.tenantId, items.map((j) => j.primaryTechnicianId)),
      this.returnedOn(user.tenantId, items.filter((j) => j.status === 'COMPLETED').map((j) => j.jobNumber)),
    ]);
    const bill = r2(sums._sum.totalCharge ?? 0);
    const paid = r2(sums._sum.paidAmount ?? 0);
    const now = Date.now();
    return {
      items: items.map((j) => ({
        ...j,
        technicianName: j.primaryTechnicianId ? names.get(j.primaryTechnicianId) ?? null : null,
        returned: returned.get(j.jobNumber) ?? 0,
        due: r2(Math.max(j.totalCharge - (returned.get(j.jobNumber) ?? 0) - j.paidAmount, 0)),
        isLate: this.isLate(j, now),
      })),
      total,
      page: q.page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      totals: { bill, paid, due: r2(Math.max(bill - paid, 0)) },
    };
  }

  /** Headline numbers for the jobs page and dashboard; money from the job bills. */
  async stats(user: AuthenticatedUser, shopId?: string) {
    const base: Prisma.ServiceJobWhereInput = { tenantId: user.tenantId, ...(shopId && { OR: [{ shopId }, { shopId: null }] }) };
    const now = new Date();
    const today = startOfDayTz(now);
    const tomorrow = addDaysTz(today, 1);
    const month = startOfMonthTz(now);
    const [byStatus, late, readyDue, todayIn, todayDone, todayBooked, monthDone, unpaid, urgent] = await Promise.all([
      this.prisma.serviceJob.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.serviceJob.count({ where: { AND: [base, this.lateWhere(now)] } }),
      this.prisma.serviceJob.aggregate({ where: { ...base, status: { in: READY } }, _sum: { totalCharge: true, paidAmount: true } }),
      this.prisma.serviceJob.count({ where: { ...base, createdAt: { gte: today } } }),
      this.prisma.serviceJob.count({ where: { ...base, status: 'COMPLETED', completedAt: { gte: today } } }),
      this.prisma.serviceJob.count({ where: { ...base, status: { in: OPEN }, scheduledStart: { gte: today, lt: tomorrow } } }),
      this.prisma.serviceJob.aggregate({
        where: { ...base, status: 'COMPLETED', completedAt: { gte: month } },
        _sum: { totalCharge: true, labourCharge: true, visitCharge: true, partsCharge: true }, _count: { _all: true },
      }),
      this.prisma.serviceJob.aggregate({ where: { ...base, status: 'COMPLETED', paymentStatus: { not: 'PAID' }, totalCharge: { gt: 0 } }, _sum: { totalCharge: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.serviceJob.count({ where: { ...base, status: { in: OPEN }, priority: { in: ['URGENT', 'EMERGENCY'] } } }),
    ]);
    const count = (list: ServiceJobStatus[]) => byStatus.filter((b) => list.includes(b.status)).reduce((s, b) => s + b._count._all, 0);
    return {
      open: count(OPEN),
      booked: count(BOOKED),
      unassigned: byStatus.filter((b) => b.status === 'CONFIRMED' || b.status === 'SCHEDULED').reduce((s, b) => s + b._count._all, 0),
      working: count(WORKING),
      onSite: count(['ARRIVED', 'IN_PROGRESS']),
      onTheWay: count(['DISPATCHED', 'EN_ROUTE']),
      waiting: count(WAITING),
      ready: count(READY),
      late,
      urgent,
      readyDue: r2(Math.max((readyDue._sum.totalCharge ?? 0) - (readyDue._sum.paidAmount ?? 0), 0)),
      todayIn,
      todayDone,
      todayBooked,
      monthDone: monthDone._count._all,
      monthRevenue: r2(monthDone._sum.totalCharge ?? 0),
      monthLabour: r2((monthDone._sum.labourCharge ?? 0) + (monthDone._sum.visitCharge ?? 0)),
      monthParts: r2(monthDone._sum.partsCharge ?? 0),
      unpaidJobs: unpaid._count._all,
      unpaidDue: r2(Math.max((unpaid._sum.totalCharge ?? 0) - (unpaid._sum.paidAmount ?? 0), 0)),
      byStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const j = await this.prisma.serviceJob.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { parts: { orderBy: { displayOrder: 'asc' } }, timeLog: { orderBy: { timestamp: 'desc' }, take: 50 }, statusHistory: { orderBy: { changedAt: 'desc' }, take: 50 } },
    });
    if (!j) throw new NotFoundException('Job nahi mili');
    const [customer, staff, profile, billSale, onKhata, amc, warrantyClaim] = await Promise.all([
      j.customerId ? this.prisma.customer.findFirst({ where: { id: j.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } }) : null,
      j.primaryTechnicianId ? this.prisma.staff.findFirst({ where: { id: j.primaryTechnicianId, tenantId: user.tenantId }, select: { id: true, fullName: true, phone: true } }) : null,
      j.primaryTechnicianId ? this.prisma.serviceTechnicianProfile.findFirst({ where: { staffId: j.primaryTechnicianId, tenantId: user.tenantId }, select: { id: true, level: true, status: true, commissionType: true, commissionPct: true, fixedPerJob: true } }) : null,
      this.findBill(this.prisma, user.tenantId, j.jobNumber),
      paidOnKhata(this.prisma as unknown as Tx, user.tenantId, j.jobNumber),
      j.amcId ? this.prisma.serviceAmc.findFirst({ where: { id: j.amcId, tenantId: user.tenantId }, select: { id: true, amcNumber: true, includesParts: true, includesLabour: true, visitsRemaining: true } }) : null,
      this.prisma.serviceWarrantyClaim.findFirst({ where: { tenantId: user.tenantId, newJobId: j.id }, select: { id: true, claimNumber: true } }),
    ]);
    const [assistants, returnedMap] = await Promise.all([
      this.staffNames(user.tenantId, j.assistantTechnicianIds),
      billSale ? this.returnedOn(user.tenantId, [j.jobNumber]) : new Map<string, number>(),
    ]);
    const returned = returnedMap.get(j.jobNumber) ?? 0;
    return {
      ...j,
      customer: customer ? { ...customer, balance: Number(customer.balance) } : null,
      technician: staff ? { staff, profile } : null,
      technicianName: staff?.fullName ?? null,
      assistantNames: j.assistantTechnicianIds.map((x) => assistants.get(x) ?? 'Technician'),
      billSale,
      returned,
      due: r2(Math.max(j.totalCharge - returned - j.paidAmount, 0)),
      advanceOnKhata: billSale ? 0 : onKhata,
      isLate: this.isLate(j),
      amc,
      warrantyClaim,
    };
  }

  /** Jobs behind the given bills (sales history marks). */
  async bySales(user: AuthenticatedUser, ids: string[]) {
    const want = ids.filter(Boolean).slice(0, 200);
    if (!want.length) return [];
    const sales = await this.prisma.sale.findMany({ where: { tenantId: user.tenantId, id: { in: want }, saleNumber: { startsWith: 'SVC-' } }, select: { id: true, saleNumber: true } });
    const numbers = new Map(sales.map((s) => [s.id, jobNumberOfBill(s.saleNumber)]));
    const jobNumbers = [...new Set([...numbers.values()].filter((x): x is string => !!x))];
    const amcNumbers = sales.filter((s) => s.saleNumber.startsWith('SVC-AMC-')).map((s) => s.saleNumber.slice(4));
    const [jobs, amcs] = await Promise.all([
      jobNumbers.length ? this.prisma.serviceJob.findMany({ where: { tenantId: user.tenantId, jobNumber: { in: jobNumbers } }, select: { id: true, jobNumber: true, serviceName: true } }) : [],
      amcNumbers.length ? this.prisma.serviceAmc.findMany({ where: { tenantId: user.tenantId, amcNumber: { in: amcNumbers } }, select: { id: true, amcNumber: true } }) : [],
    ]);
    const jobOf = new Map(jobs.map((j) => [j.jobNumber, j]));
    const amcOf = new Map(amcs.map((a) => [a.amcNumber, a]));
    type Mark = { saleId: string; kind: 'job' | 'amc'; id: string; number: string; label: string };
    return sales.flatMap((s): Mark[] => {
      const job = jobOf.get(numbers.get(s.id) ?? '');
      if (job) return [{ saleId: s.id, kind: 'job', id: job.id, number: job.jobNumber, label: job.serviceName }];
      const amc = amcOf.get(s.saleNumber.slice(4));
      return amc ? [{ saleId: s.id, kind: 'amc', id: amc.id, number: amc.amcNumber, label: 'AMC contract' }] : [];
    });
  }

  // ─────────────────────────── pipeline ───────────────────────────

  private async openJob(user: AuthenticatedUser, id: string) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId }, include: { parts: true } });
    if (!j) throw new NotFoundException('Job nahi mili');
    if (j.status === 'CANCELLED') throw new BadRequestException(`${j.jobNumber} cancel ho chuki — naya job banayein`);
    if (j.status === 'COMPLETED' && (await this.findBill(this.prisma, user.tenantId, j.jobNumber))) {
      throw new BadRequestException(`${j.jobNumber} ka bill ban chuka — badalna ho to pehle Sales se bill void karein`);
    }
    return j;
  }

  /** Technician goes busy on site and free again when none of their jobs is in progress. */
  private async syncTechnician(tx: Tx, tenantId: string, staffId: string | null) {
    if (!staffId) return;
    const busy = await tx.serviceJob.count({ where: { tenantId, primaryTechnicianId: staffId, status: { in: BUSY } } });
    await tx.serviceTechnicianProfile.updateMany({
      where: { tenantId, staffId, status: { in: busy ? ['AVAILABLE'] : ['ON_JOB'] } },
      data: { status: busy ? 'ON_JOB' : 'AVAILABLE' },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: JobStatusDto) {
    if (dto.status === 'CANCELLED') return this.cancel(user, id, dto.reason ?? '');
    const j = await this.openJob(user, id);
    if (j.status === dto.status) return this.getOne(user, id);
    // Finishing a job is its bill. Only a job with nothing left to pay closes from here;
    // otherwise the bill step takes the money (or puts it on khata knowingly).
    if (dto.status === 'COMPLETED') {
      if (r2(j.totalCharge - j.paidAmount) > 0.009) throw new BadRequestException(`Rs ${r2(j.totalCharge - j.paidAmount)} baqi hai — "Bill banayein" se paisa lein ya khata me likhein`);
      await this.bill(user, id, { paidAmount: 0 });
      return this.getOne(user, id);
    }
    const now = new Date();
    const stamp: Prisma.ServiceJobUpdateInput = {};
    if (dto.status === 'ASSIGNED') stamp.assignedAt = now;
    if (dto.status === 'DISPATCHED') stamp.dispatchedAt = now;
    if (dto.status === 'EN_ROUTE') stamp.enRouteAt = now;
    if (dto.status === 'ARRIVED') stamp.arrivedAt = now;
    if (dto.status === 'IN_PROGRESS') {
      if (!j.startedAt) stamp.startedAt = now;
      if (j.status === 'PAUSED') stamp.resumedAt = now;
    }
    if (dto.status === 'PAUSED') stamp.pausedAt = now;

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id }, data: { status: dto.status, ...stamp } });
      await tx.serviceJobStatusHistory.create({
        data: { jobId: id, fromStatus: j.status, toStatus: dto.status, changedBy: user.id, reason: blank(dto.reason), notes: blank(dto.notes) },
      });
      await tx.serviceJobTimeLog.create({
        data: { jobId: id, technicianId: j.primaryTechnicianId, action: dto.status, latitude: dto.lat, longitude: dto.lng, notes: blank(dto.notes) },
      });
      await this.syncTechnician(tx, user.tenantId, j.primaryTechnicianId);
    });
    return this.getOne(user, id);
  }

  async assignTechnician(user: AuthenticatedUser, id: string, dto: AssignJobDto) {
    const j = await this.openJob(user, id);
    await this.staffExists(user, [dto.primaryTechnicianId, ...(dto.assistantIds ?? [])]);
    const toAssigned = BOOKED.includes(j.status);
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({
        where: { id },
        data: {
          primaryTechnicianId: dto.primaryTechnicianId,
          assistantTechnicianIds: (dto.assistantIds ?? []).filter((x) => x !== dto.primaryTechnicianId),
          assignedAt: new Date(),
          ...(toAssigned && { status: 'ASSIGNED' }),
        },
      });
      const name = (await tx.staff.findFirst({ where: { id: dto.primaryTechnicianId, tenantId: user.tenantId }, select: { fullName: true } }))?.fullName;
      await tx.serviceJobStatusHistory.create({
        data: { jobId: id, fromStatus: j.status, toStatus: toAssigned ? 'ASSIGNED' : j.status, changedBy: user.id, reason: `Technician: ${name ?? '—'}` },
      });
      await this.syncTechnician(tx, user.tenantId, j.primaryTechnicianId);
      await this.syncTechnician(tx, user.tenantId, dto.primaryTechnicianId);
    });
    return this.getOne(user, id);
  }

  private async retotalParts(tx: Tx, jobId: string) {
    const job = await tx.serviceJob.findUniqueOrThrow({ where: { id: jobId }, include: { parts: true } });
    const partsCharge = this.partsCharge(job.parts);
    const totalCharge = jobTotal({ ...job, partsCharge });
    await tx.serviceJob.update({ where: { id: jobId }, data: { partsCharge, totalCharge, paymentStatus: payStatus(job.paidAmount, totalCharge) } });
  }

  async addPart(user: AuthenticatedUser, id: string, dto: JobPartDto) {
    const j = await this.openJob(user, id);
    const [row] = await this.partRows(user, [dto]);
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJobPart.create({ data: { ...row, jobId: id, displayOrder: j.parts.length } });
      await this.retotalParts(tx, id);
    });
    return this.getOne(user, id);
  }

  /** Takes a part off a job that is not billed yet (no stock has left for it). */
  async removePart(user: AuthenticatedUser, jobId: string, partId: string) {
    const j = await this.openJob(user, jobId);
    const part = j.parts.find((p) => p.id === partId);
    if (!part) throw new NotFoundException('Part nahi mila');
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJobPart.delete({ where: { id: partId } });
      await this.retotalParts(tx, jobId);
      const after = await tx.serviceJob.findUniqueOrThrow({ where: { id: jobId }, select: { totalCharge: true, paidAmount: true } });
      if (after.paidAmount > after.totalCharge + 0.01 && after.totalCharge > 0) {
        throw new BadRequestException(`Rs ${after.paidAmount} pehle mil chuke — part hatane se bill is se kam ho jata`);
      }
    });
    return this.getOne(user, jobId);
  }

  // ─────────────────────────── money ───────────────────────────

  /**
   * Money taken outside the final bill. Before the bill it is an advance held
   * on the customer's khata; after the bill it pays off udhaar. Either way
   * the day book and cash register see it on the day it came in.
   */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, _isAdvance = false, paymentMethod?: string) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job nahi mili');
    if (j.status === 'CANCELLED') throw new BadRequestException('Cancel job par payment nahi li ja sakti');
    const value = r2(amount);
    if (!(value > 0)) throw new BadRequestException('Amount sahi likhein');
    const billed = await this.findBill(this.prisma, user.tenantId, j.jobNumber);
    const remaining = r2(j.totalCharge - j.paidAmount);
    if (billed && remaining <= 0.009) throw new BadRequestException('Is job par kuch baqi nahi');
    if (j.totalCharge > 0 && value > remaining + 0.01) throw new BadRequestException(`Baqi sirf Rs ${Math.max(remaining, 0)} hai`);

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`service-job:${id}`}))::text`;
      const fresh = await tx.serviceJob.findUniqueOrThrow({ where: { id } });
      if (j.totalCharge > 0 && value > r2(fresh.totalCharge - fresh.paidAmount) + 0.01) throw new BadRequestException('Ye payment abhi kisi aur ne le li — page refresh karein');
      const shopId = await resolveIndustryShopId(tx, user, fresh.shopId);
      const customerId = await ensureCustomer(tx, user, { customerId: fresh.customerId, name: fresh.customerName, phone: fresh.customerPhone, shopId });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount: value, reference: fresh.jobNumber,
        note: `${billed ? 'Job baqi wusooli' : 'Job advance'}: ${fresh.jobNumber}`, method: paymentMethod,
      });
      const paid = r2(fresh.paidAmount + value);
      await tx.serviceJob.update({
        where: { id },
        data: {
          customerId, shopId, paidAmount: paid,
          ...(!billed && { advanceCollected: r2(fresh.advanceCollected + value) }),
          paymentStatus: payStatus(paid, fresh.totalCharge),
        },
      });
    }, TX);
    return this.getOne(user, id);
  }

  /** Bill lines of a job, with shelf parts linked to their product and costed from it. */
  private async billLines(tx: Tx, user: AuthenticatedUser, j: Prisma.ServiceJobGetPayload<{ include: { parts: true } }>) {
    const shelfIds = [...new Set(j.parts.filter((p) => p.productId && !p.isCustomerSupplied).map((p) => p.productId!))];
    const products = shelfIds.length
      ? await tx.product.findMany({ where: { tenantId: user.tenantId, id: { in: shelfIds } }, select: { id: true, name: true, costPrice: true, productType: true, unit: true } })
      : [];
    const productOf = new Map(products.map((p) => [p.id, p]));
    const serviceProduct = j.serviceId ? (await serviceProductIds(tx, user.tenantId, [j.serviceId])).get(j.serviceId) : undefined;
    const name = j.serviceName || 'Service';
    const partLines: IndustrySaleLine[] = j.parts.map((p) => {
      const prod = p.productId && !p.isCustomerSupplied ? productOf.get(p.productId) : undefined;
      return {
        label: `${p.partName}${p.isUnderWarranty ? ' (warranty)' : ''}${p.isCustomerSupplied ? ' — customer ka apna' : ''}`,
        amount: p.isUnderWarranty ? 0 : r2(p.total),
        // A shelf part costs the shop its product cost even when free to the customer.
        // A part bought outside is paid as an expense, so it adds no cost here.
        cost: prod ? r2((Number(prod.costPrice) || 0) * p.quantity) : 0,
        quantity: p.quantity,
        ...(prod && { productId: prod.id }),
      };
    });
    const lines: IndustrySaleLine[] = [
      { label: `${name} — visit`, amount: r2(j.visitCharge) },
      { label: `${name} — kaam`, amount: r2(j.labourCharge), ...(serviceProduct && { productId: serviceProduct }) },
      ...partLines,
      { label: 'Transport', amount: r2(j.transportCharge) },
      { label: 'Emergency charge', amount: r2(j.emergencyCharge) },
      { label: 'Tax', amount: r2(j.taxAmount) },
    ];
    // Charges kept only as a total (parts from an older quote) get their own line.
    const partsRows = r2(partLines.reduce((a, l) => a + l.amount, 0));
    if (j.partsCharge - partsRows > 0.01) lines.push({ label: 'Parts', amount: r2(j.partsCharge - partsRows) });
    return { lines, products: productOf };
  }

  /**
   * Final bill for a job: one sale with visit, work, parts and other charges.
   * Advances already on khata are used first; money taken now is
   * `paidAmount` (or the split `payments`); anything still owed becomes the
   * customer's udhaar. Shelf parts leave stock now.
   */
  async bill(user: AuthenticatedUser, id: string, dto: BillJobDto) {
    const first = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!first) throw new NotFoundException('Job nahi mili');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`service-job:${id}`}))::text`;
      const j = await tx.serviceJob.findUniqueOrThrow({ where: { id }, include: { parts: true } });
      if (j.status === 'CANCELLED') throw new BadRequestException('Cancel job ka bill nahi banta');
      if (await this.findBill(tx, user.tenantId, j.jobNumber)) throw new BadRequestException(`${j.jobNumber} ka bill pehle hi ban chuka hai`);

      const total = r2(j.totalCharge);
      const advance = r2(j.paidAmount);
      const due = r2(Math.max(total - advance, 0));
      const parts = (dto.payments ?? []).filter((p) => p.amount > 0);
      const method = toPaymentMethod(dto.paymentMethod ?? parts[0]?.method);
      // What the customer handed over now; change comes off the cash.
      const tender = splitTender(due, parts.length > 1
        ? { parts: parts.map((p) => ({ method: p.method as PaymentMethod, amount: p.amount, reference: p.reference })), method, paidAmount: 0 }
        : { method: parts[0] ? toPaymentMethod(parts[0].method) : method, paidAmount: parts[0]?.amount ?? dto.paidAmount ?? 0 });
      const kept = r2(tender.paidAmount - tender.changeAmount);

      const shopId = await resolveIndustryShopId(tx, user, dto.shopId ?? j.shopId);
      const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, j.jobNumber)), 0));
      const stillOwed = r2(due - kept);
      let customerId = j.customerId;
      if (!customerId && stillOwed > 0.009) {
        if (!j.customerName?.trim() && !j.customerPhone?.trim()) {
          throw new BadRequestException(`Rs ${stillOwed} baqi hai — poori amount lein, ya udhaar ke liye customer jorein`);
        }
        customerId = await ensureCustomer(tx, user, { name: j.customerName ?? j.customerPhone, phone: j.customerPhone, shopId });
      }

      const { lines, products } = await this.billLines(tx, user, j);
      const linesTotal = r2(lines.reduce((a, l) => a + Math.max(l.amount, 0), 0));
      const hasMoney = lines.some((l) => l.amount > 0 || (l.cost ?? 0) > 0);
      if (!hasMoney && kept > 0) throw new BadRequestException('Is job ka koi bill nahi — paisa na lein');

      let sale: { id: string; saleNumber: string } | null = null;
      if (hasMoney) {
        const round = 1 + await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: jobBillPrefix(j.jobNumber) }, status: 'VOIDED' } });
        const posted = await postIndustrySale(tx, user, {
          saleNumber: jobBillNumber(j.jobNumber, round),
          sourceRef: [j.jobNumber, j.serviceName, j.brand, j.modelNumber].filter(Boolean).join(' · '),
          shopId,
          customerId,
          lines,
          discount: r2(Math.max(linesTotal - total, 0)),
          paidAmount: r2(kept + legacyPaid),
          paymentMethod: tender.mainMethod,
        });
        // Split payment: the helper wrote one row for the main method; store the real parts.
        const moneyRows = tender.rows.filter((p) => p.method !== 'TRADE_IN');
        if (moneyRows.length > 1 && legacyPaid <= 0.009) {
          const row = await tx.salePayment.findFirst({ where: { saleId: posted.id, method: { not: 'TRADE_IN' } }, orderBy: { createdAt: 'asc' }, select: { id: true } });
          if (row) {
            await tx.salePayment.update({ where: { id: row.id }, data: { method: moneyRows[0].method, amount: moneyRows[0].amount, reference: moneyRows[0].reference ?? null } });
            await saveSalePayments(tx, posted, moneyRows.slice(1));
          }
        }
        sale = { id: posted.id, saleNumber: posted.saleNumber };

        // Shelf parts leave stock with the bill.
        const settings = await tx.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } });
        for (const p of j.parts) {
          const prod = p.productId && !p.isCustomerSupplied ? products.get(p.productId) : undefined;
          if (!prod || isServiceProduct(prod)) continue;
          await applyStockDelta({
            tx, tenantId: user.tenantId, shopId, productId: prod.id, delta: -p.quantity, movementType: 'SALE_OUT',
            reference: posted.saleNumber, note: `Job ${j.jobNumber} me laga`, preventNegative: !settings?.allowNegativeStock, label: prod.name, userId: user.id,
          });
        }
      }

      const paidTotal = r2(advance + kept);
      const now = new Date();
      const days = dto.jobWarrantyDays ?? j.jobWarrantyDays;
      await tx.serviceJob.update({
        where: { id },
        data: {
          customerId, shopId, paidAmount: paidTotal, paymentStatus: payStatus(paidTotal, total),
          status: 'COMPLETED', completedAt: now, jobWarrantyDays: days,
          jobWarrantyExpiryDate: days > 0 ? addDaysTz(now, days) : null,
        },
      });
      await tx.serviceJobStatusHistory.create({
        data: { jobId: id, fromStatus: j.status, toStatus: 'COMPLETED', changedBy: user.id, reason: sale ? `Bill ${sale.saleNumber}` : 'Bill (koi amount nahi)' },
      });
      if (j.serviceId) {
        await tx.serviceCatalog.updateMany({ where: { id: j.serviceId, tenantId: user.tenantId }, data: { totalJobs: { increment: 1 }, totalRevenue: { increment: total } } });
      }
      if (j.primaryTechnicianId) {
        await tx.serviceTechnicianProfile.updateMany({
          where: { tenantId: user.tenantId, staffId: j.primaryTechnicianId },
          data: { totalJobs: { increment: 1 }, completedJobs: { increment: 1 }, totalRevenue: { increment: total } },
        });
        await this.syncTechnician(tx, user.tenantId, j.primaryTechnicianId);
      }
      if (j.amcId && j.category === 'AMC_VISIT') {
        const done = await tx.serviceAmcVisit.updateMany({ where: { amcId: j.amcId, serviceJobId: j.id, status: { not: 'COMPLETED' } }, data: { status: 'COMPLETED', completedAt: now, technicianId: j.primaryTechnicianId } });
        if (done.count) {
          const amc = await tx.serviceAmc.findFirst({ where: { id: j.amcId, tenantId: user.tenantId }, select: { visitsRemaining: true } });
          if (amc) await tx.serviceAmc.update({ where: { id: j.amcId }, data: { visitsUsed: { increment: done.count }, visitsRemaining: Math.max(amc.visitsRemaining - done.count, 0) } });
        }
      }
      // A warranty job is resolved with its bill; what the shop spent on it is the claim's cost.
      await tx.serviceWarrantyClaim.updateMany({
        where: { tenantId: user.tenantId, newJobId: j.id, status: { in: ['APPROVED', 'IN_PROGRESS'] } },
        data: { status: 'RESOLVED', costToCompany: r2(lines.reduce((a, l) => a + (l.cost ?? 0), 0)) },
      });
      return { sale, change: tender.changeAmount };
    }, TX);
    return { ...(await this.getOne(user, id)), sale: result.sale, change: result.change };
  }

  /**
   * Counter sale of catalogue services without a job card. Kept for older
   * screens; the counter now sells services through the shared POS.
   */
  async counterSale(user: AuthenticatedUser, dto: CounterSaleDto) {
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

  /** The job's live bill: the latest SVC- bill of the job that is not voided. */
  private findBill(db: Tx | PrismaService, tenantId: string, jobNumber: string) {
    return db.sale.findFirst({
      where: { tenantId, status: { not: 'VOIDED' }, OR: [{ saleNumber: jobBillPrefix(jobNumber) }, { saleNumber: { startsWith: `${jobBillPrefix(jobNumber)}-` } }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, createdAt: true },
    });
  }

  /**
   * The job's bill was voided at the counter. The job goes back to "ready"
   * with its parts on it, money taken with the bill is gone with the void,
   * advances stay on the khata, and a new bill is made when it is billed again.
   */
  async reopenAfterVoid(tenantId: string, saleId: string) {
    try {
      const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { id: true, saleNumber: true, status: true, total: true } });
      if (!sale || sale.status !== 'VOIDED') return null;
      const jobNumber = jobNumberOfBill(sale.saleNumber);
      if (!jobNumber) return null;
      const job = await this.prisma.serviceJob.findFirst({ where: { tenantId, jobNumber } });
      if (!job || job.status !== 'COMPLETED') return null;
      const voidBy = await this.prisma.activityLog.findFirst({
        where: { tenantId, action: 'SALE_VOIDED', entityType: 'Sale', entityId: sale.id }, orderBy: { createdAt: 'desc' }, select: { userId: true },
      });
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`service-job:${job.id}`}))::text`;
        const fresh = await tx.serviceJob.findUniqueOrThrow({ where: { id: job.id } });
        if (fresh.status !== 'COMPLETED' || (await this.findBill(tx, tenantId, jobNumber))) return null;
        const onKhata = await paidOnKhata(tx, tenantId, jobNumber);
        const paid = r2(Math.min(onKhata, fresh.totalCharge || onKhata));
        await tx.serviceJob.update({
          where: { id: job.id },
          data: { status: 'QUALITY_CHECK', completedAt: null, jobWarrantyExpiryDate: null, paidAmount: paid, paymentStatus: payStatus(paid, fresh.totalCharge) },
        });
        await tx.serviceJobStatusHistory.create({
          data: { jobId: job.id, fromStatus: 'COMPLETED', toStatus: 'QUALITY_CHECK', changedBy: voidBy?.userId ?? null, reason: `Bill ${sale.saleNumber} void hua — job dobara khuli, theek kar ke dobara bill banayein` },
        });
        if (fresh.serviceId) {
          await tx.serviceCatalog.updateMany({ where: { id: fresh.serviceId, tenantId, totalJobs: { gt: 0 } }, data: { totalJobs: { decrement: 1 }, totalRevenue: { decrement: Number(sale.total) || 0 } } });
        }
        if (fresh.amcId && fresh.category === 'AMC_VISIT') {
          const undone = await tx.serviceAmcVisit.updateMany({ where: { amcId: fresh.amcId, serviceJobId: fresh.id, status: 'COMPLETED' }, data: { status: 'SCHEDULED', completedAt: null } });
          if (undone.count) await tx.serviceAmc.updateMany({ where: { id: fresh.amcId, tenantId, visitsUsed: { gte: undone.count } }, data: { visitsUsed: { decrement: undone.count }, visitsRemaining: { increment: undone.count } } });
        }
        await tx.serviceWarrantyClaim.updateMany({ where: { tenantId, newJobId: fresh.id, status: 'RESOLVED' }, data: { status: 'IN_PROGRESS', costToCompany: 0 } });
        if (fresh.primaryTechnicianId) {
          await tx.serviceTechnicianProfile.updateMany({
            where: { tenantId, staffId: fresh.primaryTechnicianId, completedJobs: { gt: 0 } },
            data: { totalJobs: { decrement: 1 }, completedJobs: { decrement: 1 }, totalRevenue: { decrement: Number(sale.total) || 0 } },
          });
        }
        return { jobId: job.id };
      }, TX);
    } catch (e) {
      this.log.warn(`Voided bill ${saleId} not applied to its job: ${(e as Error).message}`);
      return null;
    }
  }

  // ─────────────────────────── other ───────────────────────────

  async submitRating(user: AuthenticatedUser, id: string, dto: RatingDto) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, primaryTechnicianId: true } });
    if (!j) throw new NotFoundException('Job nahi mili');
    await this.prisma.serviceJob.update({
      where: { id },
      data: { customerRating: dto.rating, customerFeedback: blank(dto.feedback), wouldRecommend: dto.wouldRecommend, customerSatisfaction: blank(dto.satisfaction) },
    });
    if (j.primaryTechnicianId) {
      const agg = await this.prisma.serviceJob.aggregate({ where: { tenantId: user.tenantId, primaryTechnicianId: j.primaryTechnicianId, customerRating: { not: null } }, _avg: { customerRating: true }, _count: { customerRating: true } });
      await this.prisma.serviceTechnicianProfile.updateMany({
        where: { tenantId: user.tenantId, staffId: j.primaryTechnicianId },
        data: { avgRating: agg._avg.customerRating ?? null, totalReviews: agg._count.customerRating },
      });
    }
    return this.getOne(user, id);
  }

  async uploadCompletionSignature(user: AuthenticatedUser, id: string, signatureUrl: string) {
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!j) throw new NotFoundException('Job nahi mili');
    return this.prisma.serviceJob.update({ where: { id }, data: { workCompletionSignatureUrl: signatureUrl } });
  }

  async addPhotos(user: AuthenticatedUser, id: string, stage: string, urls: string[]) {
    if (!['before', 'during', 'after'].includes(stage)) throw new BadRequestException('Photo ka marhala sahi nahi');
    const j = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job nahi mili');
    const key = stage === 'before' ? 'beforePhotoUrls' : stage === 'during' ? 'duringPhotoUrls' : 'afterPhotoUrls';
    return this.prisma.serviceJob.update({ where: { id }, data: { [key]: [...j[key], ...urls].slice(-30) }, include: { parts: true } });
  }

  /** A free follow-up visit for a finished job (complaint after the work). */
  async createReturnVisit(user: AuthenticatedUser, id: string, dto: ReturnVisitDto) {
    const parent = await this.prisma.serviceJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!parent) throw new NotFoundException('Job nahi mili');
    if (parent.status === 'CANCELLED') throw new BadRequestException('Cancel job ki wapsi visit nahi banti');
    const when = new Date(dto.returnVisitDate);
    const childId = await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id }, data: { needsReturnVisit: true, returnVisitReason: dto.reason.trim(), returnVisitDate: when } });
      const jobNumber = await nextJobNumber(tx, user.tenantId);
      const child = await tx.serviceJob.create({
        data: {
          tenantId: user.tenantId, shopId: parent.shopId, jobNumber,
          customerId: parent.customerId, customerName: parent.customerName, customerPhone: parent.customerPhone,
          serviceId: parent.serviceId, serviceName: `${parent.serviceName} — wapsi visit`, category: 'RETURN_VISIT', businessType: parent.businessType,
          priority: parent.priority, status: 'SCHEDULED', problemDescription: dto.reason.trim(),
          brand: parent.brand, modelNumber: parent.modelNumber, serialNumber: parent.serialNumber,
          locationType: parent.locationType, serviceAddress: parent.serviceAddress, city: parent.city, area: parent.area,
          scheduledStart: when, primaryTechnicianId: parent.primaryTechnicianId, parentJobId: parent.id, underWarranty: true, totalCharge: 0,
          createdById: user.id,
          statusHistory: { create: [{ toStatus: 'SCHEDULED', changedBy: user.id, reason: `Wapsi visit — job ${parent.jobNumber}` }] },
        },
        select: { id: true },
      });
      return child.id;
    }, TX);
    return this.getOne(user, childId);
  }

  /** Cancels an open job; money taken stays on the customer's khata as advance. */
  async cancel(user: AuthenticatedUser, id: string, reason: string) {
    if (!reason?.trim() || reason.trim().length < 3) throw new BadRequestException('Cancel ki wajah likhein');
    const j = await this.openJob(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason.trim() } });
      await tx.serviceJobStatusHistory.create({ data: { jobId: id, fromStatus: j.status, toStatus: 'CANCELLED', changedBy: user.id, reason: reason.trim() } });
      if (j.primaryTechnicianId) {
        await tx.serviceTechnicianProfile.updateMany({ where: { tenantId: user.tenantId, staffId: j.primaryTechnicianId }, data: { cancelledJobs: { increment: 1 } } });
        await this.syncTechnician(tx, user.tenantId, j.primaryTechnicianId);
      }
    });
    return this.getOne(user, id);
  }

  async summary(user: AuthenticatedUser, from?: string, to?: string) {
    const where: Prisma.ServiceJobWhereInput = { tenantId: user.tenantId };
    if (from || to) where.createdAt = { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) };
    const [total, byStatus, revenue, avgRating] = await Promise.all([
      this.prisma.serviceJob.count({ where }),
      this.prisma.serviceJob.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.serviceJob.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { totalCharge: true, paidAmount: true, labourCharge: true, partsCharge: true } }),
      this.prisma.serviceJob.aggregate({ where: { ...where, customerRating: { not: null } }, _avg: { customerRating: true } }),
    ]);
    return { total, byStatus, revenue: revenue._sum, avgRating: avgRating._avg.customerRating };
  }
}
