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
    const t = await this.prisma.abTest.findUnique({
      where: { id },

    });
    if (!t) throw new NotFoundException('A/B test not found');
    return t;
  }

  async create(data: {
    name: string;
    hypothesis?: string;
    variants: { name: string; content: any; weight?: number }[];
    goalMetric: string;
  }, adminId: string) {
    if (data.variants.length < 2) {
      throw new BadRequestException('A/B test needs at least 2 variants');
    }
    const test = await this.prisma.abTest.create({
      data: {
        slug: `ab-${Date.now()}`,
        name: data.name,
        // hypothesis: not in schema,
        goalMetric: data.goalMetric,
        status: 'DRAFT',
        createdById: adminId,
        variants: {
          create: data.variants.map((v: any) => ({
            name: v.name,
            content: v.content,
            weight: v.weight ?? Math.floor(100 / data.variants.length),
          })),
        },
      },
      
    });
    return test;
  }

  async start(id: string) {
    await this.getOne(id);
    return this.prisma.abTest.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
  }

  async stop(id: string, winnerId?: string) {
    await this.getOne(id);
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
    const variants = await this.prisma.abTest.findMany({
      where: { id },
    });

    return {
      test: { id: test.id, name: test.name, status: test.status },
      variants: variants.map((v: any) => {
        const assigned = (v as any).assigned ?? 0;
        const converted = (v as any).converted ?? 0;
        return {
          id: v.id,
          name: v.name,
          weight: v.weight,
          assigned,
          converted,
          conversionRate:
            assigned > 0
              ? `${((converted / assigned) * 100).toFixed(2)}%`
              : '0%',
        };
      }),
    };
  }
}
