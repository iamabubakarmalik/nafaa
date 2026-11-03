/**
 * Storage for the Idempotency-Key header (see IdempotencyInterceptor).
 *
 * A request claims its key by inserting a row; a second request with the
 * same key then either gets the stored answer (DONE), a refusal because its
 * body differs, or "still running" while the first one is in progress.
 * Failed requests release their claim, so a retry after an error runs again.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/** How long a stored answer is kept. */
export const IDEMPOTENCY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A claim older than this with no answer is treated as abandoned (crashed process). */
export const IDEMPOTENCY_STALE_MS = 5 * 60 * 1000;
/** Answers larger than this are not stored; a retry would run the request again. */
export const IDEMPOTENCY_MAX_BODY_BYTES = 2 * 1024 * 1024;

export interface IdempotencyClaimInput {
  tenantId: string;
  userId: string;
  key: string;
  method: string;
  path: string;
  requestHash: string;
}

export type IdempotencyClaim =
  | { kind: 'claimed'; id: string }
  | { kind: 'replay'; statusCode: number; body: unknown }
  | { kind: 'mismatch' }
  | { kind: 'busy' };

/** The operations the interceptor needs; tests provide an in-memory version. */
export interface IdempotencyStore {
  claim(input: IdempotencyClaimInput): Promise<IdempotencyClaim>;
  complete(id: string, statusCode: number, body: unknown): Promise<void>;
  release(id: string): Promise<void>;
}

@Injectable()
export class IdempotencyService implements IdempotencyStore {
  private readonly logger = new Logger('Idempotency');

  constructor(private readonly prisma: PrismaService) {}

  async claim(input: IdempotencyClaimInput): Promise<IdempotencyClaim> {
    const { tenantId, userId, key } = input;
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = randomUUID();
      const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
      const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "IdempotencyRecord" ("id", "tenantId", "userId", "key", "method", "path", "requestHash", "status", "lockedAt", "createdAt", "expiresAt")
        VALUES (${id}, ${tenantId}, ${userId}, ${key}, ${input.method}, ${input.path}, ${input.requestHash}, 'IN_PROGRESS', now(), now(), ${expiresAt})
        ON CONFLICT ("tenantId", "userId", "key") DO NOTHING
        RETURNING "id"`);
      if (inserted.length) return { kind: 'claimed', id: inserted[0].id };

      const existing = await this.prisma.idempotencyRecord.findUnique({
        where: { tenantId_userId_key: { tenantId, userId, key } },
      });
      if (!existing) continue; // released between the insert and the read
      if (existing.expiresAt.getTime() < Date.now()) {
        await this.prisma.idempotencyRecord.deleteMany({ where: { id: existing.id } });
        continue;
      }
      if (existing.requestHash !== input.requestHash) return { kind: 'mismatch' };
      if (existing.status === 'DONE') {
        return { kind: 'replay', statusCode: existing.statusCode ?? 200, body: existing.responseBody };
      }
      if (existing.lockedAt.getTime() < Date.now() - IDEMPOTENCY_STALE_MS) {
        const taken = await this.prisma.idempotencyRecord.updateMany({
          where: { id: existing.id, status: 'IN_PROGRESS', lockedAt: existing.lockedAt },
          data: { lockedAt: new Date() },
        });
        if (taken.count === 1) return { kind: 'claimed', id: existing.id };
      }
      return { kind: 'busy' };
    }
    return { kind: 'busy' };
  }

  async complete(id: string, statusCode: number, body: unknown): Promise<void> {
    const json = body === undefined ? 'null' : JSON.stringify(body);
    if (json.length > IDEMPOTENCY_MAX_BODY_BYTES) {
      this.logger.warn(`Answer too large to keep (${json.length} bytes); key released`);
      await this.release(id);
      return;
    }
    await this.prisma.idempotencyRecord.update({
      where: { id },
      data: {
        status: 'DONE',
        statusCode,
        responseBody: JSON.parse(json) ?? Prisma.JsonNull,
        completedAt: new Date(),
      },
    });
  }

  async release(id: string): Promise<void> {
    await this.prisma.idempotencyRecord.deleteMany({ where: { id, status: 'IN_PROGRESS' } });
  }

  /** Removes expired rows in small batches so the table stays small. */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanup(): Promise<number> {
    let removed = 0;
    try {
      for (let i = 0; i < 50; i++) {
        const n = await this.prisma.$executeRaw(Prisma.sql`
          DELETE FROM "IdempotencyRecord"
          WHERE "id" IN (SELECT "id" FROM "IdempotencyRecord" WHERE "expiresAt" < now() LIMIT 5000)`);
        removed += n;
        if (n < 5000) break;
      }
      if (removed > 0) this.logger.log(`Removed ${removed} expired idempotency records`);
    } catch (e) {
      this.logger.warn(`Cleanup failed: ${(e as Error)?.message}`);
    }
    return removed;
  }
}
