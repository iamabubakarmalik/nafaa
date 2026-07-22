import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertQuickKeyDto } from './dto/upsert-quick-key.dto';

@Injectable()
export class QuickKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, shopId?: string) {
    return this.prisma.retailQuickKey.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [{ userId: user.id }, { userId: null }],
        ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: AuthenticatedUser, dto: UpsertQuickKeyDto) {
    return this.prisma.retailQuickKey.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        ...dto,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertQuickKeyDto) {
    const existing = await this.prisma.retailQuickKey.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Quick key not found');
    return this.prisma.retailQuickKey.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.retailQuickKey.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Quick key not found');
    return this.prisma.retailQuickKey.delete({ where: { id } });
  }

  async reorder(user: AuthenticatedUser, items: { id: string; position: number }[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.retailQuickKey.updateMany({
          where: { id: item.id, tenantId: user.tenantId },
          data: { position: item.position },
        }),
      ),
    );
  }
}
