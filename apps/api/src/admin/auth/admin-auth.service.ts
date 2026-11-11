import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';
import { AdminLoginDto } from './dto/admin-login.dto';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { invalidateAdminAccess, resolveAdminAccess } from '../access/admin-access';
import { newBackupCodes, newTotpSecret, otpauthUrl, verifyTotp } from '../access/totp';
import { hashInviteToken } from '../staff/admin-staff.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AdminLoginDto, meta?: { userAgent?: string; ip?: string }) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true, adminMember: true },
    });
    const fail = async (reason: string, message = 'Invalid credentials'): Promise<never> => {
      await this.audit('auth.login_failed', email, user?.id ?? null, 401, reason, meta);
      throw new UnauthorizedException(message);
    };

    if (!user || !user.isActive) return fail('Unknown or inactive account');
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN_STAFF) return fail('Not an admin account', 'Admin access only');
    const member = user.adminMember;
    if (user.role === UserRole.ADMIN_STAFF) {
      if (member?.status === 'INVITED') return fail('Invite not accepted', 'Open the invite link in your email to set your password first.');
      if (member?.status !== 'ACTIVE') return fail('Access disabled', 'Your admin access is turned off. Ask the owner.');
    }
    // Admin accounts must have a password (no Google-only admins).
    if (!user.passwordHash) return fail('No password set', 'Admin account has no password set');
    if (!(await comparePassword(dto.password, user.passwordHash))) return fail('Wrong password');

    if (member?.totpEnabled) {
      if (!dto.code) return { twoFactorRequired: true as const };
      if (!(await this.checkSecondFactor(member.id, member.totpSecret, member.backupCodes, dto.code))) {
        return fail('Wrong two-step code', 'That code is not right. Try the newest code in your app.');
      }
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    if (member) await this.prisma.adminMember.update({ where: { id: member.id }, data: { lastActiveAt: new Date() } });

    const tokens = await this.issueTokens(
      { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      meta?.userAgent,
      meta?.ip,
    );
    await this.audit('auth.login', email, user.id, 200, null, meta);

    return { user: await this.me(user.id), ...tokens };
  }

  /** The signed-in admin with what they may do (the admin app hides what they cannot). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, tenantId: true, fullName: true, email: true, phone: true, role: true, isActive: true,
        avatarUrl: true, lastLoginAt: true, createdAt: true,
        adminMember: { select: { totpEnabled: true } },
      },
    });
    const access = user ? await resolveAdminAccess(this.prisma, user.id, user.role) : null;
    if (!user || !access) throw new UnauthorizedException();
    const { adminMember, ...sanitized } = user;
    return {
      ...sanitized,
      isSuperAdmin: access.isSuperAdmin,
      adminRole: access.roleName,
      adminPermissions: access.permissions,
      totpEnabled: adminMember?.totpEnabled ?? false,
    };
  }

  // ─── Two-step sign-in ───────────────────────────────────────

  private async checkSecondFactor(memberId: string, encSecret: string | null, backupCodes: string[], code: string) {
    const secret = decrypt(encSecret);
    if (secret && verifyTotp(secret, code)) return true;
    const hashed = sha256(code.trim().toUpperCase());
    if (backupCodes.includes(hashed)) {
      await this.prisma.adminMember.update({ where: { id: memberId }, data: { backupCodes: backupCodes.filter((c) => c !== hashed) } });
      return true;
    }
    return false;
  }

  /** Member row for any admin; super admins get one on first use (security settings only). */
  private async memberFor(userId: string) {
    const existing = await this.prisma.adminMember.findUnique({ where: { userId } });
    if (existing) return existing;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException();
    return this.prisma.adminMember.create({ data: { userId, status: 'ACTIVE' } });
  }

  async setupTwoFactor(userId: string, email: string) {
    const member = await this.memberFor(userId);
    if (member.totpEnabled) throw new BadRequestException('Two-step sign-in is already on.');
    const secret = newTotpSecret();
    await this.prisma.adminMember.update({ where: { id: member.id }, data: { totpSecret: encrypt(secret) } });
    return { secret, otpauthUrl: otpauthUrl(secret, email) };
  }

  async enableTwoFactor(userId: string, code: string) {
    const member = await this.memberFor(userId);
    const secret = decrypt(member.totpSecret);
    if (!secret) throw new BadRequestException('Start the setup again.');
    if (!verifyTotp(secret, code)) throw new BadRequestException('That code is not right. Check the time on your phone and try the newest code.');
    const codes = newBackupCodes();
    await this.prisma.adminMember.update({ where: { id: member.id }, data: { totpEnabled: true, backupCodes: codes.map(sha256) } });
    return { backupCodes: codes };
  }

  async disableTwoFactor(userId: string, code: string) {
    const member = await this.memberFor(userId);
    if (!member.totpEnabled) return { success: true };
    if (!(await this.checkSecondFactor(member.id, member.totpSecret, member.backupCodes, code))) throw new BadRequestException('That code is not right.');
    await this.prisma.adminMember.update({ where: { id: member.id }, data: { totpEnabled: false, totpSecret: null, backupCodes: [] } });
    return { success: true };
  }

  // ─── Invites ────────────────────────────────────────────────

  private async inviteMember(token: string) {
    const member = token
      ? await this.prisma.adminMember.findFirst({
          where: { inviteTokenHash: hashInviteToken(token), status: 'INVITED' },
          include: { user: { select: { id: true, email: true, fullName: true } }, role: { select: { name: true } } },
        })
      : null;
    if (!member || !member.inviteExpiresAt || member.inviteExpiresAt < new Date()) {
      throw new BadRequestException('This invite link is not valid any more. Ask for a new one.');
    }
    return member;
  }

  async inviteInfo(token: string) {
    const m = await this.inviteMember(token);
    return { email: m.user.email, fullName: m.user.fullName, roleName: m.role?.name ?? null, expiresAt: m.inviteExpiresAt };
  }

  async acceptInvite(token: string, password: string, meta?: { userAgent?: string; ip?: string }) {
    if (!password || password.length < 10) throw new BadRequestException('Use at least 10 characters for your password.');
    const m = await this.inviteMember(token);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: m.userId }, data: { passwordHash: await hashPassword(password), emailVerified: true } }),
      this.prisma.adminMember.update({ where: { id: m.id }, data: { status: 'ACTIVE', inviteTokenHash: null, inviteExpiresAt: null } }),
    ]);
    invalidateAdminAccess(m.userId);
    await this.audit('auth.invite_accepted', m.user.email, m.userId, 200, null, meta);
    return { success: true, email: m.user.email };
  }

  // ─── Own sessions ───────────────────────────────────────────

  async mySessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, deviceName: true, location: true, lastUsedAt: true, createdAt: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async endMySession(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
    return { success: true };
  }

  private async audit(action: string, email: string, actorId: string | null, statusCode: number, summary: string | null, meta?: { userAgent?: string; ip?: string }) {
    await this.prisma.adminAuditLog.create({
      data: { action, actorId, actorEmail: email, method: 'POST', path: '/api/admin/auth/login', statusCode, summary, ip: meta?.ip ?? null, userAgent: meta?.userAgent?.slice(0, 300) ?? null },
    }).catch(() => undefined);
  }

  /**
   * Swaps a valid refresh token for new tokens (the old session is replaced).
   * Only active admin accounts qualify: a disabled staff member or a removed
   * super admin cannot keep a session alive.
   */
  async refresh(refreshToken: string | undefined, meta?: { userAgent?: string; ip?: string }) {
    if (!refreshToken) throw new UnauthorizedException('Session ended');
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, { secret: this.configService.get<string>('JWT_REFRESH_SECRET')! });
    } catch {
      throw new UnauthorizedException('Session ended');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tenantId: true, email: true, role: true, isActive: true, adminMember: { select: { status: true } } },
    });
    const allowed = !!user?.isActive && (user.role === UserRole.SUPER_ADMIN || (user.role === UserRole.ADMIN_STAFF && user.adminMember?.status === 'ACTIVE'));
    if (!user || !allowed) throw new UnauthorizedException('Session ended');
    const sessions = await this.prisma.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } } });
    let match: string | null = null;
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) { match = s.id; break; }
    }
    if (!match) throw new UnauthorizedException('Session ended');
    await this.prisma.session.delete({ where: { id: match } });
    if (user.adminMember) await this.prisma.adminMember.update({ where: { userId: user.id }, data: { lastActiveAt: new Date() } }).catch(() => undefined);
    return this.issueTokens({ sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role }, meta?.userAgent, meta?.ip);
  }

  async logout(userId: string, refreshToken?: string) {
    if (!refreshToken) {
      await this.prisma.session.deleteMany({ where: { userId } });
      return { success: true };
    }
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) {
        await this.prisma.session.delete({ where: { id: s.id } });
        break;
      }
    }
    return { success: true };
  }

  private async issueTokens(
    payload: JwtPayload,
    userAgent?: string,
    ip?: string,
  ) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')!;
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!;

    const accessToken = await this.jwtService.signAsync(
      { ...payload },
      { secret: accessSecret, expiresIn: accessExpires as unknown as number },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload },
      { secret: refreshSecret, expiresIn: refreshExpires as unknown as number },
    );

    const refreshTokenHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.session.create({
      data: {
        userId: payload.sub,
        refreshTokenHash,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
