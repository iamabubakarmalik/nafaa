/**
 * MetaGraphService: every server call to the Meta Graph API goes through
 * here. It picks the stored token (user or page), adds appsecret_proof,
 * retries transient failures with backoff, pauses a business after a rate
 * limit, marks the connection EXPIRED / REVOKED on token errors (the web shows
 * a reconnect banner), and turns Graph errors into plain merchant messages.
 *
 * Shared contract (used by the ads and WhatsApp parts):
 *   call(tenantId, { method, path, params, body, token: 'user' | 'page:<id>' })
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MetaConnection } from '@prisma/client';
import { apiText } from '../../common/i18n/api-message';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../../core/lib/crypto';
import { pushPaused } from '../online-orders/commerce-controls';
import {
  GRAPH_BASE, GraphErrorBody, MetaErrorKind, appSecretProof, backoffMs, classifyGraphError, friendlyMetaError, metaAppConfig, retryable,
  tokenErrorStatus, usageFromHeaders,
} from './meta-graph';

export type MetaTokenRef = 'user' | 'page' | `page:${string}`;

export interface MetaCallOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  /** Path after the version, e.g. "me/accounts" or "act_123/insights". */
  path: string;
  /** Query string values (objects and arrays are JSON-encoded). */
  params?: Record<string, unknown>;
  /** JSON body for POST. */
  body?: Record<string, unknown>;
  /** Which stored token: the user token, the chosen page ('page') or a page by id ('page:<id>'). Default 'user'. */
  token?: MetaTokenRef;
  /** Tries for transient errors and rate limits (default 3; 1 = no retry). */
  attempts?: number;
}

export type MetaFailKind = MetaErrorKind | 'not_connected' | 'not_configured' | 'paused';

/** A Graph failure with a merchant-readable message and the raw details for logs. */
export class MetaGraphError extends BadRequestException {
  constructor(
    readonly kind: MetaFailKind,
    readonly friendly: string,
    readonly graph: GraphErrorBody | null = null,
    readonly httpStatus = 400,
  ) {
    super({ message: friendly, code: `META_${kind.toUpperCase()}` });
  }
}

/** Shorthand for a MetaGraphError (also keeps kind names out of the translation scan). */
export const metaFail = (kind: MetaFailKind, friendly: string, graph: GraphErrorBody | null = null, httpStatus = 400) => new MetaGraphError(kind, friendly, graph, httpStatus);

export interface StoredPage {
  id: string;
  name: string;
  /** Encrypted page access token. */
  token: string | null;
  picture?: string | null;
  igId?: string | null;
  igUsername?: string | null;
  igPicture?: string | null;
  tasks?: string[];
}

