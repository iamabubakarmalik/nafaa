import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPlatformDiscountDto } from './dto/upsert-discount.dto';

@Injectable()
export class AdminPlatformDiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.platformDiscount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  }

  /** Paged and filtered list with a total, for the Promo codes page. */
  async listPaged(params: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 24));
    const now = new Date();
    const where: any = {};
    if (params.status === 'active') {
      where.isActive = true;
      where.AND = [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }];
    } else if (params.status === 'off') where.isActive = false;
    else if (params.status === 'expired') where.validUntil = { lt: now };
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.platformDiscount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.platformDiscount.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async stats() {
    const now = new Date();
    const [total, active, expired, uses] = await Promise.all([
      this.prisma.platformDiscount.count(),
      this.prisma.platformDiscount.count({
        where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      }),
      this.prisma.platformDiscount.count({ where: { validUntil: { lt: now } } }),
      this.prisma.platformDiscount.aggregate({ _sum: { usageCount: true } }),
    ]);
    return { total, active, expired, totalUses: uses._sum.usageCount ?? 0 };
  }

  async create(authorId: string, dto: UpsertPlatformDiscountDto) {
    const code = dto.code.toUpperCase().trim();

    const exists = await this.prisma.platformDiscount.findUnique({
      where: { code },
    });
    if (exists) throw new ConflictException('Code already exists');

    return this.prisma.platformDiscount.create({
      data: {
        code,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        scope: dto.scope ?? 'PLAN',
        applicablePlans: dto.applicablePlans ?? [],
        minPurchase: dto.minPurchase ?? 0,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perTenantLimit: dto.perTenantLimit,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: dto.isActive ?? true,
        createdById: authorId,
      },
    });
  }

  async update(id: string, dto: Partial<UpsertPlatformDiscountDto>) {
    const found = await this.prisma.platformDiscount.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Discount not found');

    return this.prisma.platformDiscount.update({
      where: { id },
      data: {
        description: dto.description,
        type: dto.type,
        value: dto.value,
        scope: dto.scope,
        applicablePlans: dto.applicablePlans,
        minPurchase: dto.minPurchase,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perTenantLimit: dto.perTenantLimit,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    const found = await this.prisma.platformDiscount.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Discount not found');

    await this.prisma.platformDiscount.delete({ where: { id } });
    return { message: 'Discount deleted' };
  }
}
