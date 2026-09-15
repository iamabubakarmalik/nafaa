import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../../../common/utils/password.util';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SettingsSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  /* ═══════════════════════════════════════════════════════════
     MALIK KA PIN — ek hi PIN, poore app me
     ───────────────────────────────────────────────────────────
     Pehle teen alag alag PIN thay: ek `privacy.store` ka (cost
     chhupane ke liye), ek `useAppLock` ka (khata lock karne ke
     liye) — dono browser ke localStorage me — aur ek yahan server
     par jo koi use hi nahi kar raha tha.

     Natija: malik doosre mobile par login karta to PIN kaam hi
     nahi karta tha, aur browser ka data saaf karne par PIN gayab.

     Ab sirf YEHI PIN hai. Har device par wohi. Bhool jayein to
     account ka password daal kar naya set ho jata hai.
     ═══════════════════════════════════════════════════════════ */

  /** Malik PIN aur page-lock ka intezam kar sakta hai ya nahi */
  private canManage(user: AuthenticatedUser) {
    return user.role === 'OWNER' || user.role === 'MANAGER';
  }

  /**
   * App khulte hi yahan se pata chalta hai ke PIN laga hai ya nahi
   * aur kaun se safhe lock hain. PIN ka hash kabhi bahar nahi jata.
   */
  async pinStatus(user: AuthenticatedUser) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        managerPin: true,
        managerPinUpdatedAt: true,
        lockedRoutes: true,
        pinUnlockMinutes: true,
        hideCostByDefault: true,
      },
    });

    return {
      hasPin: !!settings?.managerPin,
      pinUpdatedAt: settings?.managerPinUpdatedAt ?? null,
      lockedRoutes: settings?.lockedRoutes ?? [],
      unlockMinutes: settings?.pinUnlockMinutes ?? 15,
      hideCostByDefault: settings?.hideCostByDefault ?? false,
      canManage: this.canManage(user),
    };
  }

  /**
   * PIN bhool gaye — account ka password daal kar naya PIN.
   *
   * PIN yaad rakhna malik ka kaam hai, magar bhool jana aam baat
   * hai. Pehle iska koi raasta hi nahi tha: browser ka data saaf
   * hua to cost hamesha ke liye chhup jati thi.
   */
  async resetPinWithPassword(user: AuthenticatedUser, password: string, newPin: string) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Sirf owner ya manager PIN badal sakte hain');
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      throw new BadRequestException('PIN 4 se 8 hindson ka hona chahiye');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!account?.passwordHash) {
      throw new BadRequestException(
        'Is account par password set nahi hai (Google se login). Pehle Settings me password banayein.',
      );
    }

    const ok = await comparePassword(password, account.passwordHash);
    if (!ok) {
      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'PIN_RESET_FAILED',
          description: 'Ghalat password se PIN reset ki koshish',
        },
      });
      throw new UnauthorizedException('Ghalat password');
    }

    const hashed = await hashPassword(newPin);
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, managerPin: hashed, managerPinUpdatedAt: new Date() },
      update: { managerPin: hashed, managerPinUpdatedAt: new Date() },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PIN_RESET',
        description: 'Password se naya PIN set kiya',
      },
    });

    return { success: true, message: 'Naya PIN set ho gaya' };
  }

  /** Kaun se safhe PIN ke baghair na khulein — malik khud chunta hai */
  async setLockedRoutes(user: AuthenticatedUser, routes: string[]) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Sirf owner ya manager safhe lock kar sakte hain');
    }

    // Saaf karein: sirf apne app ke andar ke raaste, dohray hataye hue
    const clean = Array.from(
      new Set(
        (routes ?? [])
          .map((r) => String(r ?? '').trim())
          .filter((r) => r.startsWith('/') && !r.startsWith('//') && r.length <= 120),
      ),
    ).slice(0, 60);

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { managerPin: true },
    });

    // Bina PIN ke safha lock karne ka matlab hai khud ko bahar band
    // kar lena — koi unlock kar hi nahi sakta.
    if (clean.length > 0 && !settings?.managerPin) {
      throw new BadRequestException('Pehle PIN set karein, warna lock khulega hi nahi');
    }

    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, lockedRoutes: clean },
      update: { lockedRoutes: clean },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PAGE_LOCKS_UPDATED',
        description: clean.length ? `${clean.length} safhe lock: ${clean.join(', ')}` : 'Sab page lock hata diye',
      },
    });

    return { success: true, lockedRoutes: clean };
  }

  /** PIN kitni der khula rahe, aur cost by-default chhupi rahe ya nahi */
  async updatePinPrefs(
    user: AuthenticatedUser,
    dto: { unlockMinutes?: number; hideCostByDefault?: boolean },
  ) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Sirf owner ya manager ye badal sakte hain');
    }

    const data: { pinUnlockMinutes?: number; hideCostByDefault?: boolean } = {};
    if (dto.unlockMinutes !== undefined) {
      data.pinUnlockMinutes = Math.max(1, Math.min(480, Math.floor(dto.unlockMinutes)));
    }
    if (dto.hideCostByDefault !== undefined) {
      data.hideCostByDefault = dto.hideCostByDefault;
    }

    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, ...data },
      update: data,
    });

    return { success: true, ...data };
  }

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

  /**
   * PIN set ya tabdeel karein.
   *
   * Agar PIN pehle se laga hua hai to purana PIN maangte hain —
   * warna jis ka bhi login khula reh jaye wo chupke se PIN badal
   * kar malik ko hi bahar kar sakta tha.
   */
  async setPin(user: AuthenticatedUser, pin: string, currentPin?: string) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Sirf owner/manager PIN set kar sakte hain');
    }
    if (!/^\d{4,8}$/.test(pin)) {
      throw new BadRequestException('PIN 4 se 8 hindson ka hona chahiye');
    }

    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { managerPin: true },
    });

    if (existing?.managerPin) {
      if (!currentPin) {
        throw new BadRequestException('Purana PIN likhein — ya "PIN bhool gaye" se password daal kar badlein');
      }
      const ok = await comparePassword(currentPin, existing.managerPin);
      if (!ok) throw new UnauthorizedException('Purana PIN ghalat hai');
    }

    const hashed = await hashPassword(pin);
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, managerPin: hashed, managerPinUpdatedAt: new Date() },
      update: { managerPin: hashed, managerPinUpdatedAt: new Date() },
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

  /**
   * PIN hatayein — mojooda PIN se, ya (bhool jane ki soorat me)
   * account ke password se.
   */
  async removePin(user: AuthenticatedUser, currentPin?: string, password?: string) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Sirf owner PIN remove kar sakta hai');
    }

    let allowed = false;

    if (currentPin) {
      const verify = await this.verifyPin(user, currentPin);
      allowed = verify.valid;
    }

    if (!allowed && password) {
      const account = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      allowed = !!account?.passwordHash && (await comparePassword(password, account.passwordHash));
    }

    if (!allowed) throw new UnauthorizedException('Ghalat PIN ya password');

    // PIN hatte hi page-lock bhi hat jaye — warna lock lage safhe
    // hamesha ke liye band ho jate, kyunke unlock ka koi zariya
    // hi baqi nahi rehta.
    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: { managerPin: null, managerPinUpdatedAt: null, lockedRoutes: [] },
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
