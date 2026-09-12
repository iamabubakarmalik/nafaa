import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../../prisma/prisma.service';

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
  /**
   * Path prefixes that must NEVER be blocked.
   *
   * These are matched as *segment* prefixes: `/api/uploads` matches both
   * `/api/uploads` and `/api/uploads/abc`, but not `/api/uploads-xyz`.
   * Storing them without a trailing slash matters — `POST /api/uploads`
   * (receipt screenshot) has no trailing slash, so a `startsWith('/api/uploads/')`
   * check used to block it and the user could never upload proof of payment
   * once the trial expired.
   */
  private readonly BYPASS_PATHS = [
    '/api/auth',
    '/api/admin',
    '/api/subscriptions',
    '/api/plans',
    '/api/billing',
    '/api/stripe',
    '/api/uploads',
    '/api/notifications',
    '/api/notification-prefs',
    '/api/feature-gating',
    '/api/plan-usage',
    '/api/tenants/me',
    '/api/users/me',
    '/api/shops',
    '/health',
  ];

  private isBypassed(path: string): boolean {
    // Strip query string — `req.url` keeps it, `req.path` does not.
    const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
    return this.BYPASS_PATHS.some(
      (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
    );
  }

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
    if (this.isBypassed(path)) return true;

    // 2. No authenticated user (public routes) — let other guards handle it
    const user = req.user;
    if (!user || !user.tenantId) return true;

    // 3. Super admin bypass
    if (user.role === 'SUPER_ADMIN') return true;

    // 4. Find the tenant's *best* subscription.
    //    Ranked, not just newest: a stale EXPIRED row must never lock out a
    //    customer who also has a live ACTIVE one (that happened whenever an
    //    old trial was left behind by an upgrade).
    const candidates = await this.prisma.subscription.findMany({
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

    const RANK: Record<string, number> = {
      ACTIVE: 0,
      TRIAL: 1,
      PAST_DUE: 2,
      EXPIRED: 3,
    };
    const sub = candidates.sort(
      (a, b) => RANK[a.status] - RANK[b.status],
    )[0];

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
