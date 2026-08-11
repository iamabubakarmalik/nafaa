import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AbTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.abTest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: string) {
    const t = await this.prisma.abTest.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('A/B test not found');
    return t;
  }

  async create(data: {
    name: string;
    hypothesis?: string;
    variants: { name: string; content: any; weight?: number }[];
    goalMetric: string;
  }, adminId: string) {
    if (!Array.isArray(data.variants) || data.variants.length < 2) {
      throw new BadRequestException('A/B test needs at least 2 variants');
    }
    // variants is a Json column — plain array, NOT a nested relation create
    const variants = data.variants.map((v) => ({
      name: v.name,
      content: v.content ?? {},
      weight: v.weight ?? Math.floor(100 / data.variants.length),
      assigned: 0,
      converted: 0,
    }));
    return this.prisma.abTest.create({
      data: {
        slug: `ab-${Date.now()}`,
        name: data.name,
        description: data.hypothesis,
        goalMetric: data.goalMetric,
        status: 'DRAFT',
        createdById: adminId,
        variants: variants as any,
      },
    });
  }

  async start(id: string) {
    const t = await this.getOne(id);
    if (t.status !== 'DRAFT' && t.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot start a ${t.status} test`);
    }
    return this.prisma.abTest.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: t.startedAt ?? new Date() },
    });
  }

  async stop(id: string, winnerId?: string) {
    const t = await this.getOne(id);
    if (t.status !== 'RUNNING') {
      throw new BadRequestException(`Cannot stop a ${t.status} test`);
    }
    return this.prisma.abTest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        winningVariant: winnerId,
      },
    });
  }

  async results(id: string) {
    const test = await this.getOne(id);
    const variants = Array.isArray(test.variants)
      ? (test.variants as any[])
      : [];
    const live = (test.results as Record<string, { assigned?: number; converted?: number }>) ?? {};

    return {
      test: {
        id: test.id,
        name: test.name,
        status: test.status,
        goalMetric: test.goalMetric,
        winningVariant: test.winningVariant,
        confidenceLevel: test.confidenceLevel,
        totalVisitors: test.totalVisitors,
        totalConversions: test.totalConversions,
      },
      variants: variants.map((v, i) => {
        const assigned = live[v.name]?.assigned ?? v.assigned ?? 0;
        const converted = live[v.name]?.converted ?? v.converted ?? 0;
        return {
          key: v.name ?? `variant-${i}`,
          weight: v.weight ?? 0,
          assigned,
          converted,
          conversionRate:
            assigned > 0 ? `${((converted / assigned) * 100).toFixed(2)}%` : '0%',
        };
      }),
    };
  }
}
