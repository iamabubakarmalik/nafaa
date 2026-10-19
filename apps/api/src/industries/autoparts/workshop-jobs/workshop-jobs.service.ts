import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { Prisma, type JobPriority, type JobStatus, type JobType } from '@prisma/client';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { applyStockDelta, isServiceProduct } from '../../../common/shop-scope';
import { startOfDayTz, startOfMonthTz, tzParts } from '../../../common/helpers/business-time.helper';
import {
  AddPaymentDto, CreateWorkshopJobDto, DeliverJobDto, ExternalWorkDto, LaborItemDto, ListJobsQuery, PartItemDto,
  SetWarrantyDto, UpdateJobStatusDto, UpdateWorkshopJobDto,
} from './dto/create-workshop-job.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { coreCode, recordCore } from '../core-returns/core-returns.service';
import {
  ensureCustomer, postIndustrySale, recordKhataPayment, resolveIndustryShopId, toPaymentMethod, type IndustrySaleLine,
} from '../../_shared/industry-sale.helper';

type Tx = Prisma.TransactionClient;

type HeldCore = { id: string; value: number; description: string };

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
/** Bill number for a job. A job billed again after its bill was voided gets -2, -3… */
const jobSaleNumber = (jobNumber: string, round = 1) => `WSJ-${jobNumber}${round > 1 ? `-${round}` : ''}`;

const CLOSED: JobStatus[] = ['DELIVERED', 'CANCELLED'];
const WORKING: JobStatus[] = ['APPROVED', 'IN_PROGRESS'];
const WAITING: JobStatus[] = ['WAITING_PARTS', 'WAITING_APPROVAL', 'ON_HOLD'];
const READY: JobStatus[] = ['READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED'];
const OPEN: JobStatus[] = ['DRAFT', 'QUOTED', ...WORKING, ...WAITING, ...READY];

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
const regNo = (v?: string | null) => blank(v)?.toUpperCase().replace(/\s+/g, ' ');
const payStatus = (paid: number, total: number) => (paid >= total - 0.01 && total > 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

const JOB_INCLUDE = {
  laborItems: { orderBy: { displayOrder: 'asc' } },
  partsUsed: { orderBy: { displayOrder: 'asc' } },
  externalWork: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { paidAt: 'desc' } },
  statusLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
} satisfies Prisma.WorkshopJobInclude;

