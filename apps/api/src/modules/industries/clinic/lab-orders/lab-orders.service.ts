import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class LabOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.tests?.length) throw new BadRequestException('At least one test required');

    let patientId = dto.patientId;
    let doctorId = dto.doctorId;
    if (dto.encounterId) {
      const enc = await this.prisma.clinicEncounter.findFirst({ where: { id: dto.encounterId, tenantId: user.tenantId } });
      if (!enc) throw new NotFoundException('Encounter not found');
      patientId = enc.patientId;
      doctorId = enc.doctorId;
    }

    const count = await this.prisma.clinicLabOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'LAB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    let totalCost = 0;
    const testsData = dto.tests.map((t: any) => {
      const price = Number(t.price) || 0;
      totalCost += price;
      return {
        testName: t.testName,
        testCode: t.testCode,
        category: t.category,
        price,
      };
    });

    return this.prisma.clinicLabOrder.create({
      data: {
        tenantId: user.tenantId,
        encounterId: dto.encounterId,
        patientId,
        doctorId,
        orderNumber,
        labName: dto.labName,
        urgency: dto.urgency || 'ROUTINE',
        totalCost,
        notes: dto.notes,
        tests: { create: testsData },
      },
      include: { tests: true },
    });
  }

  async list(user: AuthenticatedUser, params: { patientId?: string; status?: string }) {
    return this.prisma.clinicLabOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.patientId && { patientId: params.patientId }),
        ...(params.status && { status: params.status as any }),
      },
      include: { tests: true },
      orderBy: { orderedAt: 'desc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.clinicLabOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { tests: true },
    });
    if (!o) throw new NotFoundException('Not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const patch: any = { status };
    if (status === 'SAMPLE_COLLECTED') patch.sampleCollectedAt = new Date();
    if (status === 'REPORTED') patch.reportedAt = new Date();
    return this.prisma.clinicLabOrder.update({ where: { id }, data: patch });
  }

  async recordResult(user: AuthenticatedUser, testId: string, dto: { result: string; referenceRange?: string; unit?: string; isAbnormal?: boolean; isCritical?: boolean; performedBy?: string; reportUrl?: string }) {
    return this.prisma.clinicLabTest.update({
      where: { id: testId },
      data: {
        result: dto.result,
        referenceRange: dto.referenceRange,
        unit: dto.unit,
        isAbnormal: dto.isAbnormal,
        isCritical: dto.isCritical,
        performedBy: dto.performedBy,
        reportUrl: dto.reportUrl,
        reportedAt: new Date(),
      },
    });
  }

  async attachReport(user: AuthenticatedUser, id: string, reportUrl: string) {
    const o = await this.prisma.clinicLabOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Not found');
    return this.prisma.clinicLabOrder.update({
      where: { id },
      data: {
        reportUrls: [...o.reportUrls, reportUrl],
        status: 'REPORTED',
        reportedAt: new Date(),
      },
    });
  }
}
