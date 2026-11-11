import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const SECRET_FIELDS = /pass(word)?|token|secret|code|otp|card|cvv|apikey|api_key/i;
const MAX_BODY = 4000;

/** Copies a request body without secrets and trims it to a safe size. */
function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_FIELDS.test(k) ? '•••' : redact(v, depth + 1)]));
  }
  return typeof value === 'string' && value.length > 500 ? `${value.slice(0, 500)}…` : value;
}

/**
 * Writes one AdminAuditLog row for every admin change (any non-GET request
 * under /admin) and for every impersonation, after the handler finishes —
 * including failed attempts, with their status code. Reads are not logged.
 * Logging never blocks or fails the request.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const isAdmin = /\/admin(\/|$)/.test(path) && !/\/admin\/auth\/(login|me|refresh)/.test(path);
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!isAdmin || (!write && !/impersonat/.test(path))) return next.handle();

    const record = (statusCode: number, error?: string) => {
      const user = req.user;
      const params = req.params ?? {};
      const targetId: string | undefined = params.id ?? params.tenantId ?? params.userId ?? Object.values(params)[0];
      const segments = path.replace(/^\/api/, '').split('/').filter(Boolean);
      const body = redact(req.body);
      const serialized = JSON.stringify(body ?? null);
      this.prisma.adminAuditLog.create({
        data: {
          actorId: user?.id ?? null,
          actorEmail: user?.email ?? null,
          action: req.adminPermission ?? segments.slice(1, 3).join('.'),
          method: req.method,
          path,
          targetType: segments[1] ?? null,
          targetId: targetId ?? null,
          statusCode,
          summary: error ? error.slice(0, 300) : null,
          ip: req.ip ?? null,
          userAgent: (req.headers?.['user-agent'] as string | undefined)?.slice(0, 300) ?? null,
          metadata: serialized.length <= MAX_BODY ? ({ body } as object) : ({ bodyTruncated: serialized.slice(0, MAX_BODY) } as object),
        },
      }).catch((e: Error) => this.logger.warn(`Audit write failed: ${e.message}`));
    };

    return next.handle().pipe(
      tap({
        next: () => record(context.switchToHttp().getResponse()?.statusCode ?? 200),
        error: (err: { status?: number; message?: string }) => record(err?.status ?? 500, err?.message),
      }),
    );
  }
}
