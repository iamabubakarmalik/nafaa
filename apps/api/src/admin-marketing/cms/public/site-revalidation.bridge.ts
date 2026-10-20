/**
 * Thin adapter between the A2 modules and A1's `SiteRevalidationService`
 * (global module), kept in one file so the dependency is easy to follow.
 *
 * On start it subscribes the public cache to every CMS change, so entry
 * publishes made by A1 also empty the cache at once (the cache's content
 * stamp check is the safety net).
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RevalidateReason, RevalidationResult } from '../contract/cms-contract';
import { SiteRevalidationService } from '../revalidation/site-revalidation.service';
import { CmsPublicCacheService } from './cms-public-cache.service';

export interface BridgeRequest {
  tags: string[];
  reason: RevalidateReason;
  entryId?: string;
  revisionId?: string;
}

@Injectable()
export class SiteRevalidationBridge implements OnModuleInit {
  /** The delegate stores the result on the revision row itself. */
  readonly recordsRevisions = true;

  constructor(
    private readonly site: SiteRevalidationService,
    private readonly cache: CmsPublicCacheService,
  ) {}

  onModuleInit(): void {
    this.site.subscribe(() => this.cache.flush());
  }

  revalidate(request: BridgeRequest): Promise<RevalidationResult> {
    return this.site.revalidate(request);
  }

  revalidateAll(): Promise<RevalidationResult> {
    return this.site.revalidateAll('manual');
  }

  lastResult(): { at: string; ok: boolean; error?: string } | null {
    return this.site.lastResult();
  }
}
