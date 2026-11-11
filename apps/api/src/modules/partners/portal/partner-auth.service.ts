/**
 * Partner portal sign-up and sign-in.
 *
 * A partner is a User with role PARTNER in the internal "nafaa-system" shop,
 * plus a Partner row. The User gets an internal email ("np…@partner.nafaa.pk")
 * so a person who already has a shop account with the same email or phone
 * can still become a partner; their real email and phone live on Partner.
 */

import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PartnerType, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../../common/utils/password.util';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { SYSTEM_TENANT_SLUG, makePartnerCode, normalizePhone } from '../shared/partner-utils';

export interface PartnerApplyInput {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  cnic?: string;
  city?: string;
  type?: string;
  payoutMethod?: string;
  payoutAccount?: string;
  payoutTitle?: string;
  bankName?: string;
  managerCode?: string;
  notes?: string;
}

const SELF_TYPES: PartnerType[] = [PartnerType.REFERRAL, PartnerType.FIELD_AGENT, PartnerType.RESELLER, PartnerType.TRAINER];
const PAYOUT_METHODS = ['JAZZCASH', 'EASYPAISA', 'BANK'];
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

@Injectable()
export class PartnerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async apply(input: PartnerApplyInput, meta?: { userAgent?: string; ip?: string }) {
    const fullName = str(input.fullName, 120);
    const phone = normalizePhone(str(input.phone, 30));
    const email = str(input.email, 160).toLowerCase() || null;
    const password = typeof input.password === 'string' ? input.password : '';
    const cnic = str(input.cnic, 20).replace(/\D/g, '') || null;
    const type = (str(input.type, 20).toUpperCase() || 'REFERRAL') as PartnerType;
    const payoutMethod = str(input.payoutMethod, 20).toUpperCase() || null;

    if (fullName.length < 3) throw new BadRequestException('Poora naam likhein');
    if (!/^03\d{9}$/.test(phone)) throw new BadRequestException('Mobile number 03xxxxxxxxx shakal me likhein');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email durust nahi');
    if (password.length < 8) throw new BadRequestException('Password kam az kam 8 huroof ka ho');
    if (cnic && cnic.length !== 13) throw new BadRequestException('CNIC 13 hindsay ka hota hai');
    if (!SELF_TYPES.includes(type)) throw new BadRequestException('Partner ki qisam durust nahi');
    if (payoutMethod && !PAYOUT_METHODS.includes(payoutMethod)) throw new BadRequestException('Payout ka tareeqa durust nahi');

    if (await this.prisma.partner.findUnique({ where: { phone }, select: { id: true } })) {
      throw new ConflictException('Is number se pehle hi application di ja chuki hai. Sign in karein.');
    }
    if (email && (await this.prisma.partner.findFirst({ where: { email }, select: { id: true } }))) {
      throw new ConflictException('Is email se pehle hi application di ja chuki hai. Sign in karein.');
    }

    let managerId: string | null = null;
    const managerCode = str(input.managerCode, 20).toUpperCase();
    if (managerCode) {
      const manager = await this.prisma.partner.findUnique({ where: { code: managerCode }, select: { id: true, isManager: true, status: true } });
      if (!manager || !manager.isManager || manager.status !== 'ACTIVE') throw new BadRequestException('Manager ka code durust nahi');
      managerId = manager.id;
    }

    const system = await this.systemTenant();

    let code = makePartnerCode();
    for (let i = 0; i < 5 && (await this.prisma.partner.findUnique({ where: { code }, select: { id: true } })); i++) code = makePartnerCode();

