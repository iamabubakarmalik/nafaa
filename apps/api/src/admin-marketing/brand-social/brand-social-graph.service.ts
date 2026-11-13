/**
 * Graph calls for Nafaa Social. Uses MetaGraphService.withToken (version,
 * appsecret_proof, backoff and error sorting stay in one place) with the
 * tokens stored on brand_social_accounts, and turns failures into English
 * text for the admin panel. A token failure marks the account
 * NEEDS_RECONNECT.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BrandSocialAccount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../../core/lib/crypto';
import { GraphErrorBody, GraphStep, resolveRefs } from '../../integrations/meta/meta-graph';
import { MetaCallOptions, MetaGraphError, MetaGraphService } from '../../integrations/meta/meta-graph.service';
import { metaErrorText } from './brand-social.logic';

/** A Graph failure with English text for the admin panel. */
export class SocialGraphError extends Error {
  constructor(readonly kind: string, readonly text: string, readonly graph: GraphErrorBody | null = null) {
    super(text);
  }
}

export const toSocialError = (e: unknown): SocialGraphError => {
  if (e instanceof SocialGraphError) return e;
  if (e instanceof MetaGraphError) return new SocialGraphError(e.kind, metaErrorText(e.kind, e.graph), e.graph);
  return new SocialGraphError('unknown', (e as Error)?.message ? `Request failed: ${(e as Error).message}` : 'Request failed.');
};

@Injectable()
export class BrandSocialGraphService {
  private readonly logger = new Logger('BrandSocialGraph');

  constructor(private readonly prisma: PrismaService, readonly meta: MetaGraphService) {}

  /** Whether META_APP_ID / META_APP_SECRET are set. */
  configured(): boolean {
    try { this.meta.app(); return true; } catch { return false; }
  }

  tokenOf(account: Pick<BrandSocialAccount, 'accessTokenEnc'>): string {
    const t = decrypt(account.accessTokenEnc);
    if (!t) throw new SocialGraphError('token', metaErrorText('token'));
    return t;
  }

  /** One call with a plain token. Writes default to a single try (a retried POST could post twice). */
  async withToken<T = any>(token: string, opts: MetaCallOptions): Promise<T> {
    try {
      return await this.meta.withToken<T>(token, { attempts: opts.method === 'POST' ? 1 : 2, ...opts });
    } catch (e) {
      throw toSocialError(e);
    }
  }

  /** One call with an account's token; a token error marks the account for reconnecting. */
  async call<T = any>(account: BrandSocialAccount, opts: MetaCallOptions): Promise<T> {
    try {
      return await this.withToken<T>(this.tokenOf(account), opts);
    } catch (e) {
      const err = toSocialError(e);
      if (err.kind === 'token') await this.markReconnect(account.id, err.text);
      throw err;
    }
  }

  async markReconnect(accountId: string, text: string) {
    await this.prisma.brandSocialAccount.updateMany({
      where: { id: accountId, status: 'CONNECTED' },
      data: { status: 'NEEDS_RECONNECT', lastError: text, lastCheckedAt: new Date() },
    }).catch((e) => this.logger.warn(`Mark reconnect failed: ${(e as Error).message}`));
  }

  /** Runs publish plan steps in order; each id is saved under its ref (photo post ids under `<ref>_post_id`). */
  async runSteps(account: BrandSocialAccount, steps: GraphStep[]): Promise<Record<string, string>> {
    const ids: Record<string, string> = {};
    for (const s of steps) {
      const res = await this.call<{ id?: string; post_id?: string }>(account, { method: s.method, path: s.path, body: resolveRefs(s.body, ids) });
      if (!res?.id) throw new SocialGraphError('unknown', 'Facebook did not return an id for the new post.');
      ids[s.ref] = res.id;
      if (res.post_id) ids[`${s.ref}_post_id`] = res.post_id;
    }
    return ids;
  }

  /** The app token call (debug_token). */
  async appCall<T = any>(opts: MetaCallOptions): Promise<T> {
    try { return await this.meta.appCall<T>(opts); } catch (e) { throw toSocialError(e); }
  }

  /** The OAuth code exchange (client_secret in the query, no token). */
  async bareCall<T = any>(opts: MetaCallOptions): Promise<T> {
    try { return await this.meta.bareCall<T>(opts); } catch (e) { throw toSocialError(e); }
  }
}
