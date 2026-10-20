/**
 * Tells the public site which cache tags changed (API-CONTRACT 6, ARCH 7.4).
 *
 * - Signed `POST <url>/api/revalidate` to every URL in SITE_REVALIDATE_URLS.
 * - The caller waits for the first attempt only (5 s timeout); failures are
 *   retried after 1 s, 5 s and 30 s in the background.
 * - The result is written to the related CmsRevision (`revalidatedAt` /
 *   `revalidateError`) when a revision id is given.
 * - In-process listeners (`subscribe`) hear every change first, so the public
 *   API can flush its LRU cache even when the site is not configured.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { REVALIDATION, cacheTags, type RevalidateReason, type RevalidateRequest, type RevalidationResult } from '../contract/cms-contract';
import { CmsFanoutService } from './cms-fanout.service';
import { normalizeTags, signRevalidation } from './revalidation-signing';

export interface RevalidateInput {
  tags: readonly string[];
  reason: RevalidateReason;
  entryId?: string | null;
  /** Revision that records the result (entry, FAQ, menu or setting revision). */
  revisionId?: string | null;
}

export interface CmsChangeEvent {
  tags: string[];
  reason: RevalidateReason;
  entryId?: string;
}
export type CmsChangeListener = (event: CmsChangeEvent) => void;

export interface LastRevalidation {
  at: string;
  ok: boolean;
  error?: string;
}

const NOT_CONFIGURED = 'Site revalidation set nahi (SITE_REVALIDATE_URLS / SITE_REVALIDATE_SECRET)';

@Injectable()
export class SiteRevalidationService {
  private readonly logger = new Logger(SiteRevalidationService.name);
  private readonly listeners = new Set<CmsChangeListener>();
  private last: LastRevalidation | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: CmsFanoutService,
  ) {}

  /** Registers an in-process listener; returns an unsubscribe function. */
  subscribe(listener: CmsChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Result of the most recent call in this process (dashboard). */
  lastResult(): LastRevalidation | null {
    return this.last;
  }

  private targets(): string[] {
    return (process.env.SITE_REVALIDATE_URLS ?? '')
      .split(',')
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//.test(u));
  }

  async revalidate(input: RevalidateInput): Promise<RevalidationResult> {
    const tags = normalizeTags(input.tags);
    if (tags.length === 0) return { ok: true };
    const event: CmsChangeEvent = { tags, reason: input.reason, ...(input.entryId ? { entryId: input.entryId } : {}) };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.warn(`CMS change listener failed: ${String(error)}`);
      }
    }

    const urls = this.targets();
    const secret = process.env.SITE_REVALIDATE_SECRET?.trim();
    if (urls.length === 0 || !secret) {
      await this.record(input.revisionId, { ok: false, error: NOT_CONFIGURED });
      return { ok: false, error: NOT_CONFIGURED };
    }

    const payload: RevalidateRequest = {
      tags,
      reason: input.reason,
      ...(input.entryId ? { entryId: input.entryId } : {}),
      ...(input.revisionId ? { revisionId: input.revisionId } : {}),
    };
    const body = JSON.stringify(payload);
    const failed = await this.sendAll(urls, body, secret);
    if (failed.length === 0) {
      await this.record(input.revisionId, { ok: true });
      return { ok: true };
    }
    const error = failed.map((f) => `${f.url}: ${f.error}`).join('; ');
    await this.record(input.revisionId, { ok: false, error });
    this.retryInBackground(failed.map((f) => f.url), body, secret, input.revisionId ?? null, 0);
    return { ok: false, error };
  }

  /** Marks every cached page stale (dashboard "Revalidate everything"). */
  revalidateAll(reason: RevalidateReason = 'manual'): Promise<RevalidationResult> {
    return this.revalidate({ tags: [cacheTags.all], reason });
  }

  /**
   * After a change in Admin → Plans: the plans data, llms files and every
   * live page or FAQ whose text holds a price token.
   */
  async revalidatePlans(): Promise<RevalidationResult> {
    try {
      const pages = await this.fanout.textMatchTags('price:');
      return await this.revalidate({ tags: [cacheTags.plans, cacheTags.llms, ...pages], reason: 'plans' });
    } catch (error) {
      this.logger.warn(`Plans revalidation failed: ${String(error)}`);
      return { ok: false, error: String(error) };
    }
  }

  private async sendAll(urls: string[], body: string, secret: string): Promise<{ url: string; error: string }[]> {
    const results = await Promise.all(urls.map(async (url) => ({ url, error: await this.sendOne(url, body, secret) })));
    return results.filter((r): r is { url: string; error: string } => r.error !== null);
  }

  /** Returns null on success, or a short error. */
  private async sendOne(url: string, body: string, secret: string): Promise<string | null> {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [REVALIDATION.timestampHeader]: String(timestamp),
          [REVALIDATION.signatureHeader]: signRevalidation(secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(REVALIDATION.timeoutMs),
      });
      return res.ok ? null : `HTTP ${res.status}`;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  private retryInBackground(urls: string[], body: string, secret: string, revisionId: string | null, attempt: number): void {
    const delay = REVALIDATION.retryDelaysMs[attempt];
    if (delay === undefined) return;
    const timer = setTimeout(() => {
      void (async () => {
        const failed = await this.sendAll(urls, body, secret);
        if (failed.length === 0) {
          await this.record(revisionId, { ok: true });
          return;
        }
        const error = failed.map((f) => `${f.url}: ${f.error}`).join('; ');
        await this.record(revisionId, { ok: false, error: `${error} (retry ${attempt + 1})` });
        this.retryInBackground(failed.map((f) => f.url), body, secret, revisionId, attempt + 1);
      })();
    }, delay);
    timer.unref?.();
  }

  private async record(revisionId: string | null | undefined, result: RevalidationResult): Promise<void> {
    const at = new Date();
    this.last = { at: at.toISOString(), ok: result.ok, ...(result.error ? { error: result.error } : {}) };
    if (!result.ok) this.logger.warn(`Site revalidation failed: ${result.error ?? 'unknown'}`);
    if (!revisionId) return;
    await this.prisma.cmsRevision
      .update({
        where: { id: revisionId },
        data: result.ok ? { revalidatedAt: at, revalidateError: null } : { revalidateError: (result.error ?? 'failed').slice(0, 2000) },
      })
      .catch(() => undefined);
  }
}
