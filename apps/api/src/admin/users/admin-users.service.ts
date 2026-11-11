import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { hashPassword } from '../../common/utils/password.util';
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
    /** online (5 min), today, week, idle7, idle30, never */
    activity?: string;
    /** web, desktop or mobile: the app used last */
    via?: string;
    sort?: string;
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
      // Merchant users only; admin accounts are managed under Staff & access.
      ...(params.role ? { role: params.role } : { role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN_STAFF] } }),
      AND: [activityWhere(params.activity)],
      ...(params.via && ['web', 'desktop', 'mobile'].includes(params.via) ? { lastSeenVia: params.via } : {}),
      ...(params.status === 'active' ? { isActive: true } : params.status === 'inactive' ? { isActive: false } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: params.sort === 'last_seen' ? [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
          : params.sort === 'oldest' ? { createdAt: 'asc' }
          : params.sort === 'name' ? { fullName: 'asc' }
          : { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          lastSeenAt: true,
          lastSeenVia: true,
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

  /** Headline numbers for the Users page (merchant users only). */
  async stats() {
    const weekAgo = subDaysTz(startOfDayTz(), 7);
    const m: Prisma.UserWhereInput = { role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN_STAFF] } };
    const [total, active, inactive, newThisWeek, neverSignedIn, onlineNow, activeToday] = await Promise.all([
      this.prisma.user.count({ where: m }),
      this.prisma.user.count({ where: { ...m, isActive: true } }),
      this.prisma.user.count({ where: { ...m, isActive: false } }),
      this.prisma.user.count({ where: { ...m, createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { ...m, lastLoginAt: null } }),
      this.prisma.user.count({ where: { ...m, ...activityWhere('online') } }),
      this.prisma.user.count({ where: { ...m, ...activityWhere('today') } }),
    ]);
    return { total, active, inactive, newThisWeek, neverSignedIn, onlineNow, activeToday };
  }

  private async merchantUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, fullName: true, tenantId: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN_STAFF) throw new BadRequestException('Admin accounts are managed under Staff & access.');
    return user;
  }

  /** Ends every session of the user; they must sign in again on all devices. */
  async signOut(id: string) {
    await this.merchantUser(id);
    const { count } = await this.prisma.session.deleteMany({ where: { userId: id } });
    return { ended: count };
  }

  /**
   * Sets a new temporary password, signs the user out everywhere and returns
   * the password once so the admin can pass it on. Nothing else is changed.
   */
  async resetPassword(id: string) {
    await this.merchantUser(id);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const password = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password), passwordResetToken: null, passwordResetExpires: null } }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
    ]);
    return { temporaryPassword: password };
  }

  /** Name, phone and role inside the shop. */
  async update(id: string, dto: { fullName?: string; phone?: string | null; role?: string }) {
    await this.merchantUser(id);
    const roles: string[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF];
    if (dto.role && !roles.includes(dto.role)) throw new BadRequestException('Unknown role');
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName?.trim() ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.role ? { role: dto.role as UserRole } : {}),
      },
      select: { id: true, fullName: true, phone: true, role: true },
    });
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

/** Filter users by when they were last active (Pakistan days). */
export function activityWhere(activity?: string): Prisma.UserWhereInput {
  const now = new Date();
  switch (activity) {
    case 'online': return { lastSeenAt: { gte: new Date(now.getTime() - 5 * 60_000) } };
    case 'today': return { lastSeenAt: { gte: startOfDayTz(now) } };
    case 'week': return { lastSeenAt: { gte: subDaysTz(now, 7) } };
    case 'idle7': return { OR: [{ lastSeenAt: { lt: subDaysTz(now, 7) } }, { lastSeenAt: null }] };
    case 'idle30': return { OR: [{ lastSeenAt: { lt: subDaysTz(now, 30) } }, { lastSeenAt: null }] };
    case 'never': return { lastSeenAt: null, lastLoginAt: null };
    default: return {};
  }
}
