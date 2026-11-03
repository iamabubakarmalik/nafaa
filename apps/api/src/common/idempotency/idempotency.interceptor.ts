/**
 * Honours the `Idempotency-Key` header on POST, PUT, PATCH and DELETE.
 *
 * A client that never got an answer (lost connection, timeout) sends the
 * same request again with the same key:
 *  - same key, same body, first request done: the stored answer is returned
 *    with `Idempotent-Replayed: true`, and nothing runs twice;
 *  - same key, different body: 422;
 *  - same key while the first request is still running: 409, try later.
 *
 * Keys are scoped per business and user. Only successful answers are kept;
 * a request that failed releases its key so it can be sent again. Requests
 * without the header, reads and requests before sign-in are untouched.
 *
 * Registered first among the global interceptors, so it stores the final
 * body exactly as the client received it.
 */

import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { IdempotencyService, type IdempotencyStore } from './idempotency.service';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_REPLAY_HEADER = 'Idempotent-Replayed';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

/** JSON with object keys sorted, so the same body always hashes the same. */
export function stableJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`;
}

export function requestHash(method: string, path: string, shop: string | undefined, body: unknown): string {
  return createHash('sha256').update(`${method} ${path}\n${shop ?? ''}\n${stableJson(body)}`).digest('hex');
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Idempotency');

  constructor(@Inject(IdempotencyService) private readonly store: IdempotencyStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> | Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request & { user?: { id?: string; tenantId?: string } }>();
    const method = (req.method ?? '').toUpperCase();
    if (!WRITE_METHODS.has(method)) return next.handle();
    const header = req.headers?.[IDEMPOTENCY_HEADER];
    if (header === undefined) return next.handle();
    const user = req.user;
    if (!user?.id || !user?.tenantId) return next.handle();

    const key = String(Array.isArray(header) ? header[0] : header).trim();
    if (!KEY_PATTERN.test(key)) {
      throw new BadRequestException('Idempotency-Key 8 se 128 haroof ka hona chahiye (A-Z, 0-9, - _ . :)');
    }
    return this.handle(context, next, req, user as { id: string; tenantId: string }, method, key);
  }

  private async handle(
    context: ExecutionContext,
    next: CallHandler,
    req: Request,
    user: { id: string; tenantId: string },
    method: string,
    key: string,
  ): Promise<Observable<unknown>> {
    const res = context.switchToHttp().getResponse<Response>();
    const path = req.originalUrl ?? req.url;
    const shop = req.headers?.['x-shop-id'];
    const hash = requestHash(method, path, Array.isArray(shop) ? shop[0] : shop, req.body);

    const claim = await this.store.claim({ tenantId: user.tenantId, userId: user.id, key, method, path, requestHash: hash });
    if (claim.kind === 'mismatch') {
      throw new UnprocessableEntityException('Ye request pehle doosre data ke saath bheji ja chuki hai');
    }
    if (claim.kind === 'busy') {
      res.setHeader('Retry-After', '2');
      throw new ConflictException('Ye kaam abhi chal raha hai — thori der baad dobara bhejein');
    }
    if (claim.kind === 'replay') {
      res.status(claim.statusCode);
      res.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
      return of(claim.body);
    }

    const id = claim.id;
    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.store
            .complete(id, res.statusCode || 200, body)
            .catch((e) => this.logger.warn(`Could not store answer for ${method} ${path}: ${(e as Error)?.message}`))
            .then(() => body),
        ),
      ),
      catchError((err) =>
        from(this.store.release(id).catch(() => undefined)).pipe(mergeMap(() => throwError(() => err))),
      ),
    );
  }
}
