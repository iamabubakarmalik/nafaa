import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class QualityTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.dairyQualityTest.count({ where: { tenantId: user.tenantId } });
    const testNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.dairyQualityTest.create({
      data: {
        tenantId: user.tenantId,
        testNumber,
        ...dto,
        testedByStaffId: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { sourceType?: string; sourceId?: string; from?: string; to?: string; failed?: boolean }) {
    return this.prisma.dairyQualityTest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.sourceType && { sourceType: params.sourceType }),
        ...(params.sourceId && { sourceId: params.sourceId }),
        ...(params.failed !== undefined && { passed: !params.failed }),
        ...(params.from || params.to ? {
          testedAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { testedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.dairyQualityTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Test not found');
    return t;
  }

  async summary(user: AuthenticatedUser) {
    const [total, passed, failed, adulteration] = await Promise.all([
      this.prisma.dairyQualityTest.count({ where: { tenantId: user.tenantId } }),
      this.prisma.dairyQualityTest.count({ where: { tenantId: user.tenantId, passed: true } }),
      this.prisma.dairyQualityTest.count({ where: { tenantId: user.tenantId, passed: false } }),
      this.prisma.dairyQualityTest.count({ where: { tenantId: user.tenantId, adulterationDetected: true } }),
    ]);
    return { total, passed, failed, adulteration };
  }
}
