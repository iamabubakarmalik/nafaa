import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { generateOtp, generateSlug } from '../../common/utils/slug.util';
import { AdminNotificationsService } from '../admin/notifications/admin-notifications.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpPurpose } from './dto/send-otp.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

function makeReferralCode(seed: string): string {
  const clean = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NAFAA-${clean || 'SHOP'}${rand}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly adminNotifications: AdminNotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) throw new ConflictException('Phone number already registered');
    }

    let referrer = null as null | { id: string };
    if (dto.referralCode) {
      const code = dto.referralCode.trim().toUpperCase();
      const found = await this.prisma.tenant.findUnique({
        where: { referralCode: code },
      });
      if (!found) throw new BadRequestException('Invalid referral code');
      referrer = { id: found.id };
    }

    const passwordHash = await hashPassword(dto.password);
    const slug = generateSlug(dto.shopName);

    let myCode = makeReferralCode(dto.shopName);
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await this.prisma.tenant.findUnique({
        where: { referralCode: myCode },
      });
      if (!exists) break;
      myCode = makeReferralCode(dto.shopName);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          slug,
          phone: dto.phone,
          referralCode: myCode,
          referredById: referrer?.id ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          fullName: dto.fullName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          passwordHash,
          role: UserRole.OWNER,
        },
      });

      if (referrer) {
        await tx.referral.create({
          data: {
            referrerTenantId: referrer.id,
            refereeTenantId: tenant.id,
            code: dto.referralCode!.toUpperCase(),
            status: 'PENDING',
          },
        });

        await tx.notification.create({
          data: {
            tenantId: referrer.id,
            type: 'REFERRAL_SIGNUP',
            title: 'New Referral Signup! 🎉',
            message: `${dto.shopName} ne aap ke code se signup kiya.`,
            link: '/referrals',
          },
        });
      }

      return { tenant, user };
    });

    // Notify admin about new tenant
    this.adminNotifications
      .create({
        type: 'NEW_TENANT',
        priority: 'NORMAL',
        title: '🎉 New Shop Registered!',
        message: `${result.tenant.name} (${result.user.fullName}) ne signup kiya hai${
          referrer ? ' (via referral)' : ''
        }`,
        link: `/tenants/${result.tenant.id}`,
        tenantId: result.tenant.id,
        entityType: 'tenant',
        entityId: result.tenant.id,
        metadata: {
          email: result.user.email,
          phone: result.user.phone,
          referralCode: dto.referralCode,
        },
      })
      .catch((e) => console.error('Admin notification failed:', e.message));

    // Welcome email + SMS
    this.emailService
      .send({
        tenantId: result.tenant.id,
        templateSlug: 'welcome',
        toEmail: result.user.email,
        toName: result.user.fullName,
        variables: {
          name: result.user.fullName,
          shopName: result.tenant.name,
          loginUrl: this.configService.get<string>('APP_URL') + '/login',
        },
      })
      .catch((e) => console.error('Welcome email failed:', e.message));

    if (result.user.phone) {
      this.smsService
        .send({
          tenantId: result.tenant.id,
          templateSlug: 'welcome',
          toPhone: result.user.phone,
          variables: {
            name: result.user.fullName,
            shopName: result.tenant.name,
            loginUrl: this.configService.get<string>('APP_URL') + '/login',
          },
        })
        .catch((e) => console.error('Welcome SMS failed:', e.message));
    }

    const tokens = await this.issueTokens({
      sub: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role,
    });

    return {
      user: this.sanitizeUser(result.user),
      tenant: result.tenant,
      ...tokens,
    };
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await comparePassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(
      {
        sub: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      },
      meta?.userAgent,
      meta?.ip,
    );

    return {
      user: this.sanitizeUser(user),
      tenant: user.tenant,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.session.findMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
    });

    let matched: (typeof sessions)[number] | null = null;
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) {
        matched = s;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Session expired or revoked');

    await this.prisma.session.delete({ where: { id: matched.id } });

    const cleanPayload: JwtPayload = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    };

    return this.issueTokens(cleanPayload);
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

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      user: this.sanitizeUser(user),
      tenant: user.tenant,
    };
  }

  async sendOtp(email: string, purpose: OtpPurpose) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const code = generateOtp(6);
    const expiresAt = addMinutes(new Date(), 10);

    await this.prisma.otpCode.create({
      data: {
        email: email.toLowerCase(),
        userId: user?.id ?? null,
        code,
        purpose,
        expiresAt,
      },
    });

    this.emailService
      .send({
        tenantId: user?.tenantId,
        toEmail: email.toLowerCase(),
        toName: user?.fullName,
        subject: `Your Nafaa OTP code: ${code}`,
        bodyHtml: `<h2>Your OTP Code</h2><p>Your verification code is: <strong style="font-size:24px">${code}</strong></p><p>Valid for 10 minutes.</p>`,
        bodyText: `Your Nafaa OTP code is: ${code}. Valid for 10 minutes.`,
      })
      .catch((e) => console.error('OTP email failed:', e.message));

    console.log(`📧 OTP for ${email} (${purpose}): ${code}`);

    return {
      success: true,
      message: 'OTP sent successfully',
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  async verifyOtp(email: string, code: string, purpose: OtpPurpose) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        purpose,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });

    if (purpose === OtpPurpose.VERIFY_EMAIL && otp.userId) {
      await this.prisma.user.update({
        where: { id: otp.userId },
        data: { emailVerified: true },
      });
    }

    return { success: true, message: 'OTP verified successfully' };
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

  private sanitizeUser<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash: _ph, ...rest } = user as T & { passwordHash: string };
    return rest;
  }
}
