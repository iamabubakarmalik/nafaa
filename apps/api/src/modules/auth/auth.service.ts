import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, UserRole } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';
import * as crypto from 'crypto';
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

  // ===== REGISTER (Email/Password — NO OTP) =====
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) throw new ConflictException('Phone already registered');
    }

    let referrer: { id: string } | null = null;
    if (dto.referralCode) {
      const found = await this.prisma.tenant.findUnique({
        where: { referralCode: dto.referralCode.trim().toUpperCase() },
      });
      if (!found) throw new BadRequestException('Invalid referral code');
      referrer = { id: found.id };
    }

    const passwordHash = await hashPassword(dto.password);
    const slug = generateSlug(dto.shopName);

    let myCode = makeReferralCode(dto.shopName);
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.tenant.findUnique({ where: { referralCode: myCode } });
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
          authProvider: AuthProvider.EMAIL,
          emailVerified: false,
        },
      });

      await tx.onboardingProgress.create({
        data: { tenantId: tenant.id, userId: user.id, currentStep: 1 },
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

    this.notifyAdminNewSignup(result.tenant, result.user, 'EMAIL', dto.referralCode);
    this.sendWelcomeEmail(result.tenant, result.user);

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

  // ===== LOGIN (Email/Password) =====
  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Google-only user can't login with password
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Ye account Google se bana hai. "Continue with Google" use karein ya password set karein.',
      );
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

  // ===== GOOGLE AUTH (Core logic — used by web callback AND mobile) =====
  async googleAuth(googleUser: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) {
    // Find existing user by googleId OR email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.googleId },
          { email: googleUser.email.toLowerCase() },
        ],
      },
      include: { tenant: true },
    });

    if (user) {
      // Existing user → link Google if not already linked
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            avatarUrl: googleUser.avatarUrl ?? user.avatarUrl,
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
            authProvider: user.passwordHash ? AuthProvider.HYBRID : AuthProvider.GOOGLE,
            lastLoginAt: new Date(),
          },
          include: { tenant: true },
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }

      const tokens = await this.issueTokens({
        sub: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      });

      return {
        user: this.sanitizeUser(user),
        tenant: user.tenant,
        ...tokens,
        isNewUser: false,
      };
    }

    // No user found → return tempToken so frontend can ask for shopName
    const tempToken = await this.jwtService.signAsync(
      {
        googleId: googleUser.googleId,
        email: googleUser.email,
        fullName: googleUser.fullName,
        avatarUrl: googleUser.avatarUrl,
        purpose: 'google_signup',
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    return {
      needsShopName: true,
      tempToken,
      email: googleUser.email,
      fullName: googleUser.fullName,
      avatarUrl: googleUser.avatarUrl,
    };
  }

  // ===== COMPLETE GOOGLE SIGNUP (new user provides shopName) =====
  async completeGoogleSignup(tempToken: string, shopName: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Token expired ya invalid — Google se dobara try karein');
    }

    if (payload.purpose !== 'google_signup') {
      throw new BadRequestException('Invalid token');
    }

    // Double-check user doesn't exist now
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: payload.googleId }, { email: payload.email.toLowerCase() }],
      },
      include: { tenant: true },
    });
    if (existing) {
      // Existing user — just log them in
      return this.googleAuth({
        googleId: payload.googleId,
        email: payload.email,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
      });
    }

    const slug = generateSlug(shopName);
    const referralCode = makeReferralCode(shopName);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: shopName, slug, referralCode },
      });

      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          fullName: payload.fullName,
          email: payload.email.toLowerCase(),
          passwordHash: null, // Google-only user
          googleId: payload.googleId,
          avatarUrl: payload.avatarUrl,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          authProvider: AuthProvider.GOOGLE,
          role: UserRole.OWNER,
        },
      });

      await tx.onboardingProgress.create({
        data: { tenantId: tenant.id, userId: newUser.id, currentStep: 1 },
      });

      return { tenant, user: newUser };
    });

    this.notifyAdminNewSignup(result.tenant, result.user, 'GOOGLE');
    this.sendWelcomeEmail(result.tenant, result.user);

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
      isNewUser: true,
    };
  }

  // ===== GOOGLE MOBILE — verify ID token from native SDK =====
  async googleMobile(idToken: string, shopName?: string) {
    // Verify ID token with Google's tokeninfo endpoint
    let payload: any;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!res.ok) throw new Error('Token verification failed');
      payload = await res.json();
    } catch {
      throw new BadRequestException('Google ID token invalid');
    }

    if (!payload?.sub || !payload?.email) {
      throw new BadRequestException('Google token mein required fields nahi');
    }

    // Verify audience matches our client IDs
    const allowedAudiences = [
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID'),
    ].filter(Boolean);

    if (allowedAudiences.length > 0 && !allowedAudiences.includes(payload.aud)) {
      throw new BadRequestException('Token audience galat hai');
    }

    const googleUser = {
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture,
    };

    const result = await this.googleAuth(googleUser);

    // If needs shopName and we have it, complete signup immediately
    if ('needsShopName' in result && result.needsShopName && shopName) {
      return this.completeGoogleSignup(result.tempToken, shopName);
    }

    return result;
  }

  // ===== SET PASSWORD (Google-only user wants to add password) =====
  async setPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.passwordHash) {
      throw new BadRequestException(
        'Aap ka password pehle se set hai. Change password use karein.',
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        authProvider: user.googleId ? AuthProvider.HYBRID : AuthProvider.EMAIL,
      },
    });

    return { success: true, message: 'Password set ho gaya — ab aap email/password se bhi login kar sakte hain' };
  }

  // ===== CHANGE PASSWORD =====
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!user.passwordHash) {
      throw new BadRequestException('Aap ka password set nahi hai. Pehle "Set Password" use karein.');
    }

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password galat hai');

    if (currentPassword === newPassword) {
      throw new BadRequestException('Naya password purane se alag hona chahiye');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return { success: true, message: 'Password change ho gaya' };
  }

  // ===== DISCONNECT GOOGLE =====
  async disconnectGoogle(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!user.googleId) {
      throw new BadRequestException('Google account connected nahi hai');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Pehle password set karein, phir Google disconnect kar sakte hain (warna login nahi kar paayenge)',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId: null,
        authProvider: AuthProvider.EMAIL,
      },
    });

    return { success: true, message: 'Google account disconnect ho gaya' };
  }

  // ===== EMAIL VERIFICATION (Send OTP for in-app verify) =====
  async sendVerifyEmailOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.emailVerified) {
      return { success: true, message: 'Email already verified', alreadyVerified: true };
    }

    const code = generateOtp(6);
    await this.prisma.otpCode.create({
      data: {
        email: user.email,
        userId: user.id,
        code,
        purpose: OtpPurpose.VERIFY_EMAIL,
        expiresAt: addMinutes(new Date(), 10),
      },
    });

    this.emailService
      .send({
        tenantId: user.tenantId,
        toEmail: user.email,
        toName: user.fullName,
        subject: `🔐 Nafaa Email Verification Code: ${code}`,
        bodyHtml: this.otpEmailTemplate({ name: user.fullName, code }),
        bodyText: `Aap ka verification code: ${code}. 10 minutes ke liye valid hai.`,
      })
      .catch((e) => console.error('Verify email OTP failed:', e.message));

    console.log(`📧 Verify-email OTP for ${user.email}: ${code}`);

    return {
      success: true,
      message: 'OTP code email pe bhej diya gaya',
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  async confirmVerifyEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.emailVerified) {
      return { success: true, message: 'Email already verified' };
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email: user.email,
        code,
        purpose: OtpPurpose.VERIFY_EMAIL,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Invalid ya expired OTP');

    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    return { success: true, message: 'Email successfully verified! ✅' };
  }

  // ===== REFRESH =====
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

    return this.issueTokens({
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    });
  }

  // ===== LOGOUT =====
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

  // ===== ME =====
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

  // ===== FORGOT PASSWORD =====
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      return { success: true, message: 'Agar email registered hai, link bhej diya gaya' };
    }

    if (!user.passwordHash) {
      return {
        success: true,
        message: 'Ye account Google se bana hai — Continue with Google use karein',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: addHours(new Date(), 1),
      },
    });

    const resetUrl = `${this.configService.get('APP_URL')}/reset-password?token=${token}`;

    this.emailService
      .send({
        tenantId: user.tenantId,
        toEmail: user.email,
        toName: user.fullName,
        subject: '🔐 Password Reset — Nafaa',
        bodyHtml: this.passwordResetEmailTemplate({
          name: user.fullName,
          resetUrl,
          shopName: user.tenant.name,
        }),
        bodyText: `Reset link: ${resetUrl} (1 ghante mein expire)`,
      })
      .catch(() => {});

    return { success: true, message: 'Agar email registered hai, link bhej diya gaya' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('Invalid ya expired token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordResetToken: null,
        passwordResetExpires: null,
        authProvider: user.googleId ? AuthProvider.HYBRID : AuthProvider.EMAIL,
      },
    });

    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    return { success: true, message: 'Password reset ho gaya' };
  }

  // ===== UPDATE PROFILE =====
  async updateProfile(
    userId: string,
    data: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    const updates: any = {};
    if (data.fullName) updates.fullName = data.fullName;
    if (data.phone !== undefined) updates.phone = data.phone || null;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl || null;

    if (updates.phone) {
      const exists = await this.prisma.user.findFirst({
        where: { phone: updates.phone, id: { not: userId } },
      });
      if (exists) throw new ConflictException('Phone already in use');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
      include: { tenant: true },
    });

    return this.sanitizeUser(user);
  }

  // ===== HELPERS =====
  private async issueTokens(payload: JwtPayload, userAgent?: string, ip?: string) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')!;
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!;

    const accessToken = await this.jwtService.signAsync(
      { ...payload },
      { secret: accessSecret, expiresIn: accessExpires as any },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...payload },
      { secret: refreshSecret, expiresIn: refreshExpires as any },
    );

    const refreshTokenHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.session.create({
      data: { userId: payload.sub, refreshTokenHash, userAgent, ipAddress: ip, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash, ...rest } = user as any;
    return {
      ...rest,
      hasPassword: !!passwordHash,
    };
  }

  private notifyAdminNewSignup(tenant: any, user: any, provider: string, referralCode?: string) {
    this.adminNotifications
      .create({
        type: 'NEW_TENANT',
        priority: 'NORMAL',
        title: `🎉 New Shop (${provider})`,
        message: `${tenant.name} (${user.fullName}) ne ${provider.toLowerCase()} se signup kiya`,
        link: `/tenants/${tenant.id}`,
        tenantId: tenant.id,
        entityType: 'tenant',
        entityId: tenant.id,
        metadata: { email: user.email, provider, referralCode },
      })
      .catch(() => {});
  }

  private sendWelcomeEmail(tenant: any, user: any) {
    this.emailService
      .send({
        tenantId: tenant.id,
        templateSlug: 'welcome',
        toEmail: user.email,
        toName: user.fullName,
        variables: {
          name: user.fullName,
          shopName: tenant.name,
          loginUrl: this.configService.get<string>('APP_URL') + '/login',
        },
      })
      .catch(() => {});
  }

  private otpEmailTemplate({ name, code }: { name: string; code: string }) {
    return `
<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" style="padding:40px 20px"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px;text-align:center">
  <h1 style="color:#fff;margin:0">🔐 Verification Code</h1>
</td></tr>
<tr><td style="padding:32px;text-align:center">
  <p style="font-size:15px;color:#475569">Assalam-o-Alaikum <strong>${name}</strong>,</p>
  <p style="font-size:14px;color:#475569">Aap ka verification code:</p>
  <div style="font-size:42px;font-weight:bold;color:#16a34a;letter-spacing:8px;margin:24px 0;padding:20px;background:#f0fdf4;border-radius:12px">${code}</div>
  <p style="font-size:13px;color:#dc2626;background:#fee2e2;padding:12px;border-radius:8px">⏰ 10 minutes ke liye valid</p>
</td></tr>
</table></td></tr></table></body></html>`;
  }

  private passwordResetEmailTemplate({ name, resetUrl, shopName }: any) {
    return `
<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" style="padding:40px 20px"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px;text-align:center">
  <h1 style="color:#fff;margin:0">🔐 Password Reset</h1>
  <p style="color:#dcfce7;margin:8px 0 0">${shopName}</p>
</td></tr>
<tr><td style="padding:32px">
  <p>Assalam-o-Alaikum <strong>${name}</strong>,</p>
  <p style="color:#475569">Password reset karne ke liye button par click karein:</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold">Reset Password →</a>
  </p>
  <p style="font-size:12px;color:#dc2626;background:#fee2e2;padding:12px;border-radius:8px">⏰ Link 1 ghante mein expire ho jayega</p>
</td></tr>
</table></td></tr></table></body></html>`;
  }
}
