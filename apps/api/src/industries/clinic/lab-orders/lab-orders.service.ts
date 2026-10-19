import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicLabTestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { FEE_LINK, billClinicFee, readFeePayment } from '../appointments/fee-billing';

const STATUSES = Object.values(ClinicLabTestStatus);
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const str = (v: unknown, max = 500) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim().slice(0, max));

@Injectable()
export class LabOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async create(user: AuthenticatedUser, dto: any) {
    const tests = Array.isArray(dto?.tests) ? dto.tests : [];
    if (!tests.length) throw new BadRequestException('Kam se kam ek test likhein');

    let patientId: string | undefined = dto.patientId;
    let doctorId: string | undefined = dto.doctorId;
    if (dto.encounterId) {
      const enc = await this.prisma.clinicEncounter.findFirst({ where: { id: dto.encounterId, tenantId: user.tenantId } });
      if (!enc) throw new NotFoundException('Checkup nahi mila');
      patientId = enc.patientId;
      doctorId = enc.doctorId;
    }
    const [patient, doctor] = await Promise.all([
      patientId ? this.prisma.clinicPatientProfile.findFirst({ where: { id: patientId, tenantId: user.tenantId }, select: { id: true } }) : null,
      doctorId ? this.prisma.clinicDoctorProfile.findFirst({ where: { id: doctorId, tenantId: user.tenantId }, select: { id: true } }) : null,
    ]);
    if (!patient) throw new BadRequestException('Mareez chunein');
    if (!doctor) throw new BadRequestException('Doctor chunein');

    const testsData = tests.map((t: any) => {
      const testName = str(t?.testName, 200);
      const price = r2(t?.price);
      if (!testName) throw new BadRequestException('Har test ka naam likhein');
      if (price < 0) throw new BadRequestException(`${testName}: rate manfi nahi ho sakta`);
      return { testName, testCode: str(t?.testCode, 50), category: str(t?.category, 80), price };
    });
    const totalCost = r2(testsData.reduce((s: number, t: { price: number }) => s + t.price, 0));
    const urgency = ['ROUTINE', 'URGENT', 'STAT'].includes(dto.urgency) ? dto.urgency : 'ROUTINE';

