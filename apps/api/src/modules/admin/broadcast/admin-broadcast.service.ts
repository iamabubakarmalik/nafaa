import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BroadcastTarget,
  CreateBroadcastDto,
} from './dto/create-broadcast.dto';

@Injectable()
export class AdminBroadcastService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const skip = (page - 1) * limit;

    return this.prisma.broadcastNotification.findMany({
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });
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
