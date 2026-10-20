import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteRevalidationService } from '../../admin-marketing/cms/revalidation/site-revalidation.service';
import { UpsertPlanDto } from './dto/upsert-plan.dto';

@Injectable()
export class AdminPlansService {
  constructor(
    private readonly prisma: PrismaService,
    // Public site: prices and plan features are read from Plan (CMS revalidation, global module).
    @Optional() private readonly siteRevalidation?: SiteRevalidationService,
  ) {}

  private revalidateSite(): void {
    void this.siteRevalidation?.revalidatePlans();
  }

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

    const created = await this.prisma.plan.create({ data: dto });
    this.revalidateSite();
    return created;
  }

  async update(id: string, dto: UpsertPlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const slugExists = await this.prisma.plan.findFirst({
      where: { slug: dto.slug, NOT: { id } },
    });
    if (slugExists) throw new ConflictException('Slug already in use');

    const updated = await this.prisma.plan.update({ where: { id }, data: dto });
    this.revalidateSite();
    return updated;
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan._count.subscriptions > 0) {
      const hidden = await this.prisma.plan.update({
        where: { id },
        data: { isActive: false, isPublic: false },
      });
      this.revalidateSite();
      return hidden;
    }

    await this.prisma.plan.delete({ where: { id } });
    this.revalidateSite();
    return { message: 'Plan deleted permanently' };
  }
}