    for (let attempt = 0; ; attempt += 1) {
      const last = await this.prisma.clinicLabOrder.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, select: { orderNumber: true } });
      const seq = Number(/(\d+)$/.exec(last?.orderNumber ?? '')?.[1] ?? 0) + 1 + attempt;
      try {
        return await this.prisma.clinicLabOrder.create({
          data: {
            tenantId: user.tenantId,
            encounterId: dto.encounterId || undefined,
            patientId: patient.id,
            doctorId: doctor.id,
            orderNumber: `LAB-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`,
            labName: str(dto.labName, 120),
            urgency,
            totalCost,
            paymentStatus: totalCost > 0 ? 'UNPAID' : 'PAID',
            notes: str(dto.notes, 2000),
            tests: { create: testsData },
          },
          include: { tests: true },
        });
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** Orders with patient and doctor names. Without `page` the old array; with `page` a page and counts. */
  async list(user: AuthenticatedUser, params: Record<string, string | undefined>) {
    const search = params.search?.trim();
    const patientIds = search ? (await this.prisma.clinicPatientProfile.findMany({
      where: { tenantId: user.tenantId, OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { mrn: { contains: search, mode: 'insensitive' } }, { phonePrimary: { contains: search } }] },
      select: { id: true }, take: 200,
    })).map((p) => p.id) : [];
    const where: Prisma.ClinicLabOrderWhereInput = {
      tenantId: user.tenantId,
      ...(params.patientId && { patientId: params.patientId }),
      ...(params.doctorId && { doctorId: params.doctorId }),
      ...(params.status && STATUSES.includes(params.status as ClinicLabTestStatus) && { status: params.status as ClinicLabTestStatus }),
      ...(params.status === 'PENDING' && { status: { in: ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] } }),
      ...(params.paymentStatus === 'DUE' && { paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] }, totalCost: { gt: 0 }, status: { not: 'CANCELLED' } }),
      ...(params.from || params.to ? { orderedAt: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } } : {}),
      ...(search && { OR: [{ orderNumber: { contains: search, mode: 'insensitive' } }, { tests: { some: { testName: { contains: search, mode: 'insensitive' } } } }, { patientId: { in: patientIds } }] }),
    };
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const [rows, total, byStatus, sums] = await Promise.all([
      this.prisma.clinicLabOrder.findMany({ where, include: { tests: true }, orderBy: { orderedAt: 'desc' }, skip: params.page ? (page - 1) * limit : 0, take: params.page ? limit : 100 }),
      params.page ? this.prisma.clinicLabOrder.count({ where }) : Promise.resolve(0),
      params.page ? this.prisma.clinicLabOrder.groupBy({ by: ['status'], where, _count: { _all: true } }) : Promise.resolve([]),
      params.page ? this.prisma.clinicLabOrder.aggregate({ where: { ...where, status: { not: 'CANCELLED' } }, _sum: { totalCost: true, paidAmount: true } }) : Promise.resolve(null),
    ]);
    const [patients, doctors] = await Promise.all([
      this.prisma.clinicPatientProfile.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.patientId))] } }, select: { id: true, fullName: true, mrn: true, phonePrimary: true, gender: true, dateOfBirth: true } }),
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.doctorId))] } }, select: { id: true, fullName: true, title: true } }),
    ]);
    const items = rows.map((r) => ({ ...r, patient: patients.find((p) => p.id === r.patientId) ?? null, doctor: doctors.find((d) => d.id === r.doctorId) ?? null }));
    if (!params.page) return items;
    const fees = r2(sums?._sum.totalCost ?? 0);
    const billed = r2(sums?._sum.paidAmount ?? 0);
    return {
      items, total, page, limit,
      summary: { fees, billed, due: r2(Math.max(fees - billed, 0)), byStatus: Object.fromEntries((byStatus as Array<{ status: string; _count: { _all: number } }>).map((s) => [s.status, s._count._all])) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.clinicLabOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { tests: true } });
    if (!o) throw new NotFoundException('Lab order nahi mila');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const own = await this.getOne(user, id);
    if (!STATUSES.includes(status as ClinicLabTestStatus)) throw new BadRequestException('Status ghalat hai');
    if (own.status === 'CANCELLED') throw new BadRequestException('Cancel order dobara nahi khulta');
    if (status === 'CANCELLED' && own.paidAmount > 0) throw new BadRequestException(`Is order ka Rs ${own.paidAmount} bill bana hai — pehle Sales me wo bill void karein`);
    const patch: Prisma.ClinicLabOrderUpdateInput = { status: status as ClinicLabTestStatus };
    if (status === 'SAMPLE_COLLECTED' && !own.sampleCollectedAt) patch.sampleCollectedAt = new Date();
    if ((status === 'REPORTED' || status === 'COMPLETED') && !own.reportedAt) patch.reportedAt = new Date();
    return this.prisma.clinicLabOrder.update({ where: { id }, data: patch, include: { tests: true } });
  }

  async recordResult(user: AuthenticatedUser, testId: string, dto: any) {
    const own = await this.prisma.clinicLabTest.findFirst({ where: { id: testId, order: { tenantId: user.tenantId } }, select: { id: true, orderId: true } });
    if (!own) throw new NotFoundException('Test nahi mila');
    const result = str(dto?.result, 4000);
    if (!result) throw new BadRequestException('Result likhein');
    const test = await this.prisma.clinicLabTest.update({
      where: { id: testId },
      data: {
        result,
        referenceRange: str(dto.referenceRange, 120),
        unit: str(dto.unit, 40),
        isAbnormal: dto.isAbnormal === undefined ? undefined : !!dto.isAbnormal,
        isCritical: dto.isCritical === undefined ? undefined : !!dto.isCritical,
        performedBy: str(dto.performedBy, 120),
        reportUrl: str(dto.reportUrl, 1000),
        reportedAt: new Date(),
      },
    });
    // All results in: the order is reported.
    const pending = await this.prisma.clinicLabTest.count({ where: { orderId: own.orderId, result: null } });
    if (!pending) await this.prisma.clinicLabOrder.updateMany({ where: { id: own.orderId, status: { in: ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] } }, data: { status: 'REPORTED', reportedAt: new Date() } });
    return test;
  }

  async attachReport(user: AuthenticatedUser, id: string, reportUrl: string) {
    const o = await this.getOne(user, id);
    const url = str(reportUrl, 1000);
    if (!url) throw new BadRequestException('Report ka link chahiye');
    return this.prisma.clinicLabOrder.update({ where: { id }, data: { reportUrls: [...o.reportUrls, url], status: 'REPORTED', reportedAt: new Date() } });
  }

  /** Bills the test charges as a sale (same path as appointment fees). */
  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, body: any) {
    const o = await this.getOne(user, id);
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order ki fees nahi li ja sakti');
    const pay = readFeePayment(body, r2(o.totalCost - o.paidAmount));
    const patient = await this.prisma.clinicPatientProfile.findFirst({ where: { id: o.patientId, tenantId: user.tenantId }, select: { customerId: true, fullName: true, mrn: true } });
    const names = o.tests.map((t) => t.testName).join(', ');
    const sale = await billClinicFee(this.prisma, this.sales, user, scope, {
      ...pay,
      customerId: patient?.customerId,
      managerPin: body?.managerPin ? String(body.managerPin) : undefined,
      link: `${FEE_LINK.lab}${o.id}`,
      lineNote: `${o.orderNumber} · ${names}`.slice(0, 300),
      note: `Lab ${o.orderNumber}${patient ? ` · ${patient.fullName} (${patient.mrn})` : ''}`,
    });
    return this.prisma.$transaction(async (tx) => {
      const cur = await tx.clinicLabOrder.findUniqueOrThrow({ where: { id } });
      const billed = r2(cur.paidAmount + pay.amount);
      const row = await tx.clinicLabOrder.update({
        where: { id },
        data: { paidAmount: billed, paymentStatus: billed >= cur.totalCost - 0.009 ? 'PAID' : 'PARTIALLY_PAID' },
        include: { tests: true },
      });
      return { ...row, sale };
    });
  }
}
