import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/** Write presence at most once per user per minute. */
const WRITE_EVERY_MS = 60_000;
const lastWrite = new Map<string, number>();

/** Which Nafaa app sent the request, from its user agent. */
export function appFromUserAgent(ua: string | undefined): 'desktop' | 'mobile' | 'web' {
  if (!ua) return 'web';
  if (/Electron/i.test(ua)) return 'desktop';
  if (/okhttp|Expo|Dart|CFNetwork|NafaaMobile|Darwin\//i.test(ua)) return 'mobile';
  return 'web';
}

/**
 * Records when each signed-in user (and their shop) was last active and from
 * which app, for the admin panel's "online now" and "last active" views.
 * Runs after authentication on every request, writes in the background and
 * never delays or fails the request.
 */
@Injectable()
export class PresenceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PresenceInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      const user = req.user as { id?: string; tenantId?: string; impersonatedBy?: string } | undefined;
      // Admin "sign in as shop" sessions are not the shop being active.
      if (user?.id && !user.impersonatedBy && !req.headers?.['x-impersonating']) {
        const now = Date.now();
        if (now - (lastWrite.get(user.id) ?? 0) >= WRITE_EVERY_MS) {
          lastWrite.set(user.id, now);
          if (lastWrite.size > 50_000) lastWrite.clear();
          const at = new Date(now);
          const via = appFromUserAgent(req.headers?.['user-agent']);
          Promise.all([
            this.prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: at, lastSeenVia: via } }),
            user.tenantId ? this.prisma.tenant.update({ where: { id: user.tenantId }, data: { lastActiveAt: at } }) : null,
          ]).catch((e: Error) => this.logger.debug(`Presence write skipped: ${e.message}`));
        }
      }
    }
    return next.handle();
  }
}
