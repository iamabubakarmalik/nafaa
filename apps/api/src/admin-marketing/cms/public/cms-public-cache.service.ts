/**
 * In-process LRU cache for the public read API (ARCH 7.2).
 *
 * Entries live 60 s. The cache is emptied:
 * - by `flush()`, which every A2 write calls through `CmsSiteEvents`;
 * - when the content stamp changes. The stamp is the latest `updatedAt` (and
 *   row count) across the tables public responses read. It is checked at most
 *   every 2 s, so writes made elsewhere (A1 publishing, Admin → Plans) show up
 *   within seconds without those services having to know about this cache.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const TTL_MS = 60_000;
const MAX_ENTRIES = 1_000;
const STAMP_CHECK_MS = 2_000;

interface Slot {
  value: unknown;
  expiresAt: number;
}

@Injectable()
export class CmsPublicCacheService {
  private readonly logger = new Logger(CmsPublicCacheService.name);
  private readonly slots = new Map<string, Slot>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private stamp: string | null = null;
  private stampCheckedAt = 0;
  private stampCheck: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Cached value for `key`, or the loader's result (stored for 60 s). */
  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    await this.ensureFresh();
    const now = Date.now();
    const hit = this.slots.get(key);
    if (hit && hit.expiresAt > now) {
      // Move to the end so the map order stays least-recently-used first.
      this.slots.delete(key);
      this.slots.set(key, hit);
      return hit.value as T;
    }
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = load()
      .then((value) => {
        this.slots.set(key, { value, expiresAt: Date.now() + TTL_MS });
        while (this.slots.size > MAX_ENTRIES) {
          const oldest = this.slots.keys().next().value;
          if (oldest === undefined) break;
          this.slots.delete(oldest);
        }
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  /** Empties the cache (after any change to public data). */
  flush(): void {
    this.slots.clear();
    this.stampCheckedAt = 0;
  }

  private async ensureFresh(): Promise<void> {
    if (Date.now() - this.stampCheckedAt < STAMP_CHECK_MS) return;
    if (!this.stampCheck) {
      this.stampCheck = this.readStamp()
        .then((stamp) => {
          if (this.stamp !== null && stamp !== this.stamp) this.slots.clear();
          this.stamp = stamp;
          this.stampCheckedAt = Date.now();
        })
        .catch((err: unknown) => {
          // Serve from cache (bounded by the TTL) rather than failing reads.
          this.logger.warn(`Content stamp check failed: ${err instanceof Error ? err.message : String(err)}`);
          this.stampCheckedAt = Date.now();
        })
        .finally(() => {
          this.stampCheck = null;
        });
    }
    await this.stampCheck;
  }

  private async readStamp(): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ stamp: string | null }[]>`
      SELECT concat_ws('|',
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsEntry"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsFaq"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsRedirect"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsMenu"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsSetting"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsCustomer"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsTestimonial"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "CmsMedia"),
        (SELECT max("updatedAt")::text || ':' || count(*)::text FROM "Plan")
      ) AS stamp`;
    return rows[0]?.stamp ?? '';
  }
}
