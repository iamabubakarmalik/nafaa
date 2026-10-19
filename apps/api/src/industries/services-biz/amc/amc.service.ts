/**
 * AMC (annual maintenance contracts): a yearly fee for a set number of
 * visits on the customer's machines (ACs, generators, UPS, water tanks).
 *
 * The fee is a sale on the day the contract is signed (SVC-AMC-…); what is
 * not paid then goes on the customer's khata and later payments are khata
 * receipts. Each visit becomes a job card (category AMC_VISIT) whose labour
 * is free when the contract covers it; billing that job marks the visit
 * done. Voiding the contract bill at the counter cancels the contract.
 */

import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { addDaysTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { JobsService } from '../jobs/jobs.service';
import { amcBillNumber, blank, nextDocNumber, r2 } from '../jobs/job-rules';
import type { CancelAmcDto, CompleteVisitDto, CreateAmcDto, ListAmcQuery, ScheduleVisitDto, VisitJobDto } from './dto/amc.dto';

const DAY = 86_400_000;
const TX = { timeout: 30_000 } as const;

@Injectable()
export class AmcService implements OnModuleInit {
  private readonly log = new Logger(AmcService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly jobs: JobsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.cancelAfterVoid(tenantId, saleId));
  }

  async create(user: AuthenticatedUser, dto: CreateAmcDto) {
    const contractValue = r2(dto.contractValue);
    const amountPaid = r2(dto.amountPaid ?? 0);
    if (amountPaid > contractValue + 0.01) throw new BadRequestException(`Contract sirf Rs ${contractValue} ka hai`);
    if (!dto.customerId && !blank(dto.customerName)) throw new BadRequestException('Customer ka naam likhein');
    if (!blank(dto.serviceAddress)) throw new BadRequestException('Service ka address likhein');
    const startDate = startOfDayTz(dto.startDate ? new Date(dto.startDate) : new Date());
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date(addDaysTz(startDate, 365).getTime() - 1);
    if (endDate <= startDate) throw new BadRequestException('Contract khatam hone ki date shuru ke baad rakhein');

    const amc = await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId);
      // A contract runs for a year; it always sits on a customer record.
      const customerId = await ensureCustomer(tx, user, { customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone, shopId });
      const c = await tx.customer.findFirstOrThrow({ where: { id: customerId }, select: { name: true, phone: true } });
      const amcNumber = await nextDocNumber(async (prefix) => (await tx.serviceAmc.findFirst({
        where: { tenantId: user.tenantId, amcNumber: { startsWith: prefix } }, orderBy: { amcNumber: 'desc' }, select: { amcNumber: true },
      }))?.amcNumber, 'AMC');
      const created = await tx.serviceAmc.create({
        data: {
          tenantId: user.tenantId, amcNumber, customerId,
          customerName: blank(dto.customerName) ?? c.name, customerPhone: blank(dto.customerPhone) ?? c.phone ?? '', customerEmail: blank(dto.customerEmail),
          type: dto.type ?? 'STANDARD', coveredItems: (dto.coveredItems ?? []).map((x) => x.trim()).filter(Boolean), coveredServiceTypes: dto.coveredServiceTypes ?? [],
          numberOfVisits: dto.numberOfVisits, visitsRemaining: dto.numberOfVisits,
          includesParts: dto.includesParts ?? false, includesLabour: dto.includesLabour ?? true, partsCapAmount: dto.partsCapAmount,
          emergencyIncluded: dto.emergencyIncluded ?? false, emergencyDiscountPct: dto.emergencyDiscountPct ?? 0,
          contractValue, amountPaid, paymentMode: dto.paymentMode ?? 'CASH', paymentInstallments: dto.paymentInstallments ?? 1,
          startDate, endDate, autoRenew: dto.autoRenew ?? false, reminderDaysBefore: dto.reminderDaysBefore ?? 30,
          serviceAddress: dto.serviceAddress.trim(), city: blank(dto.city), numberOfSites: dto.numberOfSites ?? 1,
          termsConditions: blank(dto.termsConditions), specialConditions: blank(dto.specialConditions), notes: blank(dto.notes),
          createdById: user.id,
        },
      });
      if (contractValue > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: amcBillNumber(amcNumber),
          sourceRef: `${amcNumber} · ${created.customerName}`,
          shopId, customerId,
          lines: [{ label: `AMC contract ${amcNumber} (${dto.numberOfVisits} visits)`, amount: contractValue }],
          paidAmount: amountPaid,
          paymentMethod: dto.paymentMode,
        });
      }
      if (dto.autoScheduleVisits) {
        const gap = Math.max(Math.floor((endDate.getTime() - startDate.getTime()) / DAY / dto.numberOfVisits), 1);
        await tx.serviceAmcVisit.createMany({
          data: Array.from({ length: dto.numberOfVisits }, (_, i) => ({ amcId: created.id, visitNumber: i + 1, scheduledDate: addDaysTz(startDate, (i + 1) * gap - Math.floor(gap / 2)), status: 'SCHEDULED' })),
        });
      }
      return created;
    }, TX);
    return this.getOne(user, amc.id);
  }

  async list(user: AuthenticatedUser, p: ListAmcQuery) {
    const s = p.search?.trim();
    return this.prisma.serviceAmc.findMany({
      where: {
        tenantId: user.tenantId,
        ...(p.status && { status: p.status }),
        ...(p.customerId && { customerId: p.customerId }),
        ...(p.type && { type: p.type }),
        ...(s && {
          OR: [
            { amcNumber: { contains: s, mode: 'insensitive' } },
            { customerName: { contains: s, mode: 'insensitive' } },
            { customerPhone: { contains: s } },
            { serviceAddress: { contains: s, mode: 'insensitive' } },
          ],
        }),
      },
      include: { visits: { orderBy: { visitNumber: 'asc' } } },
      orderBy: { endDate: 'asc' },
      take: 300,
    });
  }

  private async find(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.serviceAmc.findFirst({ where: { id, tenantId: user.tenantId }, include: { visits: { orderBy: { visitNumber: 'asc' } } } });
    if (!a) throw new NotFoundException('AMC contract nahi mila');
    return a;
  }

  /** The contract with its bill, what is still owed on it and the jobs of its visits. */
  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.find(user, id);
    const [sale, paidLater, jobs] = await Promise.all([
      this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, saleNumber: amcBillNumber(a.amcNumber) }, select: { id: true, saleNumber: true, status: true, total: true, paidAmount: true, creditAmount: true } }),
      paidOnKhata(this.prisma as unknown as Prisma.TransactionClient, user.tenantId, a.amcNumber),
      this.prisma.serviceJob.findMany({ where: { tenantId: user.tenantId, amcId: a.id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, jobNumber: true, status: true, serviceName: true, scheduledStart: true, completedAt: true, totalCharge: true } }),
    ]);
    const due = sale && sale.status !== 'VOIDED' ? r2(Math.max(Number(sale.creditAmount) - paidLater, 0)) : 0;
    return { ...a, sale, due, jobs };
  }

  async scheduleVisit(user: AuthenticatedUser, amcId: string, dto: ScheduleVisitDto) {
    const amc = await this.find(user, amcId);
    if (amc.status !== 'ACTIVE') throw new BadRequestException('Contract chaalu nahi');
    if (amc.visits.length >= amc.numberOfVisits) throw new BadRequestException(`Contract me sirf ${amc.numberOfVisits} visits hain`);
    if (dto.technicianId && !(await this.prisma.staff.findFirst({ where: { id: dto.technicianId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Technician nahi mila');
    }
    await this.prisma.serviceAmcVisit.create({
      data: { amcId, visitNumber: amc.visits.length + 1, scheduledDate: new Date(dto.scheduledDate), visitType: blank(dto.visitType) ?? 'MAINTENANCE', technicianId: dto.technicianId },
    });
    return this.getOne(user, amcId);
  }

  /** Opens the job card for a visit; labour is free when the contract covers it. */
  async visitJob(user: AuthenticatedUser, amcId: string, visitId: string, dto: VisitJobDto) {
    const amc = await this.find(user, amcId);
    const visit = amc.visits.find((v) => v.id === visitId);
    if (!visit) throw new NotFoundException('Visit nahi mili');
    if (amc.status !== 'ACTIVE') throw new BadRequestException('Contract chaalu nahi');
    if (visit.status === 'COMPLETED') throw new BadRequestException('Ye visit ho chuki');
    if (visit.serviceJobId) throw new BadRequestException('Is visit ka job pehle hi bana hai');
    if (amc.visitsRemaining <= 0) throw new BadRequestException('Contract ki saari visits ho chuki');
    const job = await this.jobs.create(user, {
      customerId: amc.customerId ?? undefined, customerName: amc.customerName, customerPhone: amc.customerPhone || undefined,
      serviceName: `AMC visit ${visit.visitNumber} — ${amc.amcNumber}`, category: 'AMC_VISIT', amcId: amc.id,
      problemDescription: blank(dto.problemDescription) ?? (amc.coveredItems as string[] | null)?.join(', ') ?? 'AMC visit',
      locationType: 'CUSTOMER_HOME', serviceAddress: amc.serviceAddress, city: amc.city ?? undefined,
      scheduledStart: visit.scheduledDate.toISOString(), primaryTechnicianId: dto.primaryTechnicianId ?? visit.technicianId ?? undefined,
      visitCharge: 0, labourCharge: 0, internalNotes: `${amc.amcNumber} · ${amc.includesParts ? 'parts shamil' : 'parts alag bill'}`,
    });
    await this.prisma.serviceAmcVisit.update({ where: { id: visitId }, data: { serviceJobId: job.id, technicianId: job.primaryTechnicianId } });
    return job;
  }

  /** Marks a visit done without a job card (work noted on paper). */
  async completeVisit(user: AuthenticatedUser, amcId: string, visitId: string, dto: CompleteVisitDto) {
    const amc = await this.find(user, amcId);
    const visit = amc.visits.find((v) => v.id === visitId);
    if (!visit) throw new NotFoundException('Visit nahi mili');
    if (visit.status === 'COMPLETED') throw new BadRequestException('Ye visit ho chuki');
    if (visit.serviceJobId) throw new BadRequestException('Is visit ka job bana hai — job ka bill banane par visit khud mukammal hogi');
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceAmcVisit.update({
        where: { id: visitId },
        data: { completedAt: new Date(), status: 'COMPLETED', technicianId: dto.technicianId, workDone: blank(dto.workDone), recommendations: blank(dto.recommendations), customerRating: dto.customerRating },
      });
      await tx.serviceAmc.update({ where: { id: amcId }, data: { visitsUsed: { increment: 1 }, visitsRemaining: Math.max(amc.visitsRemaining - 1, 0) } });
    });
    return this.getOne(user, amcId);
  }

  /** Money toward the unpaid contract fee: a khata receipt against the contract. */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, method?: string) {
    const a = await this.getOne(user, id);
    const value = r2(amount);
    if (!a.sale || a.sale.status === 'VOIDED') throw new BadRequestException('Is contract ka koi bill nahi');
    if (value > a.due + 0.01) throw new BadRequestException(`Baqi sirf Rs ${a.due} hai`);
    if (!a.customerId) throw new BadRequestException('Contract par customer nahi');
    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      await recordKhataPayment(tx, user, { customerId: a.customerId!, shopId, amount: value, reference: a.amcNumber, note: `AMC wusooli: ${a.amcNumber}`, method });
      await tx.serviceAmc.update({ where: { id }, data: { amountPaid: { increment: value } } });
    }, TX);
    return this.getOne(user, id);
  }

  /** Stops the contract. Money is not moved here: a refund is a return on its bill in Sales. */
  async cancel(user: AuthenticatedUser, id: string, dto: CancelAmcDto) {
    const a = await this.find(user, id);
    if (a.status === 'CANCELLED') throw new BadRequestException('Contract pehle hi cancel hai');
    if (!dto.reason?.trim() || dto.reason.trim().length < 3) throw new BadRequestException('Cancel ki wajah likhein');
    await this.prisma.serviceAmc.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason.trim() } });
    return this.getOne(user, id);
  }

  /** A new contract on the same terms, starting the day after the old one ends (or today). */
  async renew(user: AuthenticatedUser, id: string, dto: { amountPaid?: number; paymentMode?: string; contractValue?: number }) {
    const a = await this.find(user, id);
    if (a.status === 'CANCELLED') throw new BadRequestException('Cancel contract renew nahi hota — naya banayein');
    const start = a.endDate.getTime() > Date.now() ? addDaysTz(startOfDayTz(a.endDate), 1) : startOfDayTz(new Date());
    const fresh = await this.create(user, {
      customerId: a.customerId ?? undefined, customerName: a.customerName, customerPhone: a.customerPhone, customerEmail: a.customerEmail ?? undefined,
      type: a.type, coveredItems: (a.coveredItems as string[] | null) ?? [], coveredServiceTypes: a.coveredServiceTypes, numberOfVisits: a.numberOfVisits,
      includesParts: a.includesParts, includesLabour: a.includesLabour, partsCapAmount: a.partsCapAmount ?? undefined, emergencyIncluded: a.emergencyIncluded,
      emergencyDiscountPct: a.emergencyDiscountPct, contractValue: dto.contractValue ?? a.contractValue, amountPaid: dto.amountPaid ?? 0,
      paymentMode: dto.paymentMode ?? a.paymentMode ?? 'CASH', startDate: start.toISOString(), autoRenew: a.autoRenew, reminderDaysBefore: a.reminderDaysBefore,
      serviceAddress: a.serviceAddress, city: a.city ?? undefined, numberOfSites: a.numberOfSites, termsConditions: a.termsConditions ?? undefined,
      specialConditions: a.specialConditions ?? undefined, notes: `Renewal of ${a.amcNumber}`, autoScheduleVisits: true,
    });
    if (a.status === 'RENEWAL_DUE' || a.endDate.getTime() < Date.now()) await this.prisma.serviceAmc.update({ where: { id }, data: { status: 'EXPIRED' } });
    return fresh;
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.serviceAmc.updateMany({ where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'RENEWAL_DUE'] }, endDate: { lt: new Date() } }, data: { status: 'EXPIRED' } });
  }

  async renewalDue(user: AuthenticatedUser, daysAhead = 30) {
    const days = Math.min(Math.max(Number(daysAhead) || 30, 1), 365);
    return this.prisma.serviceAmc.findMany({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'RENEWAL_DUE'] }, endDate: { gte: new Date(), lte: addDaysTz(new Date(), days) } },
      orderBy: { endDate: 'asc' },
    });
  }

  private async cancelAfterVoid(tenantId: string, saleId: string) {
    try {
      const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, status: true } });
      if (!sale || sale.status !== 'VOIDED' || !sale.saleNumber.startsWith('SVC-AMC-')) return;
      await this.prisma.serviceAmc.updateMany({
        where: { tenantId, amcNumber: sale.saleNumber.slice(4), status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: `Bill ${sale.saleNumber} void hua` },
      });
    } catch (e) {
      this.log.warn(`Voided bill ${saleId} not applied to its AMC: ${(e as Error).message}`);
    }
  }
}
