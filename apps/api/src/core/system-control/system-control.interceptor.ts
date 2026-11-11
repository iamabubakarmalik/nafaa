/**
 * Applies the platform switches to incoming requests:
 * - maintenance mode: shop users get 503 with the admin's message. The admin
 *   panel, admin "sign in as shop" sessions, public pages, webhooks and token
 *   refresh keep working, so nobody is signed out and integrations keep flowing;
 * - signups closed: new shop registration is refused;
 * - Nafaa AI off: the assistant endpoints are refused.
 *
 * Runs after the auth guards, so `req.user` is known here.
 */

import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor, ServiceUnavailableException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SystemControlService } from './system-control.service';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_STAFF']);
/** Merchant auth endpoints that stay open in maintenance so sessions survive. */
const AUTH_OPEN = new Set(['/api/auth/refresh', '/api/auth/logout']);
const SIGNUP_PATHS = new Set(['/api/auth/register', '/api/auth/google/complete-signup', '/api/auth/apple/complete-signup']);

@Injectable()
export class SystemControlInterceptor implements NestInterceptor {
  constructor(private readonly controls: SystemControlService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (path.startsWith('/api/admin') || path.startsWith('/health')) return next.handle();

    const user = req.user as { role?: string; impersonatedBy?: string } | undefined;
    const isShopUser = !!user?.role && !ADMIN_ROLES.has(user.role) && !user.impersonatedBy;

    const m = this.controls.maintenance;
    if (m.on && !AUTH_OPEN.has(path) && (isShopUser || path.startsWith('/api/auth/'))) {
      throw new ServiceUnavailableException({ statusCode: 503, error: 'Maintenance', message: m.message, until: m.until ?? null });
    }
    if (!this.controls.signupsOpen && req.method === 'POST' && SIGNUP_PATHS.has(path)) {
      throw new ForbiddenException('Abhi nayi dukaan register nahi ho sakti. Thori der baad dobara koshish karein ya Nafaa support se rabta karein.');
    }
    if (!this.controls.aiEnabled && path.startsWith('/api/ai/') && isShopUser) {
      throw new ServiceUnavailableException({ statusCode: 503, error: 'AiPaused', message: 'Nafaa AI abhi band hai. Thori der baad dobara koshish karein.' });
    }
    return next.handle();
  }
}
