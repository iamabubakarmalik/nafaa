import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { clientFromRequest } from '../journey/client-platform';
import { JourneyCaptureService } from '../journey/journey-capture.service';

/** Write presence at most once per user and app per minute. */
const WRITE_EVERY_MS = 60_000;
const lastWrite = new Map<string, number>();

/**
 * Records when each signed-in user (and their shop) was last active and from
 * which app, for the admin panel's "online now" and "last active" views and
 * the per-app last seen of the merchant journey.
 * Runs after authentication on every request, writes in the background and
 * never delays or fails the request.
 */
@Injectable()
export class PresenceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PresenceInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyCaptureService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      const user = req.user as { id?: string; tenantId?: string; impersonatedBy?: string } | undefined;
      // Admin "sign in as shop" sessions are not the shop being active.
      if (user?.id && !user.impersonatedBy && !req.headers?.['x-impersonating']) {
        const now = Date.now();
        const client = clientFromRequest(req);
        // Per user and app, so switching between web and the phone records both.
        const key = `${user.id}:${client.platform}`;
        if (now - (lastWrite.get(key) ?? 0) >= WRITE_EVERY_MS) {
          lastWrite.set(key, now);
          if (lastWrite.size > 50_000) lastWrite.clear();
          const at = new Date(now);
          const via = client.platform === 'android' || client.platform === 'ios' ? 'mobile' : client.platform;
          // Raw SQL on purpose: Prisma's update would also bump updatedAt, which
          // sync and change feeds read. Only the presence columns change here.
          Promise.all([
            this.prisma.$executeRaw`UPDATE "User" SET "lastSeenAt" = ${at}, "lastSeenVia" = ${via} WHERE id = ${user.id}`,
            user.tenantId ? this.prisma.$executeRaw`UPDATE "Tenant" SET "lastActiveAt" = ${at} WHERE id = ${user.tenantId}` : null,
          ]).catch((e: Error) => this.logger.debug(`Presence write skipped: ${e.message}`));
          // Separate write: a failure here (e.g. before the journey migration) never stops the one above.
          this.journey.touch(user.id, user.tenantId, client.platform, at)
            .catch((e: Error) => this.logger.debug(`Journey last-seen skipped: ${e.message}`));
        }
      }
    }
    return next.handle();
  }
}
