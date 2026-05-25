import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * SubscriptionGuard — blocks API access when trial/subscription expired.
 *
 * Allowed routes (bypass guard):
 *  - All /auth/*  (login, logout, refresh, etc.)
 *  - All /admin/* (super admin always allowed)
 *  - /subscriptions/*, /plans/*, /billing/* (so user can upgrade)
 *  - /health, /  (system endpoints)
 *
 * Behavior:
 *  - TRIAL active → allow
 *  - TRIAL expired → return 402 Payment Required
 *  - ACTIVE → allow
 *  - PAST_DUE (within 3-day grace) → allow with warning header
 *  - PAST_DUE (>3 days) → return 402
 *  - EXPIRED / CANCELLED / no subscription → return 402
 *  - SUPER_ADMIN role → always allow (admin bypass)
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  // Path prefixes that should NEVER be blocked
  private readonly BYPASS_PATHS = [
    '/api/auth/',
    '/api/admin/',
    '/api/subscriptions/',
    '/api/plans',
    '/api/billing/',
    '/api/stripe/',
    '/api/uploads/',
    '/api/notifications/',
    '/api/notification-prefs',
    '/api/feature-gating',
    '/health',
  ];

  // Grace period (days) after PAST_DUE before hard block
  private readonly GRACE_PERIOD_DAYS = 3;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1. Bypass check by path prefix
    const path: string = req.path || req.url || '';
    if (this.BYPASS_PATHS.some((prefix) => path.startsWith(prefix))) {
      return true;
    }

    // 2. No authenticated user (public routes) — let other guards handle it
    const user = req.user;
    if (!user || !user.tenantId) return true;

    // 3. Super admin bypass
    if (user.role === 'SUPER_ADMIN') return true;

    // 4. Find current subscription (most recent ACTIVE/TRIAL/PAST_DUE/EXPIRED)
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'EXPIRED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        plan: { select: { name: true } },
      },
    });

    if (!sub) {
      // No subscription at all — block
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Subscription Required',
          message: 'Aap ka koi active subscription nahi hai. Plan choose karein.',
          code: 'NO_SUBSCRIPTION',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const now = new Date();
    const res = context.switchToHttp().getResponse();

    // 5. TRIAL — check if expired
    if (sub.status === 'TRIAL') {
      if (sub.trialEndsAt && sub.trialEndsAt < now) {
        // Trial expired — block + auto-update status (fire and forget)
        this.prisma.subscription
          .update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
          })
          .catch(() => {});

        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            error: 'Trial Expired',
            message: 'Aap ka free trial khatam ho gaya. Plan upgrade karein.',
            code: 'TRIAL_EXPIRED',
            expiredAt: sub.trialEndsAt,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // Trial active — add warning header if ≤ 3 days left
      if (sub.trialEndsAt) {
        const daysLeft = Math.ceil(
          (sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft <= 3) {
          res.setHeader('X-Trial-Warning', 'true');
          res.setHeader('X-Trial-Days-Left', String(daysLeft));
          res.setHeader('X-Trial-Ends-At', sub.trialEndsAt.toISOString());
        }
      }
      return true;
    }

    // 6. ACTIVE — check if period ended
    if (sub.status === 'ACTIVE') {
      if (sub.currentPeriodEnd < now) {
        // Move to PAST_DUE
        this.prisma.subscription
          .update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE' },
          })
          .catch(() => {});
        // Allow access during grace
        res.setHeader('X-Subscription-Warning', 'PAST_DUE');
        return true;
      }
      return true;
    }

    // 7. PAST_DUE — check grace period
    if (sub.status === 'PAST_DUE') {
      const dueDate = sub.currentPeriodEnd;
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue <= this.GRACE_PERIOD_DAYS) {
        res.setHeader('X-Subscription-Warning', 'GRACE_PERIOD');
        res.setHeader('X-Grace-Days-Left', String(this.GRACE_PERIOD_DAYS - daysOverdue));
        return true;
      }

      // Grace period over — block
      this.prisma.subscription
        .update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
        })
        .catch(() => {});

      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Subscription Expired',
          message: 'Aap ki subscription expire ho gayi. Renew karein.',
          code: 'SUBSCRIPTION_EXPIRED',
          daysOverdue,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 8. EXPIRED — hard block
    if (sub.status === 'EXPIRED') {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Subscription Expired',
          message: 'Aap ki subscription expire ho chuki hai. Renew karein.',
          code: 'SUBSCRIPTION_EXPIRED',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
