import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BroadcastTarget,
  CreateBroadcastDto,
} from './dto/create-broadcast.dto';

@Injectable()
export class AdminBroadcastService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Without `paged` this returns the plain list (old behavior). With it, one
   * page of broadcasts plus header numbers, searched on title and message.
   */
  async list(params: { page?: number; limit?: number; search?: string; targetType?: string; paged?: boolean }) {
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const page = Math.max(1, params.page ?? 1);
    const include = { author: { select: { id: true, fullName: true } } };
    if (!params.paged) {
      return this.prisma.broadcastNotification.findMany({ orderBy: { sentAt: 'desc' }, skip: (page - 1) * limit, take: limit, include });
    }
    const term = params.search?.trim();
    const where = {
      ...(params.targetType ? { targetType: params.targetType } : {}),
      ...(term ? { OR: [{ title: { contains: term, mode: 'insensitive' as const } }, { message: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [items, total, all, last30, reach] = await Promise.all([
      this.prisma.broadcastNotification.findMany({ where, orderBy: { sentAt: 'desc' }, skip: (page - 1) * limit, take: limit, include }),
      this.prisma.broadcastNotification.count({ where }),
      this.prisma.broadcastNotification.count(),
      this.prisma.broadcastNotification.count({ where: { sentAt: { gte: since30 } } }),
      this.prisma.broadcastNotification.aggregate({ _sum: { recipientCount: true } }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { total: all, last30d: last30, recipients: reach._sum.recipientCount ?? 0 },
    };
  }

  async send(authorId: string, dto: CreateBroadcastDto) {
    let tenants: { id: string }[] = [];

    if (dto.targetType === BroadcastTarget.ALL) {
      tenants = await this.prisma.tenant.findMany({
        where: { slug: { not: 'nafaa-system' } },
        select: { id: true },
      });
    } else if (dto.targetType === BroadcastTarget.ACTIVE) {
      tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE', slug: { not: 'nafaa-system' } },
        select: { id: true },
      });
    } else if (dto.targetType === BroadcastTarget.TRIAL) {
      tenants = await this.prisma.tenant.findMany({
        where: { status: 'TRIAL' },
        select: { id: true },
      });
    } else if (dto.targetType === BroadcastTarget.SUSPENDED) {
      tenants = await this.prisma.tenant.findMany({
        where: { status: 'SUSPENDED' },
        select: { id: true },
      });
    } else if (dto.targetType === BroadcastTarget.SPECIFIC) {
      tenants = await this.prisma.tenant.findMany({
        where: { id: { in: dto.targetTenantIds ?? [] } },
        select: { id: true },
      });
    }

    if (tenants.length > 0) {
      await this.prisma.notification.createMany({
        data: tenants.map((t) => ({
          tenantId: t.id,
          type: 'INFO' as const,
          title: dto.title,
          message: dto.message,
          link: dto.link,
        })),
      });
    }

    return this.prisma.broadcastNotification.create({
      data: {
        authorId,
        title: dto.title,
        message: dto.message,
        link: dto.link,
        targetType: dto.targetType,
        targetTenantIds: dto.targetTenantIds ?? [],
        recipientCount: tenants.length,
      },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });
  }
}