export const ACTIVE_STATUSES = ['CONNECTED'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const encodeParam = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

@Injectable()
export class MetaGraphService {
  private readonly logger = new Logger('MetaGraph');
  /** tenantId → time until which calls are refused after a rate limit. */
  private readonly cooldown = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /** App credentials, or a clear error when the server has none. */
  app() {
    const cfg = metaAppConfig();
    if (!cfg) throw metaFail('not_configured', apiText('Facebook ka jor abhi Nafaa server par tayyar nahi — Nafaa support se rabta karein'));
    return cfg;
  }

  /** The stored connection row (tokens still encrypted), or null. */
  connection(tenantId: string): Promise<MetaConnection | null> {
    return this.prisma.metaConnection.findUnique({ where: { tenantId } });
  }

  /** Pages saved on the connection. */
  pages(conn: Pick<MetaConnection, 'pages'> | null): StoredPage[] {
    return Array.isArray(conn?.pages) ? (conn!.pages as unknown as StoredPage[]) : [];
  }

  /**
   * One Graph call for a business with its stored token. Throws MetaGraphError
   * (a 400 with a plain message) on failure.
   */
  async call<T = any>(tenantId: string, opts: MetaCallOptions): Promise<T> {
    if (await pushPaused(this.prisma, 'META')) throw metaFail('paused', apiText('Facebook ka kaam Nafaa ne thori der ke liye rok rakha hai — baad me khud chal jayega'));
    const conn = await this.connection(tenantId);
    if (!conn || !conn.userToken) throw metaFail('not_connected', apiText('Facebook abhi jura nahi — Settings → Facebook & Instagram se joren'));
    if (!ACTIVE_STATUSES.includes(conn.status)) throw metaFail('token', friendlyMetaError('token'));
    const token = this.tokenFor(conn, opts.token ?? 'user');
    const until = this.cooldown.get(tenantId) ?? 0;
    if (until > Date.now()) throw metaFail('rate_limit', friendlyMetaError('rate_limit'));
    try {
      return await this.request<T>(token, opts, tenantId);
    } catch (e) {
      if (e instanceof MetaGraphError && e.kind === 'token') await this.markTokenError(tenantId, e.graph);
      throw e;
    }
  }

  /** Follows `paging.next` and returns all `data` rows (up to `max`). */
  async callAll<T = any>(tenantId: string, opts: MetaCallOptions, max = 500): Promise<T[]> {
    const out: T[] = [];
    let after: string | undefined;
    for (let i = 0; i < 50 && out.length < max; i++) {
      const res = await this.call<{ data?: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(tenantId, {
        ...opts, method: 'GET', params: { ...(opts.params ?? {}), ...(after ? { after } : {}) },
      });
      out.push(...(res?.data ?? []));
      after = res?.paging?.next ? res?.paging?.cursors?.after : undefined;
      if (!after) break;
    }
    return out.slice(0, max);
  }

  /** A call with an explicit token (OAuth time, before anything is stored). */
  withToken<T = any>(accessToken: string, opts: MetaCallOptions): Promise<T> {
    return this.request<T>(accessToken, opts, null);
  }

  /** A call with the app token (APP_ID|APP_SECRET), e.g. debug_token. */
  appCall<T = any>(opts: MetaCallOptions): Promise<T> {
    const { appId, appSecret } = this.app();
    return this.request<T>(`${appId}|${appSecret}`, opts, null, false);
  }

  /** A call without any access token (the OAuth code exchange carries client_secret itself). */
  bareCall<T = any>(opts: MetaCallOptions): Promise<T> {
    this.app();
    return this.request<T>(null, opts, null, false);
  }

  /** Decrypted token for a token reference. */
  tokenFor(conn: MetaConnection, ref: MetaTokenRef): string {
    if (ref === 'user') {
      const t = decrypt(conn.userToken);
      if (!t) throw metaFail('token', friendlyMetaError('token'));
      return t;
    }
    const pageId = ref === 'page' ? conn.pageId : ref.slice(5);
    const page = this.pages(conn).find((p) => p.id === pageId);
    const t = page ? decrypt(page.token) : null;
    if (!t) throw metaFail('permission', apiText('Facebook page chuna nahi gaya ya us ki ijazat nahi — Settings → Facebook & Instagram me page chunein'));
    return t;
  }

  /** Saves a token problem on the connection so the web shows "Dobara joren". */
  async markTokenError(tenantId: string, graph: GraphErrorBody | null) {
    await this.prisma.metaConnection.updateMany({
      where: { tenantId, status: 'CONNECTED' },
      data: { status: tokenErrorStatus(graph), lastError: friendlyMetaError('token'), lastErrorAt: new Date() },
    }).catch(() => null);
  }

  private async request<T>(accessToken: string | null, opts: MetaCallOptions, tenantId: string | null, proof = true): Promise<T> {
    const { appSecret } = this.app();
    const method = opts.method ?? 'GET';
    const path = opts.path.replace(/^\/+/, '');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.params ?? {})) if (v !== undefined && v !== null) qs.set(k, encodeParam(v));
    if (accessToken) {
      qs.set('access_token', accessToken);
      if (proof) qs.set('appsecret_proof', appSecretProof(accessToken, appSecret));
    }
    const url = `${GRAPH_BASE}/${path}?${qs}`;
    const max = Math.max(1, Math.min(5, opts.attempts ?? 3));

    for (let attempt = 1; ; attempt++) {
      let status = 0;
      let json: any = null;
      let headers: Record<string, string | null> = {};
      try {
        const res = await fetch(url, {
          method,
          headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
          body: opts.body && method !== 'GET' ? JSON.stringify(opts.body) : undefined,
          signal: AbortSignal.timeout(45_000),
        });
        status = res.status;
        headers = {
          'x-app-usage': res.headers.get('x-app-usage'),
          'x-business-use-case-usage': res.headers.get('x-business-use-case-usage'),
          'x-ad-account-usage': res.headers.get('x-ad-account-usage'),
        };
        const text = await res.text();
        try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
      } catch (e) {
        // Network failure or timeout: transient.
        if (attempt < max) { await sleep(backoffMs(attempt, 'transient')); continue; }
        this.logger.warn(`Graph ${method} ${path}: ${(e as Error).message}`);
        throw metaFail('transient', friendlyMetaError('transient'));
      }

      const usage = usageFromHeaders(headers);
      if (tenantId && usage.waitMin > 0) this.cooldown.set(tenantId, Date.now() + usage.waitMin * 60_000);

      if (status >= 200 && status < 300 && !json?.error) return json as T;

      const err: GraphErrorBody = json?.error ?? { message: `HTTP ${status}` };
      const kind = classifyGraphError(err, status);
      if (retryable(kind) && attempt < max) {
        await sleep(backoffMs(attempt, kind));
        continue;
      }
      if (kind === 'rate_limit' && tenantId) this.cooldown.set(tenantId, Date.now() + Math.max(1, usage.waitMin || 1) * 60_000);
      this.logger.warn(`Graph ${method} ${path} failed: ${err.code ?? '?'}/${err.error_subcode ?? '-'} ${err.message ?? ''} (trace ${err.fbtrace_id ?? '-'})`);
      throw new MetaGraphError(kind, friendlyMetaError(kind, err), err, status);
    }
  }
}
