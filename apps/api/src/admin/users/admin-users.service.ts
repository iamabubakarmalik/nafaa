import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDayTz, subDaysTz } from '../../common/helpers/business-time.helper';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    search?: string;
    role?: UserRole;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.role ? { role: params.role } : {}),
      ...(params.status === 'active' ? { isActive: true } : params.status === 'inactive' ? { isActive: false } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Headline numbers for the Users page. */
  async stats() {
    const weekAgo = subDaysTz(startOfDayTz(), 7);
    const [total, active, inactive, newThisWeek, neverSignedIn] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: null } }),
    ]);
    return { total, active, inactive, newThisWeek, neverSignedIn };
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new NotFoundException('Cannot deactivate Super Admin');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, fullName: true, isActive: true },
    });
  }
}
