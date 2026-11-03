/**
 * Mobile devices: the heartbeat the app sends on start and resume, and the
 * admin list and detail views.
 *
 * The heartbeat is built to be cheap: when nothing changed and the device was
 * seen in the last few minutes, it does one indexed read and no write.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { dateKeyTz } from '../../common/helpers/business-time.helper';
import { DevicesQueryDto, HeartbeatDto } from './mobile-control.dto';

/** Skip the write when the device was seen this recently and nothing changed. */
const QUIET_MS = 5 * 60_000;
/** A gap longer than this counts as a new app session. */
const SESSION_GAP_MS = 30 * 60_000;

const TRACKED_FIELDS = [
  'tenantId', 'userId', 'platform', 'appVersion', 'buildNumber', 'runtimeVersion', 'updateId',
  'osVersion', 'deviceModel', 'deviceBrand', 'language', 'pushToken', 'country',
] as const;

@Injectable()
export class MobileDevicesService {
  private readonly logger = new Logger(MobileDevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async heartbeat(user: AuthenticatedUser, dto: HeartbeatDto, country: string | null) {
    const now = new Date();
    const existing = await this.prisma.mobileDevice.findUnique({ where: { installId: dto.installId } });

    const next = {
      tenantId: user.tenantId,
      userId: user.id,
      platform: dto.platform,
      appVersion: dto.appVersion,
      buildNumber: dto.buildNumber ?? null,
      runtimeVersion: dto.runtimeVersion ?? null,
      updateId: dto.updateId ?? null,
      osVersion: dto.osVersion ?? null,
      deviceModel: dto.deviceModel ?? null,
      deviceBrand: dto.deviceBrand ?? null,
      language: dto.language ?? existing?.language ?? null,
      // Undefined keeps the stored token; null clears it.
      pushToken: dto.pushToken === undefined ? existing?.pushToken ?? null : dto.pushToken || null,
      country: country ?? existing?.country ?? null,
    };

    if (!existing) {
      const created = await this.prisma.mobileDevice.create({ data: { installId: dto.installId, ...next, firstSeenAt: now, lastSeenAt: now } });
      await this.markDay(created.id, user.tenantId, now);
      await this.registerToken(user.id, next.pushToken, null);
      return { deviceId: created.id };
    }

    const changed = TRACKED_FIELDS.some((k) => (existing as any)[k] !== (next as any)[k]);
    const sinceLast = now.getTime() - existing.lastSeenAt.getTime();
    if (!changed && sinceLast < QUIET_MS) return { deviceId: existing.id };

    await this.prisma.mobileDevice.update({
      where: { id: existing.id },
      data: {
        ...next,
        lastSeenAt: now,
        ...(sinceLast > SESSION_GAP_MS ? { sessions: { increment: 1 } } : {}),
      },
    });
    if (dateKeyTz(existing.lastSeenAt) !== dateKeyTz(now) || existing.tenantId !== user.tenantId) {
      await this.markDay(existing.id, user.tenantId, now);
    }
    if (next.pushToken !== existing.pushToken || existing.userId !== user.id) {
      await this.registerToken(user.id, next.pushToken, existing.pushToken);
    }
    return { deviceId: existing.id };
  }

  private async markDay(deviceId: string, tenantId: string, at: Date) {
    await this.prisma.mobileDeviceDay.createMany({
      data: [{ deviceId, tenantId, day: new Date(`${dateKeyTz(at)}T00:00:00.000Z`) }],
      skipDuplicates: true,
    });
  }

  /** Keeps the user's push token list (used by in-app notifications) in step with the device. */
  private async registerToken(userId: string, token: string | null, previous: string | null) {
    try {
      if (previous && previous !== token) {
        const users = await this.prisma.user.findMany({ where: { pushTokens: { has: previous } }, select: { id: true, pushTokens: true } });
        for (const u of users) {
          await this.prisma.user.update({ where: { id: u.id }, data: { pushTokens: u.pushTokens.filter((t) => t !== previous) } });
        }
      }
      if (token) await this.notifications.registerPushToken(userId, token);
    } catch (err: any) {
      this.logger.warn(`Push token sync failed: ${err?.message}`);
    }
  }

  // ─── Admin ────────────────────────────────────────────────────────

  async list(q: DevicesQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const search = q.q?.trim();
    const where: Prisma.MobileDeviceWhereInput = {
      ...(q.platform ? { platform: q.platform } : {}),
      ...(q.version ? { appVersion: q.version } : {}),
      ...(q.tenantId ? { tenantId: q.tenantId } : {}),
      ...(q.activeDays ? { lastSeenAt: { gte: new Date(Date.now() - q.activeDays * 86_400_000) } } : {}),
      ...(search
        ? {
            OR: [
              { tenant: { name: { contains: search, mode: 'insensitive' } } },
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { deviceModel: { contains: search, mode: 'insensitive' } },
              { installId: { startsWith: search } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.MobileDeviceOrderByWithRelationInput =
      q.sort === 'firstSeen' ? { firstSeenAt: 'desc' } : q.sort === 'version' ? { appVersion: 'desc' } : { lastSeenAt: 'desc' };

    const [total, rows] = await Promise.all([
      this.prisma.mobileDevice.count({ where }),
      this.prisma.mobileDevice.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        include: {
          tenant: { select: { id: true, name: true, businessType: true } },
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
    ]);
    return {
      items: rows.map(({ pushToken, ...d }) => ({ ...d, hasPush: !!pushToken })),
      total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async detail(id: string) {
    const device = await this.prisma.mobileDevice.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, businessType: true, status: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true, role: true, language: true, lastLoginAt: true } },
      },
    });
    if (!device) throw new NotFoundException('Device not found');
    const since = new Date(Date.now() - 60 * 86_400_000);
    const [days, others] = await Promise.all([
      this.prisma.mobileDeviceDay.findMany({ where: { deviceId: id, day: { gte: since } }, select: { day: true }, orderBy: { day: 'asc' } }),
      this.prisma.mobileDevice.findMany({
        where: { userId: device.userId, id: { not: id } },
        select: { id: true, platform: true, appVersion: true, deviceModel: true, lastSeenAt: true },
        orderBy: { lastSeenAt: 'desc' }, take: 10,
      }),
    ]);
    const { pushToken, ...rest } = device;
    return {
      ...rest,
      hasPush: !!pushToken,
      // Only a short prefix leaves the server.
      pushTokenPreview: pushToken ? `${pushToken.slice(0, 24)}…` : null,
      activeDays: days.map((d) => d.day.toISOString().slice(0, 10)),
      otherDevices: others,
    };
  }

  /** Stops pushes to this device; the next heartbeat with a token turns them back on. */
  async clearPush(id: string) {
    const device = await this.prisma.mobileDevice.findUnique({ where: { id }, select: { pushToken: true, userId: true } });
    if (!device) throw new NotFoundException('Device not found');
    await this.prisma.mobileDevice.update({ where: { id }, data: { pushToken: null } });
    await this.registerToken(device.userId, null, device.pushToken);
    return { ok: true };
  }

  /** Forgets the device record. It reappears on its next heartbeat. */
  async remove(id: string) {
    const found = await this.prisma.mobileDevice.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Device not found');
    await this.prisma.mobileDevice.delete({ where: { id } });
    return { ok: true };
  }
}
