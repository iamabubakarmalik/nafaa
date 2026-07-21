import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SettingsSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verify manager PIN */
  async verifyPin(user: AuthenticatedUser, pin: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { managerPin: true },
    });
    if (!settings?.managerPin) {
      return { valid: false, message: 'PIN set nahi hai' };
    }
    const ok = await comparePassword(pin, settings.managerPin);

    if (!ok) {
      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'PIN_VERIFY_FAILED',
          description: 'Wrong PIN attempt',
        },
      });
    }

    return { valid: ok, message: ok ? 'PIN correct' : 'Ghalat PIN' };
  }

  /** Set / change PIN */
  async setPin(user: AuthenticatedUser, pin: string) {
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Sirf owner/manager PIN set kar sakte hain');
    }

    const hashed = await hashPassword(pin);
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, managerPin: hashed },
      update: { managerPin: hashed },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PIN_SET',
        description: 'Manager PIN set/changed',
      },
    });

    return { success: true, message: 'PIN save ho gayi' };
  }

  /** Remove PIN (requires current PIN) */
  async removePin(user: AuthenticatedUser, currentPin: string) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Sirf owner PIN remove kar sakte hain');
    }
    const verify = await this.verifyPin(user, currentPin);
    if (!verify.valid) throw new UnauthorizedException('Ghalat current PIN');

    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: { managerPin: null },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PIN_REMOVED',
        description: 'Manager PIN removed',
      },
    });

    return { success: true, message: 'PIN remove ho gayi' };
  }

  /** List all active sessions for tenant (owner-only for team visibility) */
  async listAllSessions(user: AuthenticatedUser) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Sirf owner sab sessions dekh sakta hai');
    }
    const users = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, fullName: true, email: true, role: true },
    });
    const userIds = users.map((u) => u.id);

    const sessions = await this.prisma.session.findMany({
      where: { userId: { in: userIds }, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return sessions.map((s) => ({
      ...s,
      user: userMap.get(s.userId),
      refreshTokenHash: undefined, // never expose
    }));
  }

  /** Revoke a session by id */
  async revokeSession(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const owner = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });
    if (owner?.tenantId !== user.tenantId) throw new ForbiddenException();

    await this.prisma.session.delete({ where: { id: sessionId } });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'SESSION_REVOKED',
        entityType: 'Session',
        entityId: sessionId,
        description: `Revoked session ${session.deviceName || sessionId}`,
      },
    });

    return { success: true };
  }

  /** Recent login history for the tenant */
  async loginHistory(user: AuthenticatedUser, limit = 50) {
    return this.prisma.loginHistory.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
  }

  /** Activity audit log */
  async activityLog(user: AuthenticatedUser, params: { limit?: number; action?: string; userId?: string }) {
    return this.prisma.activityLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.action && { action: params.action }),
        ...(params.userId && { userId: params.userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  /** Compute a security score for the current tenant */
  async securityScore(user: AuthenticatedUser) {
    const [settings, ownerUser, sessionsCount] = await Promise.all([
      this.prisma.tenantSettings.findUnique({
        where: { tenantId: user.tenantId },
        select: {
          managerPin: true, enableTwoFactor: true, requirePinForRefund: true,
          requirePinForVoid: true, requirePinForDiscount: true, autoLogoutMinutes: true,
        },
      }),
      this.prisma.user.findFirst({
        where: { tenantId: user.tenantId, role: 'OWNER' },
        select: { emailVerified: true, passwordHash: true, googleId: true },
      }),
      this.prisma.session.count({
        where: { user: { tenantId: user.tenantId }, expiresAt: { gt: new Date() } },
      }),
    ]);

    const checks = [
      { key: 'managerPin', label: 'Manager PIN set hai', done: !!settings?.managerPin, weight: 20 },
      { key: 'twoFactor', label: '2FA enabled', done: !!settings?.enableTwoFactor, weight: 20 },
      { key: 'refundPin', label: 'Refund pe PIN required', done: !!settings?.requirePinForRefund, weight: 10 },
      { key: 'voidPin', label: 'Void pe PIN required', done: !!settings?.requirePinForVoid, weight: 10 },
      { key: 'emailVerified', label: 'Owner email verified', done: !!ownerUser?.emailVerified, weight: 15 },
      { key: 'passwordSet', label: 'Password set', done: !!ownerUser?.passwordHash, weight: 15 },
      { key: 'autoLogout', label: 'Auto-logout <= 60 min', done: (settings?.autoLogoutMinutes ?? 60) <= 60, weight: 10 },
    ];

    const score = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
    const level = score >= 80 ? 'STRONG' : score >= 50 ? 'MEDIUM' : 'WEAK';

    return {
      score,
      level,
      checks,
      activeSessions: sessionsCount,
      recommendations: checks.filter((c) => !c.done).map((c) => c.label),
    };
  }
}