    const passwordHash = await hashPassword(password);
    const partner = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: system.id,
          email: `${code.toLowerCase()}@partner.nafaa.pk`,
          fullName,
          role: UserRole.PARTNER,
          passwordHash,
          isActive: true,
          emailVerified: false,
        },
      });
      return tx.partner.create({
        data: {
          userId: user.id, code, type, fullName, phone, email, cnic,
          city: str(input.city, 80) || null,
          payoutMethod,
          payoutAccount: str(input.payoutAccount, 60) || null,
          payoutTitle: str(input.payoutTitle, 120) || null,
          bankName: str(input.bankName, 80) || null,
          notes: str(input.notes, 1000) || null,
          managerId,
        },
      });
    });

    return { ...(await this.issueTokens(partner.userId, system.id, meta)), partner: await this.me(partner.userId) };
  }

  async login(input: { login?: string; password?: string }, meta?: { userAgent?: string; ip?: string }) {
    const login = str(input.login, 160);
    const password = typeof input.password === 'string' ? input.password : '';
    if (!login || !password) throw new UnauthorizedException('Number/email aur password likhein');
    const phone = normalizePhone(login);
    const partner = await this.prisma.partner.findFirst({
      where: /^03\d{9}$/.test(phone) ? { phone } : { email: login.toLowerCase() },
      include: { user: { select: { id: true, tenantId: true, passwordHash: true, isActive: true } } },
    });
    if (!partner?.user.passwordHash || !(await comparePassword(password, partner.user.passwordHash))) {
      throw new UnauthorizedException('Number/email ya password ghalat hai');
    }
    if (!partner.user.isActive || partner.status === 'REJECTED') throw new UnauthorizedException('Ye partner account band hai. Nafaa se rabta karein.');
    await this.prisma.user.update({ where: { id: partner.user.id }, data: { lastLoginAt: new Date() } });
    return { ...(await this.issueTokens(partner.user.id, partner.user.tenantId, meta)), partner: await this.me(partner.user.id) };
  }

  async refresh(refreshToken: string | undefined, meta?: { userAgent?: string; ip?: string }) {
    if (!refreshToken) throw new UnauthorizedException();
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: this.config.get<string>('JWT_REFRESH_SECRET')! });
    } catch {
      throw new UnauthorizedException('Session khatam. Dobara sign in karein.');
    }
    if (payload.role !== UserRole.PARTNER) throw new UnauthorizedException();
    const sessions = await this.prisma.session.findMany({ where: { userId: payload.sub, expiresAt: { gt: new Date() } } });
    let match: string | null = null;
    for (const s of sessions) if (await comparePassword(refreshToken, s.refreshTokenHash)) { match = s.id; break; }
    if (!match) throw new UnauthorizedException('Session khatam. Dobara sign in karein.');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true, tenantId: true } });
    if (!user?.isActive) throw new UnauthorizedException();
    await this.prisma.session.delete({ where: { id: match } });
    return this.issueTokens(payload.sub, user.tenantId, meta);
  }

  async logout(userId: string, refreshToken?: string) {
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    for (const s of sessions) {
      if (!refreshToken || (await comparePassword(refreshToken, s.refreshTokenHash))) {
        await this.prisma.session.delete({ where: { id: s.id } });
        if (refreshToken) break;
      }
    }
    return { success: true };
  }

  async changePassword(userId: string, input: { current?: string; next?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user?.passwordHash || !(await comparePassword(String(input.current ?? ''), user.passwordHash))) throw new BadRequestException('Purana password ghalat hai');
    if (String(input.next ?? '').length < 8) throw new BadRequestException('Naya password kam az kam 8 huroof ka ho');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(String(input.next)) } });
    return { success: true };
  }

  /** The signed-in partner's own profile. */
  async me(userId: string) {
    const p = await this.prisma.partner.findUnique({
      where: { userId },
      include: { manager: { select: { fullName: true, phone: true } }, plan: true },
    });
    if (!p) throw new UnauthorizedException();
    return {
      id: p.id, code: p.code, type: p.type, status: p.status, fullName: p.fullName, phone: p.phone, email: p.email, cnic: p.cnic,
      city: p.city, territory: p.territory, isManager: p.isManager, incentivesOn: p.incentivesOn, salary: p.type === 'EMPLOYEE' ? p.salary : null,
      payoutMethod: p.payoutMethod, payoutAccount: p.payoutAccount, payoutTitle: p.payoutTitle, bankName: p.bankName,
      rejectReason: p.status === 'REJECTED' ? p.rejectReason : null,
      manager: p.manager, appliedAt: p.appliedAt, approvedAt: p.approvedAt,
    };
  }

  /** The internal Nafaa shop partner accounts belong to (falls back to a super admin's shop, like admin staff). */
  private async systemTenant(): Promise<{ id: string }> {
    const system = await this.prisma.tenant.findUnique({ where: { slug: SYSTEM_TENANT_SLUG }, select: { id: true } });
    if (system) return system;
    const admin = await this.prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN }, orderBy: { createdAt: 'asc' }, select: { tenantId: true } });
    if (!admin) throw new BadRequestException('Partner sign-up abhi band hai. Nafaa se rabta karein.');
    return { id: admin.tenantId };
  }

  private async issueTokens(userId: string, tenantId: string, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const payload: JwtPayload = { sub: userId, tenantId, email: user!.email, role: UserRole.PARTNER };
    const accessToken = await this.jwt.signAsync({ ...payload }, { secret: this.config.get<string>('JWT_ACCESS_SECRET')!, expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') as unknown as number });
    const refreshToken = await this.jwt.signAsync({ ...payload }, { secret: this.config.get<string>('JWT_REFRESH_SECRET')!, expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') as unknown as number });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.prisma.session.create({ data: { userId, refreshTokenHash: await hashPassword(refreshToken), userAgent: meta?.userAgent, ipAddress: meta?.ip, expiresAt } });
    return { accessToken, refreshToken };
  }
}