@Injectable()
export class WorkshopJobsService implements OnModuleInit {
  private readonly log = new Logger(WorkshopJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  /** A voided job bill reopens the job, so it can be corrected and billed again. */
  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.reopenAfterVoid(tenantId, saleId).then(() => undefined));
  }

  // ─────────────────────────── totals ───────────────────────────

  private computeTotals(labor: Array<{ total: number }>, parts: Array<{ total: number }>, external: Array<{ total: number }>, discount: number, tax: number) {
    const laborTotal = r2(labor.reduce((s, l) => s + Number(l.total || 0), 0));
    const partsTotal = r2(parts.reduce((s, p) => s + Number(p.total || 0), 0));
    const externalTotal = r2(external.reduce((s, e) => s + Number(e.total || 0), 0));
    const subtotal = r2(laborTotal + partsTotal + externalTotal);
    if (r2(discount) > subtotal + r2(tax) + 0.001) throw new BadRequestException(`Discount bill (Rs ${r2(subtotal + tax)}) se zyada nahi ho sakta`);
    const total = r2(Math.max(subtotal + r2(tax) - r2(discount), 0));
    return { laborTotal, partsTotal, externalTotal, subtotal, total };
  }

  /** Re-derives the job's money after a line changes. */
  private async retotal(tx: Tx, jobId: string) {
    const job = await tx.workshopJob.findUniqueOrThrow({ where: { id: jobId }, include: { laborItems: true, partsUsed: true, externalWork: true } });
    const t = this.computeTotals(job.laborItems, job.partsUsed, job.externalWork, job.discount, job.taxAmount);
    await tx.workshopJob.update({ where: { id: jobId }, data: { ...t, paymentStatus: payStatus(job.paidAmount, t.total) } });
  }

  private laborRow(l: LaborItemDto, i: number) {
    const hours = l.hours ?? 1;
    const rate = l.ratePerHour ?? 0;
    return {
      description: l.description.trim(), jobType: l.jobType, mechanicId: blank(l.mechanicId), mechanicName: blank(l.mechanicName),
      hours, ratePerHour: rate, total: r2(hours * rate), notes: blank(l.notes), displayOrder: i,
    };
  }

  private externalRow(e: ExternalWorkDto) {
    return {
      description: e.description.trim(), vendorName: blank(e.vendorName), vendorPhone: blank(e.vendorPhone),
      cost: r2(e.cost ?? 0), markup: r2(e.markup ?? 0), total: r2((e.cost ?? 0) + (e.markup ?? 0)), notes: blank(e.notes),
    };
  }

  private assertOpen(job: { status: JobStatus; jobNumber: string }) {
    if (job.status === 'DELIVERED') throw new BadRequestException(`${job.jobNumber} ki gaari di ja chuki aur bill ban gaya — ab job nahi badalti`);
    if (job.status === 'CANCELLED') throw new BadRequestException(`${job.jobNumber} cancel ho chuki — naya job banayein`);
  }

  private async mechanicName(tx: Tx | PrismaService, tenantId: string, mechanicId?: string) {
    if (!mechanicId) return undefined;
    const m = await tx.mechanicProfile.findFirst({ where: { id: mechanicId, tenantId, isActive: true }, select: { staffId: true } });
    if (!m) throw new NotFoundException('Mechanic nahi mila');
    const s = await tx.staff.findFirst({ where: { id: m.staffId, tenantId }, select: { fullName: true } });
    return s?.fullName?.trim() || undefined;
  }

  /**
   * A part from the shop's shelf leaves stock as soon as it goes on the job
   * (it is fitted in the vehicle). `installedAt` marks that the stock was
   * taken; parts added before this rule are taken at delivery instead.
   */
  private async takePart(tx: Tx, user: AuthenticatedUser, job: { jobNumber: string; shopId: string | null }, shopId: string, p: PartItemDto, label: string) {
    const product = await tx.product.findFirst({
      where: { id: p.productId, tenantId: user.tenantId },
      select: { id: true, name: true, costPrice: true, productType: true, unit: true },
    });
    if (!product) throw new NotFoundException(`"${label}" ka product nahi mila`);
    if (p.variantId && !(await tx.productVariant.findFirst({ where: { id: p.variantId, productId: product.id }, select: { id: true } }))) {
      throw new NotFoundException(`"${label}" ka size/variant nahi mila`);
    }
    if (p.isCustomerSupplied || isServiceProduct(product)) return { taken: false, product };
    const settings = await tx.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } });
    await applyStockDelta({
      tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: p.variantId ?? null,
      delta: -(p.quantity ?? 1), movementType: 'SALE_OUT', reference: job.jobNumber,
      note: `Workshop job ${job.jobNumber} me laga`, preventNegative: !settings?.allowNegativeStock, label: product.name,
      userId: user.id,
    });
    return { taken: true, product };
  }

  /** Puts a fitted part back on the shelf (removed from the job, or the job cancelled). */
  private async returnPart(tx: Tx, user: AuthenticatedUser, job: { jobNumber: string }, shopId: string, part: { productId: string | null; variantId: string | null; quantity: number; installedAt: Date | null; isCustomerSupplied: boolean }, note: string) {
    if (!part.productId || !part.installedAt || part.isCustomerSupplied) return;
    await applyStockDelta({
      tx, tenantId: user.tenantId, shopId, productId: part.productId, variantId: part.variantId ?? null,
      delta: part.quantity, movementType: 'RETURN_IN', reference: job.jobNumber, note, userId: user.id,
    });
  }

  // ─────────────────────────── create ───────────────────────────

  async create(user: AuthenticatedUser, input: CreateWorkshopJobDto) {
    const dto: CreateWorkshopJobDto = {
      ...input,
      vehicleId: blank(input.vehicleId),
      customerId: blank(input.customerId),
      primaryMechanicId: blank(input.primaryMechanicId),
      shopId: blank(input.shopId),
      promisedAt: blank(input.promisedAt),
      registrationNumber: regNo(input.registrationNumber),
      customerName: blank(input.customerName),
      customerPhone: blank(input.customerPhone),
    };
    if (!dto.vehicleId && !dto.registrationNumber) throw new BadRequestException('Gaari ka number likhein');
    const promised = dto.promisedAt ? new Date(dto.promisedAt) : null;
    if (promised && Number.isNaN(promised.getTime())) throw new BadRequestException('Gaari dene ka waqt sahi likhein');
    const advance = r2(dto.advance ?? 0);
    if (advance > 0 && !dto.customerId && !dto.customerName && !dto.vehicleId) {
      throw new BadRequestException('Advance ke liye customer ka naam likhein');
    }

    const year = tzParts(new Date()).year;
    const prefix = `JOB-${year}-`;

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId);

      // The vehicle: a known one, the same number already on file, or a new record for its history.
      let vehicle = dto.vehicleId
        ? await tx.customerVehicle.findFirst({ where: { id: dto.vehicleId, tenantId: user.tenantId } })
        : await tx.customerVehicle.findFirst({ where: { tenantId: user.tenantId, registrationNumber: { equals: dto.registrationNumber!, mode: 'insensitive' } } });
      if (dto.vehicleId && !vehicle) throw new NotFoundException('Gaari nahi mili');

      let customerId = dto.customerId ?? (vehicle?.customerId || undefined);
      if (customerId && !(await tx.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } }))) {
        if (dto.customerId) throw new NotFoundException('Customer nahi mila');
        customerId = undefined;
      }
      const name = dto.customerName ?? vehicle?.ownerName ?? undefined;
      const phone = dto.customerPhone ?? vehicle?.ownerPhone ?? undefined;
      if (!customerId && (name || phone) && (advance > 0 || name)) {
        customerId = await ensureCustomer(tx, user, { name: name ?? phone, phone, shopId });
      }

      if (!vehicle && dto.registrationNumber) {
        vehicle = await tx.customerVehicle.create({
          data: {
            tenantId: user.tenantId, customerId: customerId ?? '', registrationNumber: dto.registrationNumber,
            makeName: blank(dto.makeName), modelName: blank(dto.modelName), year: dto.year, odometerKm: dto.odometerKm,
            ownerName: name, ownerPhone: phone,
          },
        });
      } else if (vehicle && customerId && !vehicle.customerId) {
        await tx.customerVehicle.update({ where: { id: vehicle.id }, data: { customerId } });
      }

      const mechanicName = await this.mechanicName(tx, user.tenantId, dto.primaryMechanicId);
      const labor = (dto.laborItems ?? []).map((l, i) => this.laborRow({ ...l, mechanicId: l.mechanicId ?? dto.primaryMechanicId, mechanicName: l.mechanicName ?? mechanicName }, i));
      const external = (dto.externalWork ?? []).map((e) => this.externalRow(e));

      const job = await createWithDocNumber({
        prefix,
        width: 4,
        existing: async () => (await tx.workshopJob.findMany({
          where: { tenantId: user.tenantId, jobNumber: { startsWith: prefix } },
          select: { jobNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
        })).map((j) => j.jobNumber),
        create: (jobNumber) => tx.workshopJob.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            jobNumber,
            status: 'DRAFT',
            priority: dto.priority ?? 'NORMAL',
            jobType: dto.jobType ?? 'GENERAL_SERVICE',
            vehicleId: vehicle?.id,
            registrationNumber: vehicle?.registrationNumber ?? dto.registrationNumber,
            makeName: vehicle?.makeName ?? blank(dto.makeName),
            modelName: vehicle?.modelName ?? blank(dto.modelName),
            year: vehicle?.year ?? dto.year,
            odometerKm: dto.odometerKm,
            customerId,
            customerName: name,
            customerPhone: phone,
            customerComplaint: blank(dto.customerComplaint),
            diagnosis: blank(dto.diagnosis),
            workDescription: blank(dto.workDescription),
            recommendations: blank(dto.recommendations),
            primaryMechanicId: dto.primaryMechanicId,
            assistantMechanicIds: dto.assistantMechanicIds ?? [],
            bayNumber: blank(dto.bayNumber),
            promisedAt: promised,
            fuelLevel: blank(dto.fuelLevel),
            hasSpareTire: dto.hasSpareTire ?? false,
            hasToolkit: dto.hasToolkit ?? false,
            externalDamages: blank(dto.externalDamages),
            inspectionImageUrls: dto.inspectionImageUrls ?? [],
            discount: r2(dto.discount ?? 0),
            taxAmount: r2(dto.taxAmount ?? 0),
            isInsuranceClaim: dto.isInsuranceClaim ?? false,
            insuranceProvider: blank(dto.insuranceProvider),
            insuranceClaimNumber: blank(dto.insuranceClaimNumber),
            internalNotes: blank(dto.internalNotes),
            imageUrls: dto.imageUrls ?? [],
            createdById: user.id,
            laborItems: { create: labor },
            externalWork: { create: external },
            statusLogs: { create: [{ toStatus: 'DRAFT', changedById: user.id, notes: 'Gaari aayi — job bana' }] },
          },
        }),
      });

      for (const [i, p] of (dto.partsUsed ?? []).entries()) await this.insertPart(tx, user, job, shopId, p, i);
      await this.retotal(tx, job.id);

      if (advance > 0) {
        const fresh = await tx.workshopJob.findUniqueOrThrow({ where: { id: job.id } });
        if (fresh.total > 0 && advance > fresh.total + 0.01) throw new BadRequestException(`Advance bill (Rs ${fresh.total}) se zyada nahi ho sakta`);
        await this.takeMoney(tx, user, fresh, shopId, advance, dto.advanceMethod ?? 'CASH', 'Gaari aate waqt advance');
      }
      return tx.workshopJob.findUniqueOrThrow({ where: { id: job.id }, include: JOB_INCLUDE });
    }, { timeout: 30_000 });
  }

  private async insertPart(tx: Tx, user: AuthenticatedUser, job: { id: string; jobNumber: string; shopId: string | null }, shopId: string, p: PartItemDto, order: number) {
    const qty = p.quantity ?? 1;
    const name = p.partName.trim();
    if (!name) throw new BadRequestException('Part ka naam likhein');
    let taken = false;
    if (p.productId) taken = (await this.takePart(tx, user, job, shopId, { ...p, quantity: qty }, name)).taken;
    const unit = r2(p.unitPrice ?? 0);
    const disc = r2(p.discount ?? 0);
    if (disc > unit * qty + 0.001) throw new BadRequestException(`"${name}" ka discount us ki qeemat se zyada hai`);
    return tx.workshopJobPart.create({
      data: {
        jobId: job.id, productId: p.productId, variantId: p.variantId, partName: name, partNumber: blank(p.partNumber),
        quantity: qty, unitPrice: unit, discount: disc, total: r2(unit * qty - disc),
        condition: p.condition ?? 'NEW', isCustomerSupplied: p.isCustomerSupplied ?? false,
        warrantyMonths: p.warrantyMonths ?? 0, warrantyKm: p.warrantyKm, notes: blank(p.notes), displayOrder: order,
        installedAt: taken ? new Date() : null,
      },
    });
  }

  // ─────────────────────────── read ───────────────────────────

  private listWhere(user: AuthenticatedUser, q: ListJobsQuery): Prisma.WorkshopJobWhereInput {
    const now = new Date();
    const and: Prisma.WorkshopJobWhereInput[] = [{ tenantId: user.tenantId }];
    if (q.shopId) and.push({ OR: [{ shopId: q.shopId }, { shopId: null }] });
    switch (q.view) {
      case 'open': and.push({ status: { in: OPEN } }); break;
      case 'working': and.push({ status: { in: WORKING } }); break;
      case 'waiting': and.push({ status: { in: WAITING } }); break;
      case 'ready': and.push({ status: { in: READY } }); break;
      case 'late': and.push({ status: { in: OPEN.filter((s) => !READY.includes(s)) }, promisedAt: { lt: now } }); break;
      case 'unpaid': and.push({ status: 'DELIVERED', paymentStatus: { not: 'PAID' }, total: { gt: 0 } }); break;
      case 'closed': and.push({ status: { in: CLOSED } }); break;
      default: break;
    }
    if (q.status) and.push({ status: q.status as JobStatus });
    if (q.priority) and.push({ priority: q.priority as JobPriority });
    if (q.jobType) and.push({ jobType: q.jobType as JobType });
    if (q.customerId) and.push({ customerId: q.customerId });
    if (q.vehicleId) and.push({ vehicleId: q.vehicleId });
    if (q.mechanicId) and.push({ OR: [{ primaryMechanicId: q.mechanicId }, { assistantMechanicIds: { has: q.mechanicId } }] });
    const from = q.from ? new Date(q.from) : null;
    const to = q.to ? new Date(q.to) : null;
    const range: Prisma.DateTimeFilter = {
      ...(from && !Number.isNaN(from.getTime()) && { gte: from }),
      ...(to && !Number.isNaN(to.getTime()) && { lte: to }),
    };
    if (range.gte || range.lte) and.push(q.view === 'closed' ? { deliveredAt: range } : { receivedAt: range });
    const s = q.search?.trim();
    if (s) {
      and.push({
        OR: [
          { jobNumber: { contains: s, mode: 'insensitive' } },
          { registrationNumber: { contains: s, mode: 'insensitive' } },
          { customerName: { contains: s, mode: 'insensitive' } },
          { customerPhone: { contains: s } },
          { makeName: { contains: s, mode: 'insensitive' } },
          { modelName: { contains: s, mode: 'insensitive' } },
          { customerComplaint: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return { AND: and };
  }

  /**
   * Without `page` the old shape (a plain array, 200 rows) is returned so
   * existing screens keep working; with `page` a page with totals.
   */
  async list(user: AuthenticatedUser, q: ListJobsQuery) {
    const where = this.listWhere(user, q);
    const orderBy: Prisma.WorkshopJobOrderByWithRelationInput[] =
      q.sort === 'new' ? [{ receivedAt: 'desc' }]
        : q.sort === 'old' ? [{ receivedAt: 'asc' }]
          : q.sort === 'amount' ? [{ total: 'desc' }]
            : q.view === 'closed' ? [{ deliveredAt: 'desc' }, { cancelledAt: 'desc' }]
              : [{ promisedAt: { sort: 'asc', nulls: 'last' } }, { receivedAt: 'asc' }];
    const include = { laborItems: { take: 3 }, partsUsed: { take: 3 }, payments: true } satisfies Prisma.WorkshopJobInclude;
    if (!q.page) return this.prisma.workshopJob.findMany({ where, include, orderBy, take: 200 });

    const limit = q.limit ?? 40;
    const [items, total, sums] = await Promise.all([
      this.prisma.workshopJob.findMany({ where, include, orderBy, skip: (q.page - 1) * limit, take: limit }),
      this.prisma.workshopJob.count({ where }),
      this.prisma.workshopJob.aggregate({ where: { AND: [where, { status: { not: 'CANCELLED' } }] }, _sum: { total: true, paidAmount: true } }),
    ]);
    const bill = r2(sums._sum.total ?? 0);
    const paid = r2(sums._sum.paidAmount ?? 0);
    const names = await this.mechanicNames(user.tenantId, items.map((j) => j.primaryMechanicId));
    const now = Date.now();
    return {
      items: items.map((j) => ({
        ...j,
        mechanicName: j.primaryMechanicId ? names.get(j.primaryMechanicId) ?? null : null,
        due: r2(Math.max(j.total - j.paidAmount, 0)),
        isLate: !!j.promisedAt && j.promisedAt.getTime() < now && OPEN.includes(j.status) && !READY.includes(j.status),
      })),
      total,
      page: q.page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      totals: { bill, paid, due: r2(Math.max(bill - paid, 0)) },
    };
  }

  private async mechanicNames(tenantId: string, ids: Array<string | null>) {
    const want = [...new Set(ids.filter((x): x is string => !!x))];
    if (!want.length) return new Map<string, string>();
    const mechs = await this.prisma.mechanicProfile.findMany({ where: { tenantId, id: { in: want } }, select: { id: true, staffId: true } });
    const staff = await this.prisma.staff.findMany({ where: { tenantId, id: { in: mechs.map((m) => m.staffId) } }, select: { id: true, fullName: true } });
    const sName = new Map(staff.map((s) => [s.id, s.fullName.trim()]));
    return new Map(mechs.map((m) => [m.id, sName.get(m.staffId) ?? '']));
  }

  /** Headline numbers for the jobs page. */
  async stats(user: AuthenticatedUser, shopId?: string) {
    const base: Prisma.WorkshopJobWhereInput = { tenantId: user.tenantId, ...(shopId && { OR: [{ shopId }, { shopId: null }] }) };
    const now = new Date();
    const today = startOfDayTz();
    const month = startOfMonthTz();
    const [byStatus, late, readyDue, todayIn, todayOut, monthOut, unpaid] = await Promise.all([
      this.prisma.workshopJob.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.workshopJob.count({ where: { ...base, status: { in: OPEN.filter((s) => !READY.includes(s)) }, promisedAt: { lt: now } } }),
      this.prisma.workshopJob.aggregate({ where: { ...base, status: { in: READY } }, _sum: { total: true, paidAmount: true } }),
      this.prisma.workshopJob.count({ where: { ...base, receivedAt: { gte: today } } }),
      this.prisma.workshopJob.count({ where: { ...base, status: 'DELIVERED', deliveredAt: { gte: today } } }),
      this.prisma.workshopJob.aggregate({ where: { ...base, status: 'DELIVERED', deliveredAt: { gte: month } }, _sum: { total: true, laborTotal: true, partsTotal: true }, _count: { _all: true } }),
      this.prisma.workshopJob.aggregate({ where: { ...base, status: 'DELIVERED', paymentStatus: { not: 'PAID' }, total: { gt: 0 } }, _sum: { total: true, paidAmount: true }, _count: { _all: true } }),
    ]);
    const count = (list: JobStatus[]) => byStatus.filter((b) => list.includes(b.status)).reduce((s, b) => s + b._count._all, 0);
    return {
      open: count(OPEN),
      working: count(WORKING),
      waiting: count(WAITING),
      ready: count(READY),
      late,
      readyDue: r2(Math.max((readyDue._sum.total ?? 0) - (readyDue._sum.paidAmount ?? 0), 0)),
      todayIn,
      todayOut,
      monthDelivered: monthOut._count._all,
      monthRevenue: r2(monthOut._sum.total ?? 0),
      monthLabour: r2(monthOut._sum.laborTotal ?? 0),
      monthParts: r2(monthOut._sum.partsTotal ?? 0),
      unpaidJobs: unpaid._count._all,
      unpaidDue: r2(Math.max((unpaid._sum.total ?? 0) - (unpaid._sum.paidAmount ?? 0), 0)),
      byStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
    };
  }

  /** The job's live bill: the one linked by saleId; old jobs fall back to the latest WSJ- bill not voided. */
  private async findBill(db: Tx | PrismaService, tenantId: string, job: { jobNumber: string; saleId: string | null }) {
    return db.sale.findFirst({
      where: { tenantId, status: { not: 'VOIDED' }, ...(job.saleId ? { id: job.saleId } : { saleNumber: { startsWith: jobSaleNumber(job.jobNumber) } }) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, saleNumber: true, total: true, creditAmount: true, status: true },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    let job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId }, include: JOB_INCLUDE });
    if (!job) throw new NotFoundException('Job nahi mili');

    const sale = job.status === 'DELIVERED' ? await this.findBill(this.prisma, user.tenantId, job) : null;
    // Bill voided while the listener was not running: reopen now.
    if (job.status === 'DELIVERED' && !sale) {
      const voided = await this.prisma.sale.findFirst({
        where: { tenantId: user.tenantId, status: 'VOIDED', ...(job.saleId ? { id: job.saleId } : { saleNumber: { startsWith: jobSaleNumber(job.jobNumber) } }) },
        orderBy: { createdAt: 'desc' }, select: { id: true },
      });
      if (voided) {
        await this.reopenAfterVoid(user.tenantId, voided.id);
        job = await this.prisma.workshopJob.findFirstOrThrow({ where: { id, tenantId: user.tenantId }, include: JOB_INCLUDE });
      }
    }

    const [customer, vehicle, names, coreReturns] = await Promise.all([
      job.customerId ? this.prisma.customer.findFirst({ where: { id: job.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } }) : null,
      job.vehicleId ? this.prisma.customerVehicle.findFirst({ where: { id: job.vehicleId, tenantId: user.tenantId } }) : null,
      this.mechanicNames(user.tenantId, [job.primaryMechanicId, ...job.assistantMechanicIds]),
      this.prisma.coreReturn.findMany({ where: { tenantId: user.tenantId, jobId: job.id }, orderBy: { createdAt: 'asc' }, select: { id: true, description: true, value: true, status: true, saleId: true } }),
    ]);
    const advanceOnKhata = await this.khataPaid(this.prisma, user.tenantId, job.jobNumber);
    return {
      ...job,
      mechanicName: job.primaryMechanicId ? names.get(job.primaryMechanicId) ?? null : null,
      due: r2(Math.max(job.total - job.paidAmount, 0)),
      advanceOnKhata,
      customer,
      vehicle,
      sale,
      coreReturns,
    };
  }

  /** Jobs behind the given bills (by saleId; older bills by their WSJ- number), for links from sales history. */
  async bySales(user: AuthenticatedUser, ids: string[]) {
    const wanted = [...new Set(ids.filter(Boolean))].slice(0, 200);
    if (!wanted.length) return [];
    const linked = await this.prisma.workshopJob.findMany({ where: { tenantId: user.tenantId, saleId: { in: wanted } }, select: { id: true, jobNumber: true, saleId: true } });
    const rest = wanted.filter((s) => !linked.some((j) => j.saleId === s));
    const old = rest.length
      ? await this.prisma.sale.findMany({ where: { tenantId: user.tenantId, id: { in: rest }, saleNumber: { startsWith: 'WSJ-' } }, select: { id: true, saleNumber: true } })
      : [];
    const numberOf = (saleNumber: string) => {
      const raw = saleNumber.slice(4);
      return /^JOB-\d{4}-\d+-\d+$/.test(raw) ? raw.replace(/-\d+$/, '') : raw;
    };
    const oldJobs = old.length
      ? await this.prisma.workshopJob.findMany({ where: { tenantId: user.tenantId, jobNumber: { in: old.map((s) => numberOf(s.saleNumber)) } }, select: { id: true, jobNumber: true } })
      : [];
    return [
      ...linked.map((j) => ({ saleId: j.saleId!, jobId: j.id, jobNumber: j.jobNumber })),
      ...old.flatMap((s) => {
        const j = oldJobs.find((x) => x.jobNumber === numberOf(s.saleNumber));
        return j ? [{ saleId: s.id, jobId: j.id, jobNumber: j.jobNumber }] : [];
      }),
    ];
  }

  // ─────────────────────────── edit ───────────────────────────

  private async openJob(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job nahi mili');
    this.assertOpen(job);
    return job;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateWorkshopJobDto) {
    const job = await this.openJob(user, id);
    const promised = dto.promisedAt === undefined ? undefined : blank(dto.promisedAt) ? new Date(dto.promisedAt!) : null;
    if (promised && Number.isNaN(promised.getTime())) throw new BadRequestException('Gaari dene ka waqt sahi likhein');
    const mechanicId = dto.primaryMechanicId === undefined ? undefined : blank(dto.primaryMechanicId) ?? null;
    if (mechanicId) await this.mechanicName(this.prisma, user.tenantId, mechanicId);
    const text = (v?: string) => (v === undefined ? undefined : blank(v) ?? null);

    return this.prisma.$transaction(async (tx) => {
      await tx.workshopJob.update({
        where: { id },
        data: {
          odometerKm: dto.odometerKm, customerName: text(dto.customerName) ?? undefined, customerPhone: text(dto.customerPhone),
          priority: dto.priority, jobType: dto.jobType, customerComplaint: text(dto.customerComplaint), diagnosis: text(dto.diagnosis),
          workDescription: text(dto.workDescription), recommendations: text(dto.recommendations), primaryMechanicId: mechanicId,
          bayNumber: text(dto.bayNumber), promisedAt: promised, fuelLevel: text(dto.fuelLevel), hasSpareTire: dto.hasSpareTire,
          hasToolkit: dto.hasToolkit, externalDamages: text(dto.externalDamages), discount: dto.discount === undefined ? undefined : r2(dto.discount),
          taxAmount: dto.taxAmount === undefined ? undefined : r2(dto.taxAmount), isInsuranceClaim: dto.isInsuranceClaim,
          insuranceProvider: text(dto.insuranceProvider), insuranceClaimNumber: text(dto.insuranceClaimNumber), internalNotes: text(dto.internalNotes),
        },
      });
      if (dto.discount !== undefined || dto.taxAmount !== undefined) await this.retotal(tx, id);
      if (dto.primaryMechanicId !== undefined && mechanicId !== job.primaryMechanicId) {
        await tx.workshopJobStatusLog.create({ data: { jobId: id, fromStatus: job.status, toStatus: job.status, changedById: user.id, notes: 'Mechanic badla' } });
      }
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    });
  }

  async addLabor(user: AuthenticatedUser, id: string, dto: LaborItemDto) {
    const job = await this.openJob(user, id);
    const mechanicId = blank(dto.mechanicId) ?? job.primaryMechanicId ?? undefined;
    const mechanicName = blank(dto.mechanicName) ?? await this.mechanicName(this.prisma, user.tenantId, mechanicId);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.workshopJobLabor.count({ where: { jobId: id } });
      await tx.workshopJobLabor.create({ data: { jobId: id, ...this.laborRow({ ...dto, mechanicId, mechanicName }, order) } });
      await this.retotal(tx, id);
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    });
  }

  async removeLabor(user: AuthenticatedUser, id: string, laborId: string) {
    await this.openJob(user, id);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.workshopJobLabor.findFirst({ where: { id: laborId, jobId: id }, select: { id: true } });
      if (!row) throw new NotFoundException('Mazdoori ki line nahi mili');
      await tx.workshopJobLabor.delete({ where: { id: laborId } });
      await this.retotal(tx, id);
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    });
  }

  async addPart(user: AuthenticatedUser, id: string, dto: PartItemDto) {
    const job = await this.openJob(user, id);
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, job.shopId);
      const order = await tx.workshopJobPart.count({ where: { jobId: id } });
      await this.insertPart(tx, user, job, shopId, dto, order);
      if (!job.shopId) await tx.workshopJob.update({ where: { id }, data: { shopId } });
      await this.retotal(tx, id);
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    }, { timeout: 20_000 });
  }

  async removePart(user: AuthenticatedUser, id: string, partId: string) {
    const job = await this.openJob(user, id);
    return this.prisma.$transaction(async (tx) => {
      const part = await tx.workshopJobPart.findFirst({ where: { id: partId, jobId: id } });
      if (!part) throw new NotFoundException('Part nahi mila');
      const shopId = await resolveIndustryShopId(tx, user, job.shopId);
      await this.returnPart(tx, user, job, shopId, part, `Job ${job.jobNumber} se part wapas shelf par`);
      await tx.workshopJobPart.delete({ where: { id: partId } });
      await this.retotal(tx, id);
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    }, { timeout: 20_000 });
  }

  async addExternal(user: AuthenticatedUser, id: string, dto: ExternalWorkDto) {
    await this.openJob(user, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.workshopJobExternal.create({ data: { jobId: id, ...this.externalRow(dto), sentAt: new Date() } });
      await this.retotal(tx, id);
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    });
  }

  async removeExternal(user: AuthenticatedUser, id: string, externalId: string) {
    await this.openJob(user, id);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.workshopJobExternal.findFirst({ where: { id: externalId, jobId: id }, select: { id: true } });
      if (!row) throw new NotFoundException('Bahar ka kaam nahi mila');
      await tx.workshopJobExternal.delete({ where: { id: externalId } });
      await this.retotal(tx, id);
      return tx.workshopJob.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
    });
  }

  // ─────────────────────────── status ───────────────────────────

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId }, include: { partsUsed: true } });
    if (!job) throw new NotFoundException('Job nahi mili');
    if (job.status === dto.status) return this.getOne(user, id);
    this.assertOpen(job);
    // Handing the vehicle back bills it, so it goes through deliver().
    if (dto.status === 'DELIVERED') return this.deliver(user, id, { amount: 0, notes: dto.notes });

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const patch: Prisma.WorkshopJobUpdateInput = { status: dto.status };
      let note = blank(dto.notes);
      if (dto.status === 'IN_PROGRESS' && !job.startedAt) patch.startedAt = now;
      if (READY.includes(dto.status) && !job.completedAt) patch.completedAt = now;
      if (dto.status === 'CANCELLED') {
        const reason = blank(dto.cancellationReason) ?? note;
        if (!reason) throw new BadRequestException('Cancel ki wajah likhein');
        patch.cancelledAt = now;
        patch.cancellationReason = reason;
        // Fitted parts go back on the shelf.
        const shopId = await resolveIndustryShopId(tx, user, job.shopId);
        for (const p of job.partsUsed) await this.returnPart(tx, user, job, shopId, p, `Job ${job.jobNumber} cancel — part wapas shelf par`);
        const advance = await this.khataPaid(tx, user.tenantId, job.jobNumber);
        note = [reason, advance > 0 ? `Rs ${advance} advance customer ke khata me jama hai` : null].filter(Boolean).join(' — ');
      }
      await tx.workshopJob.update({ where: { id }, data: patch });
      await tx.workshopJobStatusLog.create({ data: { jobId: id, fromStatus: job.status, toStatus: dto.status, notes: note, changedById: user.id } });
    }, { timeout: 20_000 });
    return this.getOne(user, id);
  }

  /**
   * Handing the vehicle back closes the job's money:
   *  - the bill (labour, parts, outside work, tax, discount) becomes a Sale, so
   *    it shows in the day book, cash register, profit and every sales report;
   *  - money taken now is paid on that bill; advances on the khata pay it too,
   *    and anything still owed stays on the khata as udhaar;
   *  - parts added before parts left stock on the job leave stock now;
   *  - the vehicle's history, km and next service reminder are updated.
   */
  async deliver(user: AuthenticatedUser, id: string, dto: DeliverJobDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job nahi mili');
    this.assertOpen(job);
    const amount = r2(dto.amount ?? 0);
    const due = r2(Math.max(job.total - job.paidAmount, 0));
    const newCore = r2(dto.coreReturn?.value ?? 0);
    if (amount > due + 0.01) throw new BadRequestException(`Baqi sirf Rs ${due} hai`);
    const nextDate = blank(dto.nextServiceDate) ? new Date(dto.nextServiceDate!) : null;
    if (nextDate && Number.isNaN(nextDate.getTime())) throw new BadRequestException('Agli service ki date sahi likhein');

    await this.prisma.$transaction(async (tx) => {
      // One delivery at a time per job.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`workshop-job:${id}`}))::text`;
      const fresh = await tx.workshopJob.findUniqueOrThrow({ where: { id }, include: { laborItems: true, partsUsed: true, externalWork: true } });
      this.assertOpen(fresh);
      const now = new Date();
      const shopId = await resolveIndustryShopId(tx, user, fresh.shopId);
      // Old parts given with this job (a new one now, or one held from a bill that was voided).
      if (dto.coreReturn) await recordCore(tx, user, { ...dto.coreReturn, jobId: id, shopId });
      const held: HeldCore[] = await tx.coreReturn.findMany({
        where: { tenantId: user.tenantId, jobId: id, status: 'HELD', saleId: null }, select: { id: true, value: true, description: true },
      });
      // Skip a part whose code already sits on a live bill (not yet linked).
      const onBill = held.length ? await tx.salePayment.findMany({
        where: { tenantId: user.tenantId, method: 'TRADE_IN', reference: { in: held.map((c) => coreCode(c.id)) }, sale: { status: { not: 'VOIDED' } } },
        select: { reference: true },
      }) : [];
      const cores = held.filter((c) => !onBill.some((p) => p.reference === coreCode(c.id)));
      const coreValue = r2(cores.reduce((s, c) => s + c.value, 0));
      if (amount + coreValue > due + 0.01) {
        throw new BadRequestException(`Baqi Rs ${due} hai — purane part (Rs ${coreValue}) ke baad sirf Rs ${r2(Math.max(due - coreValue, 0))} lein`);
      }
      const bill = await this.postJobBill(tx, user, fresh, shopId, amount, dto.paymentMethod, cores);

      if (amount > 0) {
        await tx.workshopJobPayment.create({
          data: { jobId: id, amount, paymentMethod: toPaymentMethod(dto.paymentMethod), reference: bill.saleNumber ?? fresh.jobNumber, notes: blank(dto.notes) ?? 'Gaari dete waqt', receivedById: user.id },
        });
      }
      for (const c of cores) {
        await tx.workshopJobPayment.create({
          data: { jobId: id, amount: c.value, paymentMethod: 'TRADE_IN', reference: bill.saleNumber ?? fresh.jobNumber, notes: `Purana part: ${c.description}`, receivedById: user.id },
        });
      }
      if (bill.saleId && cores.length) {
        await tx.coreReturn.updateMany({ where: { tenantId: user.tenantId, id: { in: cores.map((c) => c.id) } }, data: { saleId: bill.saleId } });
      }
      const paid = r2(fresh.paidAmount + amount + coreValue);
      const warrantyMonths = dto.warrantyMonths ?? fresh.warrantyMonths;
      await tx.workshopJob.update({
        where: { id },
        data: {
          status: 'DELIVERED', deliveredAt: now, completedAt: fresh.completedAt ?? now, shopId, customerId: bill.customerId ?? fresh.customerId, saleId: bill.saleId ?? null,
          paidAmount: paid, paymentStatus: payStatus(paid, fresh.total),
          ...(warrantyMonths > 0 && { warrantyStatus: 'ACTIVE', warrantyMonths, warrantyKm: dto.warrantyKm ?? fresh.warrantyKm, warrantyExpiry: addMonths(now, warrantyMonths) }),
        },
      });
      await tx.workshopJobStatusLog.create({
        data: { jobId: id, fromStatus: fresh.status, toStatus: 'DELIVERED', changedById: user.id, notes: [blank(dto.notes) ?? 'Gaari customer ko di', bill.saleNumber ? `Bill ${bill.saleNumber}` : null].filter(Boolean).join(' — ') },
      });

      if (fresh.vehicleId) {
        const v = await tx.customerVehicle.findFirst({ where: { id: fresh.vehicleId, tenantId: user.tenantId }, select: { id: true, odometerKm: true } });
        if (v) {
          await tx.customerVehicle.update({
            where: { id: v.id },
            data: {
              totalServices: { increment: 1 }, totalSpent: { increment: fresh.total }, lastServiceAt: now,
              ...(fresh.odometerKm != null && { lastOdometerKm: fresh.odometerKm, odometerKm: Math.max(fresh.odometerKm, v.odometerKm ?? 0) }),
            },
          });
          if (dto.nextServiceKm || nextDate) {
            await tx.vehicleServiceReminder.create({
              data: {
                tenantId: user.tenantId, vehicleId: v.id, reminderType: fresh.jobType === 'OIL_CHANGE' ? 'OIL_CHANGE' : 'GENERAL',
                title: fresh.jobType === 'OIL_CHANGE' ? 'Agla oil change' : 'Agli service',
                description: `Job ${fresh.jobNumber} ke baad`, dueDate: nextDate, dueOdometerKm: dto.nextServiceKm || undefined,
                autoCreated: true, fromJobId: fresh.id,
              },
            });
          }
        }
      }
    }, { timeout: 30_000 });
    return this.getOne(user, id);
  }

  private async postJobBill(tx: Tx, user: AuthenticatedUser, job: Prisma.WorkshopJobGetPayload<{ include: { laborItems: true; partsUsed: true; externalWork: true } }>, shopId: string, amountNow: number, method: string | undefined, cores: HeldCore[]) {
    const stockParts = job.partsUsed.filter((p) => p.productId && !p.isCustomerSupplied);
    const products = stockParts.length
      ? await tx.product.findMany({ where: { id: { in: stockParts.map((p) => p.productId!) }, tenantId: user.tenantId }, select: { id: true, name: true, costPrice: true, productType: true, unit: true } })
      : [];
    const productOf = new Map(products.map((p) => [p.id, p]));
    const variants = stockParts.some((p) => p.variantId)
      ? await tx.productVariant.findMany({ where: { id: { in: stockParts.map((p) => p.variantId).filter((x): x is string => !!x) } }, select: { id: true, costPrice: true } })
      : [];
    const variantCost = new Map(variants.map((v) => [v.id, v.costPrice]));
    const costOf = (p: (typeof stockParts)[number]) => {
      const prod = productOf.get(p.productId!);
      if (!prod) return 0;
      const unit = p.variantId && variantCost.get(p.variantId) != null ? Number(variantCost.get(p.variantId)) : Number(prod.costPrice) || 0;
      return r2(unit * p.quantity);
    };

    const vehicle = [job.registrationNumber, job.makeName, job.modelName].filter(Boolean).join(' ');
    const lines: IndustrySaleLine[] = [
      ...job.laborItems.map((l) => ({ label: `Mazdoori: ${l.description}${l.mechanicName ? ` (${l.mechanicName})` : ''}`, amount: r2(l.total) })),
      // Shelf parts carry their product so they show in product reports and a return can restock them.
      ...job.partsUsed.map((p) => {
        const shelf = !!p.productId && !p.isCustomerSupplied && productOf.has(p.productId);
        return {
          label: `${p.partName}${p.partNumber ? ` (${p.partNumber})` : ''}${p.isCustomerSupplied ? ' — customer ka part' : ''}`,
          amount: r2(p.total),
          cost: shelf ? costOf(p) : 0,
          quantity: p.quantity,
          ...(shelf && { productId: p.productId, variantId: p.variantId }),
        };
      }),
      // Paying the outside shop is an expense from the drawer, so its cost is not counted again here.
      ...job.externalWork.map((e) => ({ label: `Bahar ka kaam: ${e.description}${e.vendorName ? ` (${e.vendorName})` : ''}`, amount: r2(e.total) })),
      { label: 'Tax', amount: r2(job.taxAmount) },
    ];
    const billable = lines.some((l) => l.amount > 0 || (l.cost ?? 0) > 0);

    // Payments recorded before khata posting existed count as paid with this bill.
    const legacyPaid = r2(Math.max(job.paidAmount - (await this.khataPaid(tx, user.tenantId, job.jobNumber)), 0));
    const coreValue = r2(cores.reduce((s, c) => s + c.value, 0));
    const owed = r2(Math.max(job.total - job.paidAmount - amountNow - coreValue, 0));
    let customerId: string | null = job.customerId || null;
    if (!customerId && owed > 0.009) {
      if (!job.customerName?.trim() && !job.customerPhone?.trim()) {
        throw new BadRequestException(`Rs ${owed} baqi hai — poori amount lein, ya udhaar ke liye customer ka naam/phone job me likhein`);
      }
      customerId = await ensureCustomer(tx, user, { name: job.customerName ?? job.customerPhone, phone: job.customerPhone, shopId });
    }

    let saleNumber: string | undefined;
    let saleId: string | undefined;
    if (billable) {
      const round = 1 + await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: jobSaleNumber(job.jobNumber) }, status: 'VOIDED' } });
      const sale = await postIndustrySale(tx, user, {
        saleNumber: jobSaleNumber(job.jobNumber, round),
        sourceRef: [job.jobNumber, vehicle].filter(Boolean).join(' · '),
        shopId,
        customerId,
        lines,
        discount: job.discount,
        paidAmount: r2(legacyPaid + amountNow),
        paymentMethod: method ?? 'CASH',
        tradeIns: cores.map((c) => ({ amount: c.value, reference: coreCode(c.id), note: `Purana part: ${c.description}` })),
      });
      // Guard: a bill posted earlier under this number must carry the old parts too.
      if (coreValue > 0 && Number(sale.paidAmount) < r2(legacyPaid + amountNow + coreValue) - 0.01) {
        throw new BadRequestException('Purane part ki qeemat is bill par nahi lagi — dobara koshish karein');
      }
      saleNumber = sale.saleNumber;
      saleId = sale.id;
    } else if (amountNow > 0 || coreValue > 0) {
      throw new BadRequestException('Is job ka koi bill nahi — paisa na lein');
    }

    // Parts that went on the job before stock left at fitting leave now.
    for (const p of stockParts) {
      if (p.installedAt) continue;
      const prod = productOf.get(p.productId!);
      if (!prod || isServiceProduct(prod)) continue;
      const settings = await tx.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } });
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: prod.id, variantId: p.variantId ?? null,
        delta: -p.quantity, movementType: 'SALE_OUT', reference: saleNumber ?? job.jobNumber,
        note: `Workshop job ${job.jobNumber}${vehicle ? ` • ${vehicle}` : ''}`, preventNegative: !settings?.allowNegativeStock, label: prod.name,
        userId: user.id,
      });
      await tx.workshopJobPart.update({ where: { id: p.id }, data: { installedAt: new Date() } });
    }
    return { saleNumber, saleId, customerId };
  }

  /**
   * The job's bill was voided at the counter. The vehicle was already handed
   * back, so the job returns to "tayyar" with its parts still on it (they are
   * in the vehicle), money taken at delivery is marked as given back, and a
   * new bill is made when it is delivered again.
   */
  async reopenAfterVoid(tenantId: string, saleId: string) {
    try {
      const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { id: true, shopId: true, saleNumber: true, status: true, paidAmount: true, changeAmount: true } });
      if (!sale || sale.status !== 'VOIDED') return null;
      // Jobs billed before saleId existed are found from the WSJ- bill number.
      const raw = sale.saleNumber.startsWith('WSJ-') ? sale.saleNumber.slice(4) : null;
      const again = raw?.match(/^(.+)-\d+$/);
      const job = (await this.prisma.workshopJob.findFirst({ where: { tenantId, saleId: sale.id } }))
        ?? (raw ? await this.prisma.workshopJob.findFirst({ where: { tenantId, saleId: null, jobNumber: raw } }) : null)
        ?? (again ? await this.prisma.workshopJob.findFirst({ where: { tenantId, saleId: null, jobNumber: again[1] } }) : null);
      if (!job || job.status !== 'DELIVERED') return null;

      const voidBy = await this.prisma.activityLog.findFirst({
        where: { tenantId, action: 'SALE_VOIDED', entityType: 'Sale', entityId: sale.id }, orderBy: { createdAt: 'desc' }, select: { userId: true },
      });
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`workshop-job:${job.id}`}))::text`;
        const fresh = await tx.workshopJob.findUniqueOrThrow({ where: { id: job.id } });
        if (fresh.status !== 'DELIVERED') return null;
        const atDelivery = await tx.workshopJobPayment.groupBy({ by: ['paymentMethod'], where: { jobId: job.id, reference: sale.saleNumber }, _sum: { amount: true } });
        const tradeInBack = r2(atDelivery.filter((g) => g.paymentMethod === 'TRADE_IN').reduce((s, g) => s + (g._sum.amount ?? 0), 0));
        const back = r2(atDelivery.reduce((s, g) => s + (g._sum.amount ?? 0), 0));
        const moneyBack = r2(back - tradeInBack);
        if (moneyBack > 0) {
          await tx.workshopJobPayment.create({ data: { jobId: job.id, amount: -moneyBack, paymentMethod: 'CASH', reference: sale.saleNumber, notes: `Bill ${sale.saleNumber} void — paisa wapas`, receivedById: voidBy?.userId ?? null } });
        }
        // Old parts stay held for the job's next bill.
        if (tradeInBack > 0) {
          await tx.workshopJobPayment.create({ data: { jobId: job.id, amount: -tradeInBack, paymentMethod: 'TRADE_IN', reference: sale.saleNumber, notes: `Bill ${sale.saleNumber} void — purana part agle bill par lagega`, receivedById: voidBy?.userId ?? null } });
        }
        // The void put the bill's shelf parts back in stock, but they are still in the vehicle.
        const parts = await tx.saleItem.findMany({
          where: { saleId: sale.id, productId: { not: null } },
          select: { productId: true, quantity: true, variantLink: { select: { variantId: true } }, product: { select: { name: true, productType: true, unit: true } } },
        });
        for (const p of parts) {
          if (!p.productId || !sale.shopId || isServiceProduct(p.product)) continue;
          await applyStockDelta({
            tx, tenantId, shopId: sale.shopId, productId: p.productId, variantId: p.variantLink?.variantId ?? null,
            delta: -p.quantity, movementType: 'SALE_OUT', reference: job.jobNumber,
            note: `Bill ${sale.saleNumber} void — part abhi gaari me laga hai`, label: p.product?.name, userId: voidBy?.userId ?? undefined,
          });
        }
        const paid = r2(Math.max(fresh.paidAmount - back, 0));
        await tx.workshopJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', deliveredAt: null, saleId: null, paidAmount: paid, paymentStatus: payStatus(paid, fresh.total), warrantyStatus: fresh.warrantyStatus === 'ACTIVE' ? 'NONE' : fresh.warrantyStatus },
        });
        await tx.workshopJobStatusLog.create({ data: { jobId: job.id, fromStatus: 'DELIVERED', toStatus: 'COMPLETED', changedById: voidBy?.userId ?? null, notes: `Bill ${sale.saleNumber} void hua — job dobara khuli, theek kar ke dobara dein` } });
        if (fresh.vehicleId) {
          await tx.customerVehicle.updateMany({ where: { id: fresh.vehicleId, tenantId, totalServices: { gt: 0 } }, data: { totalServices: { decrement: 1 }, totalSpent: { decrement: fresh.total } } });
        }
        return { jobId: job.id };
      });
    } catch (e) {
      this.log.warn(`Voided bill ${saleId} not applied to its job: ${(e as Error).message}`);
      return null;
    }
  }

  // ─────────────────────────── money ───────────────────────────

  /** Money on the khata against this job: advances (job number) and payments on its bills (WSJ-…). */
  private async khataPaid(db: Tx | PrismaService, tenantId: string, jobNumber: string) {
    const agg = await db.customerLedger.aggregate({
      where: { tenantId, type: 'PAYMENT_RECEIVED', OR: [{ reference: jobNumber }, { reference: { startsWith: jobSaleNumber(jobNumber) } }] },
      _sum: { amount: true },
    });
    return r2(-(Number(agg._sum.amount) || 0));
  }

  private async takeMoney(tx: Tx, user: AuthenticatedUser, job: { id: string; jobNumber: string; saleId: string | null; status: JobStatus; customerId: string | null; customerName: string | null; customerPhone: string | null; paidAmount: number; total: number }, shopId: string, amount: number, method: string, note: string) {
    const customerId = await ensureCustomer(tx, user, { customerId: job.customerId, name: job.customerName ?? job.customerPhone, phone: job.customerPhone, shopId });
    const bill = job.status === 'DELIVERED' ? await this.findBill(tx, user.tenantId, job) : null;
    const reference = bill?.saleNumber ?? job.jobNumber;
    await recordKhataPayment(tx, user, {
      customerId, shopId, amount, method,
      reference,
      note: job.status === 'DELIVERED' ? `Workshop job ${job.jobNumber} ki wusooli` : `Workshop job ${job.jobNumber} ka advance`,
    });
    await tx.workshopJobPayment.create({ data: { jobId: job.id, amount, paymentMethod: toPaymentMethod(method), reference: job.jobNumber, notes: note, receivedById: user.id } });
    const paid = r2(job.paidAmount + amount);
    await tx.workshopJob.update({ where: { id: job.id }, data: { paidAmount: paid, paymentStatus: payStatus(paid, job.total), customerId, shopId } });
  }

  /**
   * Money taken for a job outside delivery. Before delivery it is an advance on
   * the customer's khata; after delivery it pays off the job's udhaar. Either
   * way the day book and the cash register see it on the day it came in.
   */
  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job nahi mili');
    if (job.status === 'CANCELLED') throw new BadRequestException('Cancel job par payment nahi li ja sakti');
    const amount = r2(dto.amount);
    const remaining = r2(job.total - job.paidAmount);
    if (job.total > 0 && amount > remaining + 0.01) throw new BadRequestException(`Sirf Rs ${Math.max(remaining, 0)} baqi hai`);
    if (job.status === 'DELIVERED' && amount > remaining + 0.01) throw new BadRequestException('Is job par kuch baqi nahi');

    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, job.shopId);
      await this.takeMoney(tx, user, job, shopId, amount, dto.paymentMethod,
        [blank(dto.notes) ?? (job.status === 'DELIVERED' ? 'Baqi ki wusooli' : 'Advance'), blank(dto.reference)].filter(Boolean).join(' · '));
    });
    return this.getOne(user, id);
  }

  async setWarranty(user: AuthenticatedUser, id: string, dto: SetWarrantyDto) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job nahi mili');
    const from = job.deliveredAt ?? new Date();
    const expiry = dto.warrantyMonths ? addMonths(from, dto.warrantyMonths) : null;
    return this.prisma.workshopJob.update({
      where: { id },
      data: { warrantyStatus: dto.warrantyStatus, warrantyMonths: dto.warrantyMonths ?? 0, warrantyKm: dto.warrantyKm, warrantyExpiry: expiry, warrantyNotes: blank(dto.warrantyNotes) },
    });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    const job = await this.prisma.workshopJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job nahi mili');
    return this.prisma.workshopJob.update({ where: { id }, data: { customerRating: rating, customerFeedback: blank(feedback) } });
  }

  async recalculate(user: AuthenticatedUser, id: string) {
    const job = await this.openJob(user, id);
    await this.prisma.$transaction((tx) => this.retotal(tx, job.id));
    return this.prisma.workshopJob.findUniqueOrThrow({ where: { id } });
  }
}
