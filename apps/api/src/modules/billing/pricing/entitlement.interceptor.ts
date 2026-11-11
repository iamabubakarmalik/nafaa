/**
 * Server-side plan and add-on checks for shop users.
 *
 * Only changes (POST/PUT/PATCH/DELETE) are checked, so reading never breaks a
 * screen and the counter keeps working; the apps hide or upsell features from
 * GET /plan-usage/entitlements. A refused change answers 403 with
 * code "ADDON_REQUIRED" or "PLAN_FEATURE_REQUIRED" (and the add-on key), or
 * 402 "PLAN_LIMIT" when a limit is full, so the apps can show "Add now".
 *
 * Trial and grandfathered shops have every feature (see EntitlementsService).
 */

import { CallHandler, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { FEATURES, LimitKey, UNLIMITED } from '../entitlements/feature-catalog';

interface Rule {
  match: RegExp;
  /** The shop needs any one of these features. */
  any: string[];
  /** Add-on that unlocks it, for the "Add now" prompt. */
  addOn?: string;
}

/** Path after "/api/", e.g. "loyalty/settings". */
const RULES: Rule[] = [
  { match: /^loyalty(-tiers)?(\/|$)/, any: ['loyalty'] },
  { match: /^promotions(\/|$)/, any: ['promotions'] },
  { match: /^discounts(\/|$)/, any: ['discount_rules'] },
  { match: /^transfers(\/|$)/, any: ['stock_transfer'] },
  { match: /^exports(\/|$)/, any: ['exports'] },
  { match: /^staff(\/|$)/, any: ['hr'] },
  { match: /^developer(\/|$)/, any: ['api'] },
  { match: /^backup(\/|$)/, any: ['backup'] },
  { match: /^ai(\/|$)/, any: ['ai', 'ai_plus'], addOn: 'ai_plus' },
  { match: /^(integrations\/meta|ads\/meta|online-store\/social\/meta)(\/|$)/, any: ['meta'], addOn: 'meta' },
  { match: /^(integrations\/fbr|tax-authority)(\/|$)/, any: ['fbr'], addOn: 'fbr' },
  { match: /^(accounting|integrations\/accounting)(\/|$)/, any: ['accounting'], addOn: 'accounting' },
  { match: /^(online-store\/couriers|online-orders\/[^/]+\/courier|online-orders\/dispatch)(\/|$)/, any: ['courier'], addOn: 'courier' },
  // The order desk works for any online channel the shop pays for.
  {
    match: /^(online-orders|online-store|online-products)(\/|$)/,
    any: ['online_store', 'integration.shopify', 'integration.woocommerce', 'integration.daraz', 'integration.website', 'integration.foodpanda'],
    addOn: 'online_store',
  },
];

/** Creating these uses up a limit. */
const LIMITS: Array<{ match: RegExp; method: 'POST'; limit: LimitKey; label: string; addOn?: string }> = [
  { match: /^team(\/invite)?$/, method: 'POST', limit: 'users', label: 'users', addOn: 'extra_user' },
  { match: /^shops$/, method: 'POST', limit: 'shops', label: 'dukaanen', addOn: 'extra_shop' },
  { match: /^([a-z-]+\/)?products$/, method: 'POST', limit: 'products', label: 'products' },
  { match: /^sales$/, method: 'POST', limit: 'salesPerMonth', label: 'bill is mahine' },
];

import { PERMISSIONS } from '../../../common/constants/permissions.constants';

const BOOK_PERMISSION = PERMISSIONS.DISTRIBUTION_ORDERS_BOOK;
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_STAFF', 'PARTNER']);
const LABEL = new Map(FEATURES.map((f) => [f.key, f.label]));

@Injectable()
export class EntitlementInterceptor implements NestInterceptor {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const user = req.user as { tenantId?: string; role?: string; impersonatedBy?: string } | undefined;
    if (!WRITE.has(method) || !user?.tenantId || ADMIN_ROLES.has(user.role ?? '')) return next.handle();
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0].replace(/^\/api\/(v1\/)?/, '').replace(/\/+$/, '');
    const rule = RULES.find((r) => r.match.test(path));
    const limit = LIMITS.find((l) => l.method === method && l.match.test(path));
    // Giving someone the booking permission uses a booker login.
    const perms: unknown = req.body?.permissions;
    const makesBooker = /^team(\/invite|\/[^/]+\/permissions)?$/.test(path) && Array.isArray(perms) && perms.includes(BOOK_PERMISSION);
    if (!rule && !limit && !makesBooker) return next.handle();
    const userId = /^team\/([^/]+)\/permissions$/.exec(path)?.[1];
    return from(this.check(user.tenantId, rule, limit, makesBooker ? userId ?? 'new' : null)).pipe(switchMap(() => next.handle()));
  }

  private async check(tenantId: string, rule: Rule | undefined, limit: (typeof LIMITS)[number] | undefined, bookerFor: string | null) {
    const e = await this.entitlements.get(tenantId);
    // An expired shop is stopped by SubscriptionGuard with its own message.
    if (e.state === 'expired') return;
    if (bookerFor && e.limits.bookers < UNLIMITED) {
      const already = bookerFor !== 'new' && (await this.prisma.user.count({ where: { id: bookerFor, tenantId, permissions: { has: BOOK_PERMISSION } } })) > 0;
      const current = await this.entitlements.countBookers(tenantId);
      if (!already && current >= e.limits.bookers) {
        throw new HttpException({
          statusCode: 402, error: 'Plan Limit', code: 'PLAN_LIMIT', limit: 'bookers', current, max: e.limits.bookers, addOnKey: 'booker',
          message: e.limits.bookers ? `Aap ke paas ${e.limits.bookers} booker login hain. Aur booker ke liye "Booker login" add-on barhayein.` : 'Booker banane ke liye "Booker login" add-on lein.',
        }, HttpStatus.PAYMENT_REQUIRED);
      }
    }
    if (rule && !rule.any.some((f) => e.features.includes(f))) {
      const feature = rule.any[0];
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: rule.addOn ? 'ADDON_REQUIRED' : 'PLAN_FEATURE_REQUIRED',
        feature,
        addOnKey: rule.addOn ?? null,
        message: rule.addOn
          ? `${LABEL.get(feature) ?? feature} ke liye add-on chahiye. "Mera plan" me jaa kar abhi jodein.`
          : `${LABEL.get(feature) ?? feature} aap ke ${e.plan?.name ?? ''} plan me shamil nahi. Plan barhayein.`,
      });
    }
    if (limit) {
      const cap = e.limits[limit.limit];
      if (cap >= UNLIMITED) return;
      const current = await this.count(tenantId, limit.limit);
      if (current >= cap) {
        throw new HttpException({
          statusCode: 402,
          error: 'Plan Limit',
          code: 'PLAN_LIMIT',
          limit: limit.limit,
          current,
          max: cap,
          addOnKey: limit.addOn ?? null,
          message: `Aap ke plan me ${cap} ${limit.label} ki had hai. Plan barhayein${limit.addOn ? ' ya extra add-on lein' : ''}.`,
        }, HttpStatus.PAYMENT_REQUIRED);
      }
    }
  }

  private async count(tenantId: string, key: LimitKey): Promise<number> {
    if (key === 'users') return this.prisma.user.count({ where: { tenantId, isActive: true } });
    if (key === 'shops') return this.prisma.shop.count({ where: { tenantId, isActive: true } });
    if (key === 'products') return this.prisma.product.count({ where: { tenantId, isActive: true } });
    if (key === 'salesPerMonth') {
      // Pakistan calendar month; close enough for a limit check.
      const now = new Date(Date.now() + 5 * 3_600_000);
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 5 * 3_600_000);
      return this.prisma.sale.count({ where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: start } } });
    }
    return 0;
  }
}
