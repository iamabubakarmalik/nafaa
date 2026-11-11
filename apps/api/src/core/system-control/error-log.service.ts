/**
 * Server error log. Errors are grouped by a fingerprint (where + normalized
 * message) and buffered in memory, then written at most every 10 seconds, so
 * an error storm costs a handful of queries instead of one per request.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface ErrorInput {
  source: 'http' | 'job';
  route: string;
  method?: string;
  status?: number;
  path?: string;
  userId?: string;
  tenantId?: string;
  error: unknown;
}

interface Pending {
  input: ErrorInput;
  message: string;
  stack?: string;
  count: number;
  at: Date;
}

const FLUSH_MS = 10_000;
const MAX_PENDING = 500;

/** Ids, numbers and quoted values vary per request; they should not split one error into many. */
const normalize = (s: string) =>
  s
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\b\d+\b/g, '#')
    .replace(/(["'`]).{1,80}?\1/g, '$1…$1')
    .slice(0, 300);

/** Turns a URL into a route-like pattern when Express did not match a route. */
export const routeFromPath = (url: string) =>
  url.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id').replace(/\/\d+(?=\/|$)/g, '/:n');

@Injectable()
export class ErrorLogService implements OnModuleDestroy {
  private readonly logger = new Logger(ErrorLogService.name);
  private pending = new Map<string, Pending>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  capture(input: ErrorInput): void {
    try {
      const err = input.error;
      const message = (err instanceof Error ? err.message : String(err ?? 'Unknown error')).slice(0, 2000) || 'Unknown error';
      const stack = err instanceof Error ? err.stack?.slice(0, 6000) : undefined;
      const fingerprint = createHash('sha1')
        .update(`${input.source}|${input.method ?? ''}|${input.route}|${err instanceof Error ? err.name : ''}|${normalize(message.split('\n')[0])}`)
        .digest('hex');
      const p = this.pending.get(fingerprint);
      if (p) {
        p.count++;
        p.at = new Date();
        p.input = input;
      } else if (this.pending.size < MAX_PENDING) {
        this.pending.set(fingerprint, { input, message, stack, count: 1, at: new Date() });
      }
      if (!this.timer) this.timer = setTimeout(() => void this.flush(), FLUSH_MS);
    } catch {
      // Logging an error must never cause another one.
    }
  }

  async flush(): Promise<void> {
    this.timer = null;
    const batch = this.pending;
    this.pending = new Map();
    for (const [fingerprint, p] of batch) {
      const last = {
        lastSeenAt: p.at,
        lastPath: p.input.path?.slice(0, 500) ?? null,
        lastUserId: p.input.userId ?? null,
        lastTenantId: p.input.tenantId ?? null,
      };
      try {
        await this.prisma.serverError.upsert({
          where: { fingerprint },
          create: {
            fingerprint,
            source: p.input.source,
            method: p.input.method ?? null,
            route: p.input.route.slice(0, 500),
            status: p.input.status ?? null,
            message: p.message,
            stack: p.stack ?? null,
            count: p.count,
            firstSeenAt: p.at,
            ...last,
          },
          // A resolved error that comes back is open again, with the newest stack.
          update: { count: { increment: p.count }, stack: p.stack ?? undefined, resolvedAt: null, resolvedById: null, ...last },
        });
      } catch (e) {
        this.logger.warn(`Could not save error ${fingerprint}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
    if (this.pending.size) await this.flush();
  }
}
