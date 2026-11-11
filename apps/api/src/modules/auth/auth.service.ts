import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
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
import {
  parseUserAgent, getLocationFromIp, formatLoginTime, type DeviceInfo,
} from '../../common/helpers/device-detection.helper';
import { AdminNotificationsService } from '../../admin/notifications/admin-notifications.service';
import { EmailService } from '../email/email.service';
import { AppleIdentityService } from './apple/apple-identity.service';
import { SmsService } from '../sms/sms.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpPurpose } from './dto/send-otp.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { DEFAULT_ROLE_PERMISSIONS } from '../../common/constants/permissions.constants';
import { apiMessage, notificationText } from '../../common/i18n/api-message';
import { DEFAULT_APP_LANGUAGE, isAppLanguage } from '../../common/i18n/app-language';
import { PartnerAttributionService } from '../partners/attribution/partner-attribution.service';

function makeReferralCode(seed: string): string {
  const clean = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NAFAA-${clean || 'SHOP'}${rand}`;
}

/** Google OAuth client ids of the Nafaa mobile app (Android, iOS, web). */
const GOOGLE_MOBILE_CLIENT_IDS = [
  '109272166338-j3miqlc4kn1441l24dgd8tv1fphkid1k.apps.googleusercontent.com',
  '109272166338-4fic8s75hh9e7otuvjgtaj1q02s8vp26.apps.googleusercontent.com',
  '109272166338-vnd7gh3vnjds2m3gt5i2psnsanav06ep.apps.googleusercontent.com',
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly adminNotifications: AdminNotificationsService,
    private readonly appleIdentity: AppleIdentityService,
    @Optional() private readonly partnerAttribution?: PartnerAttributionService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // REGISTER — Auto creates: Tenant + Owner + Main Shop + Cash Register
  // ═══════════════════════════════════════════════════════════
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
    // A code is either another shop's referral code or a Nafaa partner's code.
    let partnerCode: string | null = null;
    if (dto.referralCode) {
      const code = dto.referralCode.trim().toUpperCase();
      const found = await this.prisma.tenant.findUnique({ where: { referralCode: code } });
      if (found) referrer = { id: found.id };
      else if (this.partnerAttribution && (await this.partnerAttribution.isActiveCode(code))) partnerCode = code;
      else throw new BadRequestException('Invalid referral code');
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
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          slug,
          phone: dto.phone,
          referralCode: myCode,
          referredById: referrer?.id ?? null,
        },
      });

      // 2. Create Main Shop AUTOMATICALLY
      const mainShop = await tx.shop.create({
        data: {
          tenantId: tenant.id,
          name: dto.shopName,
          phone: dto.phone,
          isMain: true,
          isActive: true,
          type: 'SHOP',
          // Every shop starts with a safe account on the Shop accounts page.
          moneyAccounts: { create: { tenantId: tenant.id, name: 'Tijori (cash)', kind: 'CASH' } },
        },
      });

      // 3. Create Owner User AND assign to main shop
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          shopId: mainShop.id,
          fullName: dto.fullName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          passwordHash,
          role: UserRole.OWNER,
          authProvider: AuthProvider.EMAIL,
          emailVerified: false,
          permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.OWNER] ?? [],
          language: dto.language ?? DEFAULT_APP_LANGUAGE,
        },
      });

      // 4. Create default CLOSED Cash Register for main shop
      const registerNumber = `CR-MAIN-${Date.now().toString().slice(-6)}`;
      await tx.cashRegister.create({
        data: {
          tenantId: tenant.id,
          shopId: mainShop.id,
          openedById: user.id,
          registerNumber,
          status: 'CLOSED',
          openingBalance: 0,
          expectedBalance: 0,
        },
      });

      // 5. Create Onboarding Progress
      await tx.onboardingProgress.create({
        data: { tenantId: tenant.id, userId: user.id, currentStep: 1 },
      });

      // 6. Referral handling
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
            ...notificationText('New Referral Signup! 🎉', apiMessage('{{shopName}} ne aap ke code se signup kiya.', { shopName: dto.shopName })),
            link: '/referrals',
          },
        });
      }

      // 7. Activity log
      await tx.activityLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'CREATE',
          entityType: 'Tenant',
          entityId: tenant.id,
          description: `Business "${dto.shopName}" created with main shop`,
          metadata: { shopId: mainShop.id, shopName: mainShop.name },
        },
      });

      return { tenant, user, mainShop };
    });

    await this.partnerAttribution?.attachAtSignup({ tenantId: result.tenant.id, code: partnerCode, phone: dto.phone, email: dto.email });
    this.notifyAdminNewSignup(result.tenant, result.user, 'EMAIL', dto.referralCode);
    this.sendWelcomeEmail(result.tenant, result.user);

    this.sendVerifyEmailOtp(result.user.id).catch((e) => {
      console.error('Auto verify OTP send failed:', e);
    });

    const tokens = await this.issueTokens({
      sub: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role,
      shopId: result.mainShop.id,
    });

    return {
      user: this.sanitizeUser({ ...result.user, shopId: result.mainShop.id }),
      tenant: result.tenant,
      ...tokens,
      requiresEmailVerification: true,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════
  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        tenant: true,
        assignedShop: {
          select: { id: true, name: true, isMain: true, isActive: true, type: true },
        },
      },
    });

    if (!user || !user.isActive) {
      this.recordFailedLogin(dto.email, 'Invalid credentials', meta).catch(() => {});
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      const apple = !!user.appleId && !user.googleId;
      this.recordFailedLogin(dto.email, apple ? 'No password set (Apple account)' : 'No password set (Google account)', meta).catch(() => {});
      throw new UnauthorizedException(
        apple
          ? 'Ye account Apple se bana hai. "Sign in with Apple" use karein ya password set karein.'
          : 'Ye account Google se bana hai. "Continue with Google" use karein ya password set karein.',
      );
    }

    const ok = await comparePassword(dto.password, user.passwordHash);
    if (!ok) {
      this.recordFailedLogin(dto.email, 'Wrong password', meta).catch(() => {});
      throw new UnauthorizedException('Invalid email or password');
    }

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
        shopId: user.shopId,
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

  // ═══════════════════════════════════════════════════════════
  // GOOGLE AUTH
  // ═══════════════════════════════════════════════════════════
  async googleAuth(googleUser: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.googleId },
          { email: googleUser.email.toLowerCase() },
        ],
      },
      include: { tenant: true, assignedShop: true },
    });

    if (user) {
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
          include: { tenant: true, assignedShop: true },
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
        shopId: user.shopId,
      });

      return {
        user: this.sanitizeUser(user),
        tenant: user.tenant,
        ...tokens,
        isNewUser: false,
      };
    }

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

  // ═══════════════════════════════════════════════════════════
  // COMPLETE GOOGLE SIGNUP — Also creates main shop
  // ═══════════════════════════════════════════════════════════
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

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: payload.googleId }, { email: payload.email.toLowerCase() }],
      },
      include: { tenant: true },
    });
    if (existing) {
      return this.googleAuth({
        googleId: payload.googleId,
        email: payload.email,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
      });
    }

    return this.createOwnerAccount({
      shopName,
      fullName: payload.fullName,
      email: payload.email,
      googleId: payload.googleId,
      avatarUrl: payload.avatarUrl,
      provider: AuthProvider.GOOGLE,
    });
  }

  /**
   * New business from a social sign-in (Google or Apple): tenant, main shop
   * with its cash account, owner, cash register and onboarding progress, so
   * onboarding (business model, industry) follows as for any new account.
   */
  private async createOwnerAccount(input: {
    shopName: string;
    fullName: string;
    email: string;
    googleId?: string;
    appleId?: string;
    avatarUrl?: string;
    provider: AuthProvider;
    userAgent?: string;
    ip?: string;
  }) {
    const { shopName } = input;
    const label = input.provider === AuthProvider.APPLE ? 'Apple' : 'Google';

    const slug = generateSlug(shopName);
    const referralCode = makeReferralCode(shopName);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: { name: shopName, slug, referralCode },
      });

      // 2. Create Main Shop
      const mainShop = await tx.shop.create({
        data: {
          tenantId: tenant.id,
          name: shopName,
          isMain: true,
          isActive: true,
          type: 'SHOP',
          // Every shop starts with a safe account on the Shop accounts page.
          moneyAccounts: { create: { tenantId: tenant.id, name: 'Tijori (cash)', kind: 'CASH' } },
        },
      });

      // 3. Create Owner
      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          shopId: mainShop.id,
          fullName: input.fullName,
          email: input.email.toLowerCase(),
          passwordHash: null,
          googleId: input.googleId ?? null,
          appleId: input.appleId ?? null,
          avatarUrl: input.avatarUrl,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          authProvider: input.provider,
          role: UserRole.OWNER,
          permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.OWNER] ?? [],
        },
      });

      // 4. Create Cash Register
      const registerNumber = `CR-MAIN-${Date.now().toString().slice(-6)}`;
      await tx.cashRegister.create({
        data: {
          tenantId: tenant.id,
          shopId: mainShop.id,
          openedById: newUser.id,
          registerNumber,
          status: 'CLOSED',
          openingBalance: 0,
          expectedBalance: 0,
        },
      });

      // 5. Onboarding
      await tx.onboardingProgress.create({
        data: { tenantId: tenant.id, userId: newUser.id, currentStep: 1 },
      });

      // 6. Activity log
      await tx.activityLog.create({
        data: {
          tenantId: tenant.id,
          userId: newUser.id,
          action: 'CREATE',
          entityType: 'Tenant',
          entityId: tenant.id,
          description: `Business "${shopName}" created via ${label} with main shop`,
          metadata: { shopId: mainShop.id, provider: input.provider },
        },
      });

      return { tenant, user: newUser, mainShop };
    });

    this.notifyAdminNewSignup(result.tenant, result.user, input.provider);
    this.sendWelcomeEmail(result.tenant, result.user);

    const tokens = await this.issueTokens({
      sub: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role,
      shopId: result.mainShop.id,
    }, input.userAgent, input.ip);

    return {
      user: this.sanitizeUser({ ...result.user, shopId: result.mainShop.id }),
      tenant: result.tenant,
      ...tokens,
      isNewUser: true,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GOOGLE MOBILE
  // ═══════════════════════════════════════════════════════════
  async googleMobile(idToken: string, shopName?: string) {
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

    // The mobile app signs in with its own Android / iOS / web client ids
    // (apps/mobile app.json extra); they are public and always accepted, so a
    // missing or placeholder env value cannot lock the app out.
    const allowedAudiences = [
      ...GOOGLE_MOBILE_CLIENT_IDS,
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID'),
      ...(this.configService.get<string>('GOOGLE_MOBILE_CLIENT_IDS') ?? '').split(','),
    ].map((id) => id?.trim()).filter((id): id is string => !!id && id.endsWith('.apps.googleusercontent.com') && !id.startsWith('your_'));

    if (!allowedAudiences.includes(payload.aud)) {
      throw new BadRequestException('Token audience galat hai');
    }
    if (payload.email_verified !== true && payload.email_verified !== 'true') {
      throw new BadRequestException('Google ID token invalid');
    }

    const googleUser = {
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture,
    };

    const result = await this.googleAuth(googleUser);

    if ('needsShopName' in result && result.needsShopName && shopName) {
      return this.completeGoogleSignup(result.tempToken, shopName);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // SIGN IN WITH APPLE (iOS)
  // Find by Apple id, then link an existing account by a verified email,
  // otherwise a new business (asks for the shop name first, like Google).
  // ═══════════════════════════════════════════════════════════
  async appleSignIn(
    dto: { identityToken: string; nonce?: string; fullName?: string; shopName?: string },
    meta?: { userAgent?: string; ip?: string },
  ) {
    const identity = await this.appleIdentity.verify(dto.identityToken, dto.nonce);
    const include = { tenant: true, assignedShop: true } as const;

    let user = await this.prisma.user.findUnique({ where: { appleId: identity.sub }, include });

    if (!user && identity.email && identity.emailVerified) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: identity.email } });
      if (byEmail && !byEmail.appleId) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            appleId: identity.sub,
            emailVerified: true,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            authProvider: byEmail.passwordHash || byEmail.googleId ? AuthProvider.HYBRID : AuthProvider.APPLE,
          },
          include,
        });
      }
    }

    if (user) {
      if (!user.isActive) throw new UnauthorizedException('Ye account band hai. Dukaan ke malik se baat karein.');
      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      const tokens = await this.issueTokens(
        { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role, shopId: user.shopId },
        meta?.userAgent,
        meta?.ip,
      );
      return { user: this.sanitizeUser(user), tenant: user.tenant, ...tokens, isNewUser: false };
    }

    if (!identity.email) {
      throw new BadRequestException('Apple ne email nahi di. Apple ID settings me Nafaa ko hata kar dobara koshish karein, ya email se account banayein.');
    }
    const taken = await this.prisma.user.findUnique({ where: { email: identity.email }, select: { id: true } });
    if (taken) {
      throw new ConflictException('Ye email pehle se registered hai. Email aur password se login karein.');
    }

    // Apple sends the name only on the very first sign-in, so the app passes it on.
    const fullName = (dto.fullName ?? '').trim().slice(0, 100);
    const pending = {
      appleId: identity.sub,
      email: identity.email,
      fullName: fullName || (identity.isPrivateEmail ? '' : identity.email.split('@')[0]),
    };

    const shopName = (dto.shopName ?? '').trim();
    if (shopName.length >= 2) return this.createAppleOwner(pending, shopName, meta);

    const tempToken = await this.jwtService.signAsync(
      { ...pending, purpose: 'apple_signup' },
      { secret: this.configService.get<string>('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
    return { needsShopName: true as const, tempToken, email: pending.email, fullName: pending.fullName };
  }

  async completeAppleSignup(tempToken: string, shopName: string, meta?: { userAgent?: string; ip?: string }) {
    let payload: { purpose?: string; appleId?: string; email?: string; fullName?: string };
    try {
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Token expired ya invalid — Apple se dobara try karein');
    }
    if (payload.purpose !== 'apple_signup' || !payload.appleId || !payload.email) {
      throw new BadRequestException('Invalid token');
    }
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ appleId: payload.appleId }, { email: payload.email }] },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ye account pehle se bana hua hai. Apple se dobara login karein.');
    }
    return this.createAppleOwner(
      { appleId: payload.appleId, email: payload.email, fullName: payload.fullName ?? '' },
      shopName.trim(),
      meta,
    );
  }

  private createAppleOwner(
    p: { appleId: string; email: string; fullName: string },
    shopName: string,
    meta?: { userAgent?: string; ip?: string },
  ) {
    return this.createOwnerAccount({
      shopName,
      fullName: p.fullName || shopName,
      email: p.email,
      appleId: p.appleId,
      provider: AuthProvider.APPLE,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SET / CHANGE PASSWORD
  // ═══════════════════════════════════════════════════════════
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
        authProvider: user.googleId || user.appleId ? AuthProvider.HYBRID : AuthProvider.EMAIL,
      },
    });

    return { success: true, message: 'Password set ho gaya' };
  }

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

  async disconnectGoogle(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!user.googleId) {
      throw new BadRequestException('Google account connected nahi hai');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Pehle password set karein, phir Google disconnect kar sakte hain',
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

  // ═══════════════════════════════════════════════════════════
  // EMAIL VERIFICATION — FIXED VERSION
  // ═══════════════════════════════════════════════════════════
  async sendVerifyEmailOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.emailVerified) {
      return { success: true, message: 'Email already verified', alreadyVerified: true };
    }

    const recentOtp = await this.prisma.otpCode.findFirst({
      where: {
        email: user.email,
        purpose: OtpPurpose.VERIFY_EMAIL,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const waitSec = Math.ceil(
        (recentOtp.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000,
      );
      throw new BadRequestException(apiMessage('Please wait {{waitSec}}s before requesting a new code', { waitSec }));
    }

    const code = generateOtp(6);
    
    // ═══ FIX: OTP create ko try/catch me wrap karo ═══
    try {
      await this.prisma.otpCode.create({
        data: {
          email: user.email,
          userId: user.id,
          code,
          purpose: OtpPurpose.VERIFY_EMAIL,
          expiresAt: addMinutes(new Date(), 10),
        },
      });
    } catch (e: any) {
      console.error('❌ OTP CREATE FAILED:', e?.message);
      console.error('   Full error:', e);
      throw new BadRequestException('OTP create nahi ho saka — DB check karo');
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    
    // ═══ FIX: Email send ko try/catch me wrap karo ═══
    try {
      await this.emailService.send({
        tenantId: user.tenantId,
        templateSlug: 'email-verify',
        toEmail: user.email,
        toName: user.fullName,
        variables: { name: user.fullName, code, appUrl },
      });
      console.log(`📧 Verify-email OTP sent to ${user.email}: ${code}`);
    } catch (e: any) {
      console.error('❌ EMAIL SEND FAILED:', e?.message);
      console.error('   Full error:', e);
      // OTP bana diya, email fail hui — retry ka option do
      return {
        success: true,
        message: 'OTP bana diya, email send fail hui — dobara try karein',
        devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      };
    }

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

  // ═══════════════════════════════════════════════════════════
  // REFRESH TOKEN
  // ═══════════════════════════════════════════════════════════
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

    await this.prisma.session.update({
      where: { id: matched.id },
      data: { lastUsedAt: new Date() },
    });

    await this.prisma.session.delete({ where: { id: matched.id } });

    // Fetch fresh shopId
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { shopId: true },
    });

    return this.issueTokens(
      {
        sub: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
        shopId: user?.shopId,
      },
      matched.userAgent || undefined,
      matched.ipAddress || undefined,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LOGOUT / ME
  // ═══════════════════════════════════════════════════════════
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
      include: {
        tenant: true,
        assignedShop: {
          select: { id: true, name: true, isMain: true, isActive: true, type: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return {
      user: this.sanitizeUser(user),
      tenant: user.tenant,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // FORGOT / RESET PASSWORD
  // ═══════════════════════════════════════════════════════════
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
        message: user.appleId && !user.googleId
          ? 'Ye account Apple se bana hai — Sign in with Apple use karein'
          : 'Ye account Google se bana hai — Continue with Google use karein',
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

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    this.emailService
      .send({
        tenantId: user.tenantId,
        templateSlug: 'password-reset',
        toEmail: user.email,
        toName: user.fullName,
        variables: {
          name: user.fullName,
          resetUrl,
          shopName: user.tenant.name,
          appUrl,
        },
      })
      .catch((e) => console.error('Password reset email failed:', e.message));

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
        authProvider: user.googleId || user.appleId ? AuthProvider.HYBRID : AuthProvider.EMAIL,
      },
    });

    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    return { success: true, message: 'Password reset ho gaya' };
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ═══════════════════════════════════════════════════════════
  async updateProfile(
    userId: string,
    data: { fullName?: string; phone?: string; avatarUrl?: string; language?: string },
  ) {
    const updates: any = {};
    if (data.language !== undefined) {
      if (!isAppLanguage(data.language)) throw new BadRequestException('Ye zaban mojood nahi');
      updates.language = data.language;
    }
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
      include: { tenant: true, assignedShop: true },
    });

    return this.sanitizeUser(user);
  }

  // ═══════════════════════════════════════════════════════════
  // TEAM MEMBER INVITATION
  // ═══════════════════════════════════════════════════════════
  async sendTeamMemberInvitation(params: {
    tenantId: string;
    tenantName: string;
    ownerName: string;
    newMember: {
      fullName: string;
      email: string;
      tempPassword: string;
      role: string;
    };
  }) {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    try {
      await this.emailService.send({
        tenantId: params.tenantId,
        templateSlug: 'team-member-invited',
        toEmail: params.newMember.email,
        toName: params.newMember.fullName,
        variables: {
          name: params.newMember.fullName,
          ownerName: params.ownerName,
          shopName: params.tenantName,
          email: params.newMember.email,
          tempPassword: params.newMember.tempPassword,
          role: params.newMember.role,
          loginUrl: `${appUrl}/login`,
          appUrl,
        },
      });
      console.log(`📧 Team invitation sent to ${params.newMember.email}`);
      return { success: true };
    } catch (e: any) {
      console.error('Team invitation email failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  async sendOnboardingCompleteEmail(params: {
    tenantId: string;
    tenantName: string;
    user: { fullName: string; email: string };
    businessType: string;
    categoriesCount: number;
    paymentMethodsCount: number;
    productsCount: number;
    teamCount: number;
  }) {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    try {
      await this.emailService.send({
        tenantId: params.tenantId,
        templateSlug: 'onboarding-complete',
        toEmail: params.user.email,
        toName: params.user.fullName,
        variables: {
          name: params.user.fullName,
          shopName: params.tenantName,
          businessType: params.businessType,
          categoriesCount: params.categoriesCount,
          paymentMethodsCount: params.paymentMethodsCount,
          productsCount: params.productsCount,
          teamCount: params.teamCount,
          appUrl,
        },
      });
    } catch (e: any) {
      console.error('Onboarding complete email failed:', e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  async listActiveSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        deviceFingerprint: true,
        userAgent: true,
        ipAddress: true,
        location: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName || 'Unknown Device',
      location: s.location || 'Unknown',
      ipAddress: s.ipAddress,
      lastActive: s.lastUsedAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });
    return { success: true, message: 'Device session revoked' };
  }

  /** Which of the user's sessions belongs to this refresh token (this device). */
  async currentSessionId(userId: string, refreshToken: string) {
    if (!refreshToken) return { id: null };
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, refreshTokenHash: true },
    });
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) return { id: s.id };
    }
    return { id: null };
  }

  async revokeAllExceptCurrent(userId: string, currentRefreshToken: string) {
    const sessions = await this.prisma.session.findMany({ where: { userId } });

    let currentId: string | null = null;
    for (const s of sessions) {
      if (await comparePassword(currentRefreshToken, s.refreshTokenHash)) {
        currentId = s.id;
        break;
      }
    }

    // Without a match every session, this one included, would be removed and
    // the user signed out here as well.
    if (!currentId) {
      throw new BadRequestException('Ye device pehchana nahi gaya — page refresh karke dobara koshish karein');
    }

    const result = await this.prisma.session.deleteMany({ where: { userId, id: { not: currentId } } });

    return {
      success: true,
      ...apiMessage('{{count}} other device sessions revoked', { count: result.count }),
      count: result.count,
    };
  }

  async getLoginHistory(userId: string, limit = 30) {
    const history = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        success: true,
        failureReason: true,
        ipAddress: true,
        deviceName: true,
        location: true,
        isNewDevice: true,
        createdAt: true,
      },
    });

    return history;
  }

  async recordFailedLogin(email: string, reason: string, meta?: { userAgent?: string; ip?: string }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, tenantId: true },
      });
      if (!user) return;

      const deviceInfo = parseUserAgent(meta?.userAgent);
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          email: email.toLowerCase(),
          success: false,
          failureReason: reason,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
          deviceFingerprint: deviceInfo.fingerprint,
          deviceName: `${deviceInfo.device} - ${deviceInfo.browser}`,
          location: getLocationFromIp(meta?.ip),
        },
      });
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  private async issueTokens(payload: JwtPayload, userAgent?: string, ip?: string) {
    // Admin staff work only in the admin panel; they have no merchant access.
    if (payload.role === UserRole.ADMIN_STAFF) throw new UnauthorizedException('This is an admin panel account. Sign in at the Nafaa admin panel.');
    if (payload.role === UserRole.PARTNER) throw new UnauthorizedException('Ye partner account hai. partner.nafaa.pk par sign in karein.');
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

    const deviceInfo = parseUserAgent(userAgent);
    const location = getLocationFromIp(ip);
    const deviceName = `${deviceInfo.device} - ${deviceInfo.browser}`;

    await this.prisma.session.create({
      data: {
        userId: payload.sub,
        refreshTokenHash,
        userAgent,
        ipAddress: ip,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceName,
        location,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async isNewDevice(userId: string, fingerprint: string): Promise<boolean> {
    const existingSession = await this.prisma.session.findFirst({
      where: {
        userId,
        deviceFingerprint: fingerprint,
        createdAt: { lt: new Date(Date.now() - 5000) },
      },
    });
    return !existingSession;
  }

  private async sendNewDeviceAlert(
    user: { id: string; tenantId: string; fullName: string; email: string },
    tenantName: string,
    deviceInfo: DeviceInfo,
    ip?: string,
  ) {
    try {
      const location = getLocationFromIp(ip);
      await this.emailService.send({
        tenantId: user.tenantId,
        templateSlug: 'new-device-login',
        toEmail: user.email,
        toName: user.fullName,
        variables: {
          name: user.fullName,
          shopName: tenantName,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          location,
          ipAddress: ip || 'Unknown',
          loginTime: formatLoginTime(new Date()),
          appUrl: this.configService.get<string>('APP_URL') || '',
        },
      });
    } catch (e: any) {
      console.error('New device alert email failed:', e.message);
    }
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

  // ═══════════════════════════════════════════════════════════
  // ACCOUNT DELETION REQUEST (people who are not the owner)
  // Records the request only. Nothing is deleted or deactivated here: the
  // owner is told, and the request is processed by hand after the grace period.
  // ═══════════════════════════════════════════════════════════
  private static readonly DELETION_GRACE_DAYS = 30;

  private async latestDeletionLog(userId: string) {
    return this.prisma.activityLog.findFirst({
      where: { entityType: 'USER', entityId: userId, action: { in: ['ACCOUNT_DELETION_REQUESTED', 'ACCOUNT_DELETION_CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private deletionState(log: { action: string; createdAt: Date; metadata: unknown } | null) {
    if (!log || log.action !== 'ACCOUNT_DELETION_REQUESTED') return { requested: false as const, requestedAt: null, scheduledFor: null };
    const meta = (log.metadata ?? {}) as { scheduledFor?: string };
    return {
      requested: true as const,
      requestedAt: log.createdAt,
      scheduledFor: meta.scheduledFor ?? addHours(log.createdAt, AuthService.DELETION_GRACE_DAYS * 24).toISOString(),
    };
  }

  async accountDeletionStatus(userId: string) {
    return { success: true, ...this.deletionState(await this.latestDeletionLog(userId)) };
  }

  async requestAccountDeletion(userId: string, dto: { currentPassword?: string; confirmation?: string; reason?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Malik ka account poore business se juda hai. Settings me "Business delete" use karein.');
    }
    if (user.passwordHash) {
      if (!dto.currentPassword || !(await comparePassword(dto.currentPassword, user.passwordHash))) {
        throw new UnauthorizedException('Password galat hai');
      }
    } else if (dto.confirmation !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException('Confirmation text ghalat — "DELETE MY ACCOUNT" likhein');
    }

    const existing = this.deletionState(await this.latestDeletionLog(userId));
    if (existing.requested) return { success: true, ...existing, message: 'Delete ki darkhwast pehle se lagi hui hai' };

    const scheduledFor = addHours(new Date(), AuthService.DELETION_GRACE_DAYS * 24).toISOString();
    const log = await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'ACCOUNT_DELETION_REQUESTED',
        entityType: 'USER',
        entityId: user.id,
        description: `${user.fullName} (${user.email}) requested account deletion`,
        metadata: { scheduledFor, reason: dto.reason?.trim() || null },
      },
    });

    const owners = await this.prisma.user.findMany({ where: { tenantId: user.tenantId, role: 'OWNER', isActive: true }, select: { id: true } });
    await Promise.all(owners.map((o) => this.prisma.notification.create({
      data: {
        tenantId: user.tenantId,
        userId: o.id,
        type: 'INFO',
        link: '/team',
        ...notificationText('Account delete ki darkhwast', apiMessage('{{name}} ne apna account delete karne ki darkhwast ki hai.', { name: user.fullName })),
      },
    }))).catch(() => undefined);

    return { success: true, requested: true, requestedAt: log.createdAt, scheduledFor, message: 'Delete ki darkhwast lag gayi. 30 din me cancel kar sakte hain.' };
  }

  async cancelAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, tenantId: true, fullName: true } });
    if (!user) throw new UnauthorizedException();
    if (this.deletionState(await this.latestDeletionLog(userId)).requested) {
      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'ACCOUNT_DELETION_CANCELLED', entityType: 'USER', entityId: user.id,
          description: `${user.fullName} cancelled the account deletion request`,
        },
      });
    }
    return { success: true, requested: false, message: 'Delete ki darkhwast cancel ho gayi' };
  }

  private sendWelcomeEmail(tenant: any, user: any) {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    this.emailService
      .send({
        tenantId: tenant.id,
        templateSlug: 'welcome',
        toEmail: user.email,
        toName: user.fullName,
        variables: {
          name: user.fullName,
          shopName: tenant.name,
          loginUrl: `${appUrl}/login`,
          appUrl,
        },
      })
      .catch((e) => console.error('Welcome email failed:', e.message));
  }
}
