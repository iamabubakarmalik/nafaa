import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertPlanDto } from './dto/upsert-plan.dto';

@Injectable()
export class AdminPlansService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });
  }

  async create(dto: UpsertPlanDto) {
    const exists = await this.prisma.plan.findFirst({
      where: { OR: [{ slug: dto.slug }, { name: dto.name }] },
    });
    if (exists) throw new ConflictException('Plan with same slug or name exists');

    return this.prisma.plan.create({ data: dto });
  }

  async update(id: string, dto: UpsertPlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const slugExists = await this.prisma.plan.findFirst({
      where: { slug: dto.slug, NOT: { id } },
    });
    if (slugExists) throw new ConflictException('Slug already in use');

    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan._count.subscriptions > 0) {
      return this.prisma.plan.update({
        where: { id },
        data: { isActive: false, isPublic: false },
      });
    }

    await this.prisma.plan.delete({ where: { id } });
    return { message: 'Plan deleted permanently' };
  }
}
