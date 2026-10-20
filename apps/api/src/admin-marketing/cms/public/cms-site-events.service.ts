/**
 * One call for every A2 write that changes public data: empties the public
 * cache, then asks the site to revalidate the given tags through A1's
 * `SiteRevalidationService` (ARCH 7.4, API-CONTRACT 6).
 *
 * The result is returned so admin responses can show "Site updated" or
 * "Site update failed: retry", and stored on the related revision row when
 * a `revisionId` is given.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { REVALIDATION, cacheTags, type RevalidateReason } from '../contract/cms-contract';
import { CmsPublicCacheService } from './cms-public-cache.service';
import { SiteRevalidationBridge } from './site-revalidation.bridge';

export interface SiteChange {
  tags: string[];
  reason: RevalidateReason;
  entryId?: string;
  revisionId?: string;
}

export interface SiteChangeResult {
  ok: boolean;
  error?: string;
}

@Injectable()
export class CmsSiteEvents {
  private readonly logger = new Logger(CmsSiteEvents.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CmsPublicCacheService,
    private readonly bridge: SiteRevalidationBridge,
  ) {}

  /** Flushes the public cache and revalidates `tags` on the site. */
  async changed(change: SiteChange): Promise<SiteChangeResult> {
    this.cache.flush();
    const unique = [...new Set(change.tags.filter(Boolean))];
    const tags = unique.length > REVALIDATION.maxTags ? [cacheTags.all] : unique;
    if (tags.length === 0) return { ok: true };

    let result: SiteChangeResult;
    try {
      result = await this.bridge.revalidate({ ...change, tags });
    } catch (err: unknown) {
      result = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    if (!result.ok) this.logger.warn(`Site revalidation (${change.reason}) failed: ${result.error ?? 'unknown error'}`);

    if (change.revisionId && !this.bridge.recordsRevisions) {
      await this.prisma.cmsRevision
        .update({
          where: { id: change.revisionId },
          data: result.ok ? { revalidatedAt: new Date(), revalidateError: null } : { revalidateError: result.error ?? 'failed' },
        })
        .catch(() => undefined);
    }
    return result;
  }
}
