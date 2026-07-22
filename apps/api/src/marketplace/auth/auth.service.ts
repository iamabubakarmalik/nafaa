import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MarketplaceAuthProvider, Prisma } from '@prisma/client';
import { addMinutes } from 'date-fns';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { generateOtp } from '../../common/utils/slug.util';
import { parseUserAgent, getLocationFromIp } from '../../common/helpers/device-detection.helper';
import { SmsService } from '../../modules/sms/sms.service';
import { EmailService } from '../../modules/email/email.service';
import { normalizePkPhone } from '../_shared/helpers/phone.helper';
import { generateCustomerReferralCode } from '../_shared/helpers/referral.helper';
import { SendOtpDto, CustomerOtpPurpose } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { CustomerJwtPayload } from './interfaces/customer-jwt.interface';

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SEC = 60;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class MarketplaceAuthService {
  private readonly logger = new Logger(MarketplaceAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // OTP FLOW
  // ═══════════════════════════════════════════════════════════

  async sendOtp(dto: SendOtpDto) {
    const phone = normalizePkPhone(dto.phone);

    // Throttle
    const recent = await this.prisma.customerOtpCode.findFirst({
      where: {
        phone,
        purpose: dto.purpose,
        createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SEC * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const waitSec = Math.ceil(
        (recent.createdAt.getTime() + OTP_RESEND_COOLDOWN_SEC * 1000 - Date.now()) / 1000,
      );
      throw new BadRequestException(`Please wait ${waitSec}s before requesting a new code`);
    }

    // Business rule per purpose
    if (dto.purpose === CustomerOtpPurpose.LOGIN) {
      const existing = await this.prisma.marketplaceCustomer.findUnique({ where: { phone } });
      if (!existing) throw new NotFoundException('Aap ka account nahi mila — pehle register karain');
    }
    if (dto.purpose === CustomerOtpPurpose.REGISTER) {
      const existing = await this.prisma.marketplaceCustomer.findUnique({ where: { phone } });
      if (existing) throw new ConflictException('Ye number pehle se registered hai — login karain');
    }

    const code = generateOtp(6);
    await this.prisma.customerOtpCode.create({
      data: {
        phone,
        code,
        purpose: dto.purpose,
        expiresAt: addMinutes(new Date(), OTP_TTL_MINUTES),
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });

    this.sms
      .send({
        toPhone: phone,
        message: `Nafaa Bazaar: Aap ka verification code hai ${code}. Ye ${OTP_TTL_MINUTES} min ke liye valid hai. Kisi ko na batayein.`,
      })
      .catch((e: any) => this.logger.warn(`SMS send failed for ${phone}: ${e.message}`));

    this.logger.log(`📱 OTP for ${phone} (${dto.purpose}): ${code}`);

    return {
      success: true,
      message: 'OTP bhej diya gaya hai',
      expiresIn: OTP_TTL_MINUTES * 60,
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  async verifyOtp(dto: VerifyOtpDto, meta?: { userAgent?: string; ip?: string }) {
    const phone = normalizePkPhone(dto.phone);

    const otp = await this.prisma.customerOtpCode.findFirst({
      where: {
        phone,
        purpose: dto.purpose,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('OTP expired ya nahi mila');

    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException('Bohat zyada ghalat attempts — naya OTP request karain');
    }

    if (otp.code !== dto.code) {
      await this.prisma.customerOtpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Ghalat code');
    }

    // Mark verified
    await this.prisma.customerOtpCode.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });

    // Dispatch per purpose
    if (dto.purpose === CustomerOtpPurpose.LOGIN) {
      return this.loginAfterOtp(phone, meta);
    }
    if (dto.purpose === CustomerOtpPurpose.REGISTER) {
      if (!dto.fullName || dto.fullName.trim().length < 2) {
        throw new BadRequestException('Full name chahiye register ke liye');
      }
      return this.registerAfterOtp({ phone, fullName: dto.fullName }, meta);
    }
    if (dto.purpose === CustomerOtpPurpose.VERIFY_PHONE) {
      const customer = await this.prisma.marketplaceCustomer.findUnique({ where: { phone } });
      if (customer) {
        await this.prisma.marketplaceCustomer.update({
          where: { id: customer.id },
          data: { phoneVerified: true, phoneVerifiedAt: new Date() },
        });
      }
      return { success: true, message: 'Phone verified ✅' };
    }
    if (dto.purpose === CustomerOtpPurpose.RESET_PASSWORD) {
      return { success: true, verified: true, message: 'OTP verified — ab naya password set karain' };
    }

    return { success: true };
  }

  private async loginAfterOtp(phone: string, meta?: { userAgent?: string; ip?: string }) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({ where: { phone } });
    if (!customer) throw new NotFoundException('Account nahi mila');
    if (customer.isBanned) throw new UnauthorizedException('Ye account banned hai');
    if (!customer.isActive) throw new UnauthorizedException('Account inactive hai');

    await this.prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        phoneVerified: true,
        phoneVerifiedAt: customer.phoneVerifiedAt ?? new Date(),
      },
    });

    return this.buildAuthResponse(customer.id, meta);
  }

  private async registerAfterOtp(
    data: { phone: string; fullName: string; email?: string; referralCode?: string },
    meta?: { userAgent?: string; ip?: string },
  ) {
    let referredById: string | null = null;
    if (data.referralCode) {
      const referrer = await this.prisma.marketplaceCustomer.findUnique({
        where: { referralCode: data.referralCode.trim().toUpperCase() },
      });
      if (referrer) referredById = referrer.id;
    }

    // Unique referral code
    let referralCode = generateCustomerReferralCode(data.fullName);
    for (let i = 0; i < 5; i++) {
      const dup = await this.prisma.marketplaceCustomer.findUnique({ where: { referralCode } });
      if (!dup) break;
      referralCode = generateCustomerReferralCode(data.fullName);
    }

    const customer = await this.prisma.marketplaceCustomer.create({
      data: {
        phone: data.phone,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        fullName: data.fullName,
        email: data.email?.toLowerCase(),
        authProvider: MarketplaceAuthProvider.PHONE_OTP,
        referralCode,
        referredById,
        registeredIp: meta?.ip,
      },
    });

    // Referrer bonus (optional — 100 loyalty points)
    if (referredById) {
      await this.prisma.customerWalletTxn.create({
        data: {
          customerId: referredById,
          type: 'REFERRAL_BONUS',
          amount: 100,
          balanceAfter: 0, // will be recomputed
          reason: `Referred ${data.fullName}`,
          referenceType: 'REFERRAL',
          referenceId: customer.id,
        },
      });
      await this.prisma.marketplaceCustomer.update({
        where: { id: referredById },
        data: { walletBalance: { increment: 100 } },
      });
    }

    return this.buildAuthResponse(customer.id, meta);
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTER / LOGIN with PASSWORD
  // ═══════════════════════════════════════════════════════════

  async registerWithPassword(dto: RegisterCustomerDto, meta?: { userAgent?: string; ip?: string }) {
    const phone = normalizePkPhone(dto.phone);
    const existing = await this.prisma.marketplaceCustomer.findUnique({ where: { phone } });
    if (existing) throw new ConflictException('Ye number pehle se registered hai');
    if (dto.email) {
      const emailExists = await this.prisma.marketplaceCustomer.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (emailExists) throw new ConflictException('Ye email pehle se registered hai');
    }
    if (!dto.password) throw new BadRequestException('Password chahiye');

    let referredById: string | null = null;
    if (dto.referralCode) {
      const referrer = await this.prisma.marketplaceCustomer.findUnique({
        where: { referralCode: dto.referralCode.trim().toUpperCase() },
      });
      if (referrer) referredById = referrer.id;
    }

    let referralCode = generateCustomerReferralCode(dto.fullName);
    for (let i = 0; i < 5; i++) {
      const dup = await this.prisma.marketplaceCustomer.findUnique({ where: { referralCode } });
      if (!dup) break;
      referralCode = generateCustomerReferralCode(dto.fullName);
    }

    const customer = await this.prisma.marketplaceCustomer.create({
      data: {
        phone,
        email: dto.email?.toLowerCase(),
        fullName: dto.fullName,
        passwordHash: await hashPassword(dto.password),
        authProvider: MarketplaceAuthProvider.EMAIL_PASSWORD,
        language: dto.language ?? 'ur',
        referralCode,
        referredById,
        registeredIp: meta?.ip,
      },
    });

    return this.buildAuthResponse(customer.id, meta);
  }

  async loginWithPassword(dto: LoginCustomerDto, meta?: { userAgent?: string; ip?: string }) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Phone ya email chahiye');
    }

    const where: Prisma.MarketplaceCustomerWhereInput = dto.phone
      ? { phone: normalizePkPhone(dto.phone) }
      : { email: dto.email!.toLowerCase() };

    const customer = await this.prisma.marketplaceCustomer.findFirst({ where });
    if (!customer || !customer.isActive) {
      await this.recordLoginAttempt({ ...meta, phone: dto.phone, email: dto.email }, false, 'Invalid credentials');
      throw new UnauthorizedException('Ghalat login details');
    }
    if (customer.isBanned) throw new UnauthorizedException('Account banned hai');
    if (!customer.passwordHash) {
      throw new UnauthorizedException('Ye account OTP/Google se bana hai — password nahi hai');
    }

    const ok = await comparePassword(dto.password, customer.passwordHash);
    if (!ok) {
      await this.recordLoginAttempt({ ...meta, phone: dto.phone, email: dto.email, customerId: customer.id }, false, 'Wrong password');
      throw new UnauthorizedException('Ghalat login details');
    }

    await this.prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
    });

    return this.buildAuthResponse(customer.id, meta);
  }

  // ═══════════════════════════════════════════════════════════
  // SOCIAL LOGIN
  // ═══════════════════════════════════════════════════════════

  async socialLogin(dto: SocialLoginDto, meta?: { userAgent?: string; ip?: string }) {
    // For now only Google is fully implemented via tokeninfo
    if (dto.provider !== 'GOOGLE') {
      throw new BadRequestException(`${dto.provider} login abhi support nahi karta`);
    }

    let payload: any;
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${dto.idToken}`);
      if (!res.ok) throw new Error('bad token');
      payload = await res.json();
    } catch {
      throw new UnauthorizedException('Google token invalid');
    }
    if (!payload?.sub || !payload?.email) throw new UnauthorizedException('Google token incomplete');

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;

    let customer = await this.prisma.marketplaceCustomer.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!customer) {
      let referredById: string | null = null;
      if (dto.referralCode) {
        const r = await this.prisma.marketplaceCustomer.findUnique({
          where: { referralCode: dto.referralCode.trim().toUpperCase() },
        });
        if (r) referredById = r.id;
      }
      customer = await this.prisma.marketplaceCustomer.create({
        data: {
          phone: `pending_${crypto.randomBytes(6).toString('hex')}`, // customer must set later
          fullName: payload.name ?? email.split('@')[0],
          email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          googleId,
          avatarUrl: payload.picture,
          authProvider: MarketplaceAuthProvider.GOOGLE,
          referralCode: generateCustomerReferralCode(payload.name ?? 'user'),
          referredById,
        },
      });
    } else if (!customer.googleId) {
      customer = await this.prisma.marketplaceCustomer.update({
        where: { id: customer.id },
        data: { googleId, emailVerified: true, emailVerifiedAt: customer.emailVerifiedAt ?? new Date() },
      });
    }

    await this.prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
    });

    return this.buildAuthResponse(customer.id, meta);
  }

  // ═══════════════════════════════════════════════════════════
  // TOKENS
  // ═══════════════════════════════════════════════════════════

  async refresh(refreshToken: string) {
    let payload: CustomerJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<CustomerJwtPayload>(refreshToken, {
        secret: this.config.get<string>('MARKETPLACE_JWT_REFRESH_SECRET') ||
                this.config.get<string>('JWT_REFRESH_SECRET')!,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.customerSession.findMany({
      where: { customerId: payload.sub, expiresAt: { gt: new Date() } },
    });
    let matched: (typeof sessions)[number] | null = null;
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) {
        matched = s;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Session expired');

    await this.prisma.customerSession.delete({ where: { id: matched.id } });
    return this.buildAuthResponse(payload.sub);
  }

  async logout(customerId: string, refreshToken?: string) {
    if (!refreshToken) {
      await this.prisma.customerSession.deleteMany({ where: { customerId } });
      return { success: true };
    }
    const sessions = await this.prisma.customerSession.findMany({ where: { customerId } });
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) {
        await this.prisma.customerSession.delete({ where: { id: s.id } });
        break;
      }
    }
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // PROFILE / PASSWORD / SESSIONS
  // ═══════════════════════════════════════════════════════════

  async me(customerId: string) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.sanitize(customer);
  }

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    if (dto.email) {
      const exists = await this.prisma.marketplaceCustomer.findFirst({
        where: { email: dto.email.toLowerCase(), id: { not: customerId } },
      });
      if (exists) throw new ConflictException('Email already in use');
    }
    const updated = await this.prisma.marketplaceCustomer.update({
      where: { id: customerId },
      data: {
        fullName: dto.fullName,
        displayName: dto.displayName,
        email: dto.email?.toLowerCase(),
        avatarUrl: dto.avatarUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        language: dto.language,
        marketingEmails: dto.marketingEmails,
        marketingSms: dto.marketingSms,
        marketingPush: dto.marketingPush,
        marketingWhatsapp: dto.marketingWhatsapp,
      },
    });
    return this.sanitize(updated);
  }

  async setPassword(customerId: string, newPassword: string) {
    const c = await this.prisma.marketplaceCustomer.findUnique({ where: { id: customerId } });
    if (!c) throw new NotFoundException();
    if (c.passwordHash) throw new BadRequestException('Password pehle se set hai — change password use karain');
    await this.prisma.marketplaceCustomer.update({
      where: { id: customerId },
      data: {
        passwordHash: await hashPassword(newPassword),
        authProvider: c.googleId ? MarketplaceAuthProvider.EMAIL_PASSWORD : c.authProvider,
      },
    });
    return { success: true, message: 'Password set ho gaya' };
  }

  async changePassword(customerId: string, currentPassword: string, newPassword: string) {
    const c = await this.prisma.marketplaceCustomer.findUnique({ where: { id: customerId } });
    if (!c || !c.passwordHash) throw new BadRequestException('Password nahi hai — pehle set karain');
    const ok = await comparePassword(currentPassword, c.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password ghalat hai');
    await this.prisma.marketplaceCustomer.update({
      where: { id: customerId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return { success: true, message: 'Password change ho gaya' };
  }

  async resetPasswordWithOtp(phone: string, code: string, newPassword: string) {
    const p = normalizePkPhone(phone);
    const otp = await this.prisma.customerOtpCode.findFirst({
      where: {
        phone: p,
        code,
        purpose: 'RESET_PASSWORD',
        verifiedAt: { not: null },
        createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('OTP verify nahi hai ya expire ho gaya');

    const customer = await this.prisma.marketplaceCustomer.findUnique({ where: { phone: p } });
    if (!customer) throw new NotFoundException();

    await this.prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await this.prisma.customerSession.deleteMany({ where: { customerId: customer.id } });
    return { success: true, message: 'Password reset ho gaya' };
  }

  async listSessions(customerId: string) {
    return this.prisma.customerSession.findMany({
      where: { customerId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true, deviceName: true, ipAddress: true, location: true,
        lastUsedAt: true, createdAt: true, expiresAt: true,
      },
    });
  }

  async revokeSession(customerId: string, sessionId: string) {
    const s = await this.prisma.customerSession.findFirst({ where: { id: sessionId, customerId } });
    if (!s) throw new NotFoundException('Session not found');
    await this.prisma.customerSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async loginHistory(customerId: string, limit = 30) {
    return this.prisma.customerLoginHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteAccount(customerId: string, reason?: string) {
    await this.prisma.marketplaceCustomer.update({
      where: { id: customerId },
      data: {
        isActive: false,
        isBanned: false,
        banReason: reason ?? 'Deleted by customer',
      },
    });
    await this.prisma.customerSession.deleteMany({ where: { customerId } });
    return { success: true, message: 'Account deactivate ho gaya' };
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════

  private async buildAuthResponse(customerId: string, meta?: { userAgent?: string; ip?: string }) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      include: { addresses: { where: { isDefault: true }, take: 1 } },
    });
    if (!customer) throw new NotFoundException();

    const payload: CustomerJwtPayload = {
      sub: customer.id,
      phone: customer.phone,
      email: customer.email,
      fullName: customer.fullName,
    };

    const accessSecret =
      this.config.get<string>('MARKETPLACE_JWT_SECRET') ||
      this.config.get<string>('JWT_ACCESS_SECRET')!;
    const refreshSecret =
      this.config.get<string>('MARKETPLACE_JWT_REFRESH_SECRET') ||
      this.config.get<string>('JWT_REFRESH_SECRET')!;

    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: '30d',
    });

    const refreshTokenHash = await hashPassword(refreshToken);
    const device = parseUserAgent(meta?.userAgent);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.customerSession.create({
      data: {
        customerId: customer.id,
        refreshTokenHash,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ip,
        deviceFingerprint: device.fingerprint,
        deviceName: `${device.device} • ${device.browser}`,
        location: getLocationFromIp(meta?.ip),
        expiresAt,
      },
    });

    await this.recordLoginAttempt({ ...meta, customerId: customer.id }, true);

    return {
      customer: this.sanitize(customer),
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      },
    };
  }

  private async recordLoginAttempt(
    meta: { customerId?: string; phone?: string; email?: string; userAgent?: string; ip?: string },
    success: boolean,
    failureReason?: string,
  ) {
    try {
      const device = parseUserAgent(meta.userAgent);
      await this.prisma.customerLoginHistory.create({
        data: {
          customerId: meta.customerId,
          phone: meta.phone,
          email: meta.email,
          success,
          failureReason,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
          deviceName: `${device.device} • ${device.browser}`,
          location: getLocationFromIp(meta.ip),
        },
      });
    } catch {}
  }

  private sanitize<T extends { passwordHash?: string | null }>(customer: T) {
    const { passwordHash, ...rest } = customer as any;
    return { ...rest, hasPassword: !!passwordHash };
  }
}
