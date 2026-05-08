import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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
