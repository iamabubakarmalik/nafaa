/**
 * Milk tests (fat, SNF, water, adulteration) at collection or on stock.
 * A test is a record only: it changes no stock and no money. A rejected
 * collection is entered on the collection slip itself.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { cleanInput, dayEnd, dayRange, nextNumbered, parseDay, shopYear } from '../dairy-common';
import { CreateQualityTestDto } from './dto/create-quality-test.dto';

@Injectable()
export class QualityTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateQualityTestDto) {
    const when = parseDay(dto.testedAt) ?? new Date();
    if (when.getTime() > dayEnd().getTime()) throw new BadRequestException('Aane wale din ka test nahi likh sakte');
    if (dto.sourceType === 'FARMER' && dto.sourceId) {
      const f = await this.prisma.dairyFarmer.findFirst({ where: { id: dto.sourceId, tenantId: user.tenantId }, select: { name: true } });
      if (!f) throw new BadRequestException('Gawala nahi mila');
      dto.sourceName = dto.sourceName?.trim() || f.name;
    }
    const failed = dto.adulterationDetected || dto.quality === 'REJECTED';
    const prefix = `QT-${shopYear()}-`;
    return nextNumbered(
      () => this.prisma.dairyQualityTest.count({ where: { tenantId: user.tenantId, testNumber: { startsWith: prefix } } }),
      prefix, 5,
      (testNumber) => this.prisma.dairyQualityTest.create({
        data: {
          ...cleanInput(dto),
          tenantId: user.tenantId,
          testNumber,
          testedAt: when,
          passed: failed ? false : (dto.passed ?? true),
          testedByStaffId: user.id,
        },
      }),
    );
  }

  async list(user: AuthenticatedUser, params: { sourceType?: string; sourceId?: string; from?: string; to?: string; failed?: boolean; search?: string }) {
    const range = dayRange(params.from, params.to);
    const search = params.search?.trim();
    return this.prisma.dairyQualityTest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.sourceType && { sourceType: params.sourceType }),
        ...(params.sourceId && { sourceId: params.sourceId }),
        ...(params.failed !== undefined && { passed: !params.failed }),
        ...(range && { testedAt: range }),
        ...(search && { OR: [
          { testNumber: { contains: search, mode: 'insensitive' as const } },
          { sourceName: { contains: search, mode: 'insensitive' as const } },
        ] }),
      },
      orderBy: { testedAt: 'desc' },
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.dairyQualityTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Test nahi mila');
    return t;
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string } = {}) {
    const range = dayRange(params.from, params.to);
    const where = { tenantId: user.tenantId, ...(range && { testedAt: range }) };
    const [total, passed, failed, adulteration, avg] = await Promise.all([
      this.prisma.dairyQualityTest.count({ where }),
      this.prisma.dairyQualityTest.count({ where: { ...where, passed: true } }),
      this.prisma.dairyQualityTest.count({ where: { ...where, passed: false } }),
      this.prisma.dairyQualityTest.count({ where: { ...where, adulterationDetected: true } }),
      this.prisma.dairyQualityTest.aggregate({ where, _avg: { fatContent: true, snfContent: true } }),
    ]);
    return { total, passed, failed, adulteration, avgFat: avg._avg.fatContent, avgSnf: avg._avg.snfContent };
  }
}
