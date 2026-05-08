import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { tenantId?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const skip = (page - 1) * limit;

    return this.prisma.activityLog.findMany({
      where: params.tenantId ? { tenantId: params.tenantId } : {},
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, role: true } },
        tenant: { select: { id: true, name: true } },
      },
    });
  }
}
