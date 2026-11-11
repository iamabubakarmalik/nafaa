/**
 * Meta connection: Facebook Login for Business (config_id), the long-lived
 * token exchange, listing pages / Instagram accounts / ad accounts /
 * businesses / catalogs, the merchant's choice of assets, page webhook
 * subscription, disconnect, the deauthorize and data-deletion callbacks, and
 * a daily token health check that raises the reconnect banner.
 *
 * Environment: META_APP_ID, META_APP_SECRET, META_LOGIN_CONFIG_ID,
 * META_WEBHOOK_VERIFY_TOKEN, META_REDIRECT_URI (optional), META_APP_LIVE=1
 * after App Review, DISABLE_META_JOBS=1 stops the background jobs.
 */

import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '../../core/system-control/cron.decorator';
import { MetaConnection, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { apiMessage, apiText } from '../../common/i18n/api-message';
import { encrypt } from '../../core/lib/crypto';
import { DIALOG_BASE, expiryFrom, parseSignedRequest, signState, tokenHealth, verifyState } from './meta-graph';
import { MetaGraphError, MetaGraphService, metaFail, StoredPage } from './meta-graph.service';
import { metaAccess } from './meta-access';

/** Permissions the Login for Business configuration should ask for. */
export const META_SCOPES = {
  pages: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata', 'pages_messaging', 'pages_read_user_content', 'pages_manage_engagement'],
  instagram: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_messages'],
  business: ['business_management', 'catalog_management'],
  ads: ['ads_management', 'ads_read'],
  whatsapp: ['whatsapp_business_management', 'whatsapp_business_messaging'],
} as const;

/** Fields the page is subscribed to for the inbox. */
export const PAGE_WEBHOOK_FIELDS = ['feed', 'messages', 'message_echoes', 'messaging_postbacks'];

const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

export interface AdAccountRow { id: string; name: string; currency: string | null; status: number | null }
export interface NamedRow { id: string; name: string; businessId?: string | null }

/** Web origin to send the merchant back to (only nafaa.pk, or localhost outside production). */
export function webOrigin(requested?: string | null): string {
  const fallback = (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
  if (!requested) return fallback;
  try {
    const u = new URL(requested);
    const ok = /(^|\.)nafaa\.pk$/.test(u.hostname) || (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(u.hostname));
    return ok ? u.origin : fallback;
  } catch {
    return fallback;
  }
}

export function apiBase(): string {
  const raw = (process.env.INTEGRATIONS_API_URL || process.env.API_URL || 'http://localhost:4000/api').trim().replace(/\/+$/, '');
  return /\/api$/.test(raw) ? raw : `${raw}/api`;
}

@Injectable()
export class MetaService {
  private readonly logger = new Logger('Meta');

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly notifications: NotificationsService,
  ) {}

  redirectUri() {
    return (process.env.META_REDIRECT_URI || `${apiBase()}/integrations/meta/oauth/callback`).trim();
  }

  private stateSecret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-state';
  }

  assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Facebook ka jor sirf malik ya manager badal sakta hai');
  }

  /* ───────────────────────── status ───────────────────────── */

  async status(user: AuthenticatedUser) {
    const [access, conn] = await Promise.all([metaAccess(this.prisma, user.tenantId), this.graph.connection(user.tenantId)]);
    return { access, connection: conn ? this.view(conn) : null };
  }

  /** API shape without tokens. */
  view(c: MetaConnection) {
    const pages = this.graph.pages(c).map((p) => ({ id: p.id, name: p.name, picture: p.picture ?? null, igId: p.igId ?? null, igUsername: p.igUsername ?? null, igPicture: p.igPicture ?? null }));
    const page = pages.find((p) => p.id === c.pageId) ?? null;
    const granted = new Set(c.scopes);
    const missing = [...META_SCOPES.pages, ...META_SCOPES.instagram, ...META_SCOPES.business].filter((s) => !granted.has(s));
    const health = c.status === 'CONNECTED' ? tokenHealth(c.tokenExpiresAt) : 'expired';
    return {
      id: c.id,
      status: c.status,
      health,
      needsReconnect: c.status !== 'CONNECTED' || health === 'expired',
      metaUserName: c.metaUserName,
      tokenExpiresAt: c.tokenExpiresAt?.toISOString() ?? null,
      scopes: c.scopes,
      missingScopes: missing,
      pages,
      adAccounts: (Array.isArray(c.adAccounts) ? c.adAccounts : []) as unknown as AdAccountRow[],
      businesses: (Array.isArray(c.businesses) ? c.businesses : []) as unknown as NamedRow[],
      catalogs: (Array.isArray(c.catalogs) ? c.catalogs : []) as unknown as NamedRow[],
      selected: {
        pageId: c.pageId, pageName: page?.name ?? null, pagePicture: page?.picture ?? null,
        igUserId: c.igUserId, igUsername: page?.igUsername ?? null,
        adAccountId: c.adAccountId, businessId: c.businessId, catalogId: c.catalogId,
        wabaId: c.wabaId, waPhoneNumberId: c.waPhoneNumberId,
      },
      settings: { autoPublish: c.autoPublish, inboxEnabled: c.inboxEnabled, catalogSync: c.catalogSync },
      webhooksAt: c.webhooksAt?.toISOString() ?? null,
      catalogSyncedAt: c.catalogSyncedAt?.toISOString() ?? null,
      lastError: c.lastError,
      lastErrorAt: c.lastErrorAt?.toISOString() ?? null,
      connectedAt: c.connectedAt.toISOString(),
    };
  }

  /* ───────────────────────── OAuth ───────────────────────── */

  async start(user: AuthenticatedUser, body: { returnOrigin?: string }) {
    this.assertManager(user);
    const access = await metaAccess(this.prisma, user.tenantId);
    if (!access.live) {
      throw new ForbiddenException(access.reason === 'paused'
        ? 'Facebook ka kaam Nafaa ne thori der ke liye rok rakha hai'
        : 'Facebook & Instagram ka jor jaldi aa raha hai');
    }
    const { appId, loginConfigId } = this.graph.app();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: this.redirectUri(),
      state: signState({ tenantId: user.tenantId, userId: user.id, origin: webOrigin(body?.returnOrigin) }, this.stateSecret()),
      response_type: 'code',
    });
    if (loginConfigId) {
      params.set('config_id', loginConfigId);
      params.set('override_default_response_type', 'true');
    } else {
      // Without a Login for Business configuration, ask for the scopes directly (works for app roles in development).
      params.set('scope', [...META_SCOPES.pages, ...META_SCOPES.instagram, ...META_SCOPES.business, ...META_SCOPES.ads].join(','));
    }
    return { authUrl: `${DIALOG_BASE}?${params}` };
  }

  /** Meta sends the merchant back here (?code&state). Returns the web URL to redirect to. */
  async callback(query: Record<string, string>): Promise<string> {
    const back = (origin: string, q: Record<string, string>) => `${origin}/settings/facebook?${new URLSearchParams(q)}`;
    const st = verifyState(String(query.state ?? ''), this.stateSecret());
    if (!st) return back(webOrigin(), { error: apiText('Ghalat request — dobara "Facebook se joren" dabayein') });
    if (st === 'expired') return back(webOrigin(), { error: apiText('Link purana ho gaya — dobara "Facebook se joren" dabayein') });
    const origin = webOrigin(st.origin);
    if (!query.code) {
      const denied = query.error === 'access_denied' || query.error_reason === 'user_denied';
      return back(origin, { error: denied ? apiText('Facebook par "Allow" nahi dabaya — dobara koshish karein') : (query.error_description || 'Facebook se jor nahi bana') });
    }
    try {
      const { appId, appSecret } = this.graph.app();
      // 1. code → short-lived user token (app call: no user token yet).
      const short = await this.oauthToken({ client_id: appId, client_secret: appSecret, redirect_uri: this.redirectUri(), code: query.code });
      // 2. short → long-lived (~60 days); a business-integration token may already be long-lived.
      const long = await this.oauthToken({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token })
        .catch(() => short);
      const token = long.access_token;
      const expiresAt = expiryFrom(long.expires_in);
      const assets = await this.listAssets(token);
      const prev = await this.graph.connection(st.tenantId);
      const pageId = prev?.pageId && assets.pages.some((p) => p.id === prev.pageId) ? prev.pageId : assets.pages.length === 1 ? assets.pages[0].id : null;
      const page = assets.pages.find((p) => p.id === pageId);
      const adAccountId = prev?.adAccountId && assets.adAccounts.some((a) => a.id === prev.adAccountId) ? prev.adAccountId : assets.adAccounts.length === 1 ? assets.adAccounts[0].id : null;
      const businessId = prev?.businessId && assets.businesses.some((b) => b.id === prev.businessId) ? prev.businessId : assets.businesses[0]?.id ?? null;
      const data = {
        connectedById: st.userId,
        metaUserId: assets.me.id,
        metaUserName: assets.me.name,
        userToken: encrypt(token),
        tokenExpiresAt: expiresAt,
        scopes: assets.scopes,
        pages: assets.pages as unknown as Prisma.InputJsonValue,
        adAccounts: assets.adAccounts as unknown as Prisma.InputJsonValue,
        businesses: assets.businesses as unknown as Prisma.InputJsonValue,
        catalogs: assets.catalogs as unknown as Prisma.InputJsonValue,
        pageId,
        igUserId: page?.igId ?? null,
        adAccountId,
        businessId,
        catalogId: prev?.catalogId && assets.catalogs.some((c) => c.id === prev.catalogId) ? prev.catalogId : null,
        status: 'CONNECTED',
        lastError: null,
        lastErrorAt: null,
        connectedAt: new Date(),
      };
      await this.prisma.metaConnection.upsert({ where: { tenantId: st.tenantId }, create: { tenantId: st.tenantId, ...data }, update: data });
      if (pageId) await this.subscribePage(st.tenantId, pageId).catch((e) => this.logger.warn(`Page subscribe: ${(e as Error).message}`));
      return back(origin, { connected: '1' });
    } catch (e) {
      this.logger.warn(`Meta callback failed for ${st.tenantId}: ${(e as Error).message}`);
      return back(origin, { error: e instanceof MetaGraphError ? e.friendly : apiText('Facebook se jor nahi bana — dobara koshish karein') });
    }
  }

  private async oauthToken(params: Record<string, string>): Promise<{ access_token: string; expires_in?: number }> {
    const res = await this.graph.bareCall<{ access_token?: string; expires_in?: number }>({ path: 'oauth/access_token', params });
    if (!res?.access_token) throw metaFail('token', apiText('Facebook se ijazat nahi mili — dobara koshish karein'));
    return { access_token: res.access_token, expires_in: res.expires_in };
  }

  /** Everything the person gave access to, read with their token. */
  async listAssets(token: string) {
    const g = <T = any>(path: string, params: Record<string, unknown> = {}) => this.graph.withToken<T>(token, { path, params }).catch((e) => {
      this.logger.warn(`Meta list ${path}: ${(e as Error).message}`);
      return null as T | null;
    });
    const [me, perms, accounts, ads, biz] = await Promise.all([
      this.graph.withToken<{ id: string; name: string }>(token, { path: 'me', params: { fields: 'id,name' } }),
      g<{ data: Array<{ permission: string; status: string }> }>('me/permissions'),
      g<{ data: any[] }>('me/accounts', { fields: 'id,name,access_token,tasks,picture{url},instagram_business_account{id,username,profile_picture_url}', limit: 100 }),
      g<{ data: any[] }>('me/adaccounts', { fields: 'id,name,currency,account_status', limit: 100 }),
      g<{ data: any[] }>('me/businesses', { fields: 'id,name', limit: 50 }),
    ]);
    const pages: StoredPage[] = (accounts?.data ?? []).map((p) => ({
      id: String(p.id), name: String(p.name ?? ''), token: encrypt(p.access_token ?? null), tasks: Array.isArray(p.tasks) ? p.tasks : [],
      picture: p.picture?.data?.url ?? null,
      igId: p.instagram_business_account?.id ?? null, igUsername: p.instagram_business_account?.username ?? null,
      igPicture: p.instagram_business_account?.profile_picture_url ?? null,
    }));
    const adAccounts: AdAccountRow[] = (ads?.data ?? []).map((a) => ({ id: String(a.id), name: String(a.name ?? a.id), currency: a.currency ?? null, status: a.account_status ?? null }));
    const businesses: NamedRow[] = (biz?.data ?? []).map((b) => ({ id: String(b.id), name: String(b.name ?? b.id) }));
    const catalogs: NamedRow[] = [];
    for (const b of businesses.slice(0, 5)) {
      const cats = await g<{ data: any[] }>(`${b.id}/owned_product_catalogs`, { fields: 'id,name', limit: 50 });
      for (const c of cats?.data ?? []) catalogs.push({ id: String(c.id), name: String(c.name ?? c.id), businessId: b.id });
    }
    const scopes = (perms?.data ?? []).filter((p) => p.status === 'granted').map((p) => p.permission);
    return { me: { id: String(me.id), name: String(me.name ?? '') }, scopes, pages, adAccounts, businesses, catalogs };
  }

  /** Reads the assets again with the stored token (after the merchant adds a page in Facebook). */
  async refresh(user: AuthenticatedUser) {
    this.assertManager(user);
    const conn = await this.require(user.tenantId);
    const token = this.graph.tokenFor(conn, 'user');
    let assets;
    try {
      assets = await this.listAssets(token);
    } catch (e) {
      if (e instanceof MetaGraphError && e.kind === 'token') await this.graph.markTokenError(user.tenantId, e.graph);
      throw e;
    }
    const row = await this.prisma.metaConnection.update({
      where: { tenantId: user.tenantId },
      data: {
        scopes: assets.scopes,
        pages: assets.pages as unknown as Prisma.InputJsonValue,
        adAccounts: assets.adAccounts as unknown as Prisma.InputJsonValue,
        businesses: assets.businesses as unknown as Prisma.InputJsonValue,
        catalogs: assets.catalogs as unknown as Prisma.InputJsonValue,
        igUserId: assets.pages.find((p) => p.id === conn.pageId)?.igId ?? null,
      },
    });
    return this.view(row);
  }

  /** The merchant picks the page (its Instagram comes with it), ad account, business and catalog. */
  async selectAssets(user: AuthenticatedUser, body: { pageId?: string | null; adAccountId?: string | null; businessId?: string | null; catalogId?: string | null }) {
    this.assertManager(user);
    const conn = await this.require(user.tenantId);
    const v = this.view(conn);
    const data: Prisma.MetaConnectionUpdateInput = {};
    if (body.pageId !== undefined) {
      const page = v.pages.find((p) => p.id === body.pageId);
      if (body.pageId && !page) throw new NotFoundException('Ye page is jor me nahi');
      data.pageId = page?.id ?? null;
      data.igUserId = page?.igId ?? null;
    }
    if (body.adAccountId !== undefined) {
      if (body.adAccountId && !v.adAccounts.some((a) => a.id === body.adAccountId)) throw new NotFoundException('Ye ad account is jor me nahi');
      data.adAccountId = body.adAccountId || null;
    }
    if (body.businessId !== undefined) {
      if (body.businessId && !v.businesses.some((b) => b.id === body.businessId)) throw new NotFoundException('Ye business is jor me nahi');
      data.businessId = body.businessId || null;
    }
    if (body.catalogId !== undefined) {
      if (body.catalogId && !v.catalogs.some((c) => c.id === body.catalogId)) throw new NotFoundException('Ye catalog is jor me nahi');
      data.catalogId = body.catalogId || null;
    }
    const row = await this.prisma.metaConnection.update({ where: { tenantId: user.tenantId }, data });
    if (data.pageId && data.pageId !== conn.pageId) await this.subscribePage(user.tenantId, String(data.pageId)).catch((e) => this.logger.warn(`Page subscribe: ${(e as Error).message}`));
    return this.view(await this.prisma.metaConnection.findUniqueOrThrow({ where: { id: row.id } }));
  }

  async updateSettings(user: AuthenticatedUser, body: { autoPublish?: boolean; inboxEnabled?: boolean; catalogSync?: boolean }) {
    this.assertManager(user);
    await this.require(user.tenantId);
    const data: Prisma.MetaConnectionUpdateInput = {};
    for (const k of ['autoPublish', 'inboxEnabled', 'catalogSync'] as const) if (typeof body?.[k] === 'boolean') data[k] = body[k];
    const row = await this.prisma.metaConnection.update({ where: { tenantId: user.tenantId }, data });
    return this.view(row);
  }

  /** Subscribes the page to this app's webhooks (comments and messages for the inbox). */
  async subscribePage(tenantId: string, pageId: string) {
    await this.graph.call(tenantId, { method: 'POST', path: `${pageId}/subscribed_apps`, params: { subscribed_fields: PAGE_WEBHOOK_FIELDS.join(',') }, token: `page:${pageId}` });
    await this.prisma.metaConnection.update({ where: { tenantId }, data: { webhooksAt: new Date() } });
  }

  /** Stops webhooks for the page and removes the stored tokens. Inbox history stays. */
  async disconnect(user: AuthenticatedUser) {
    this.assertManager(user);
    const conn = await this.require(user.tenantId);
    if (conn.pageId && conn.status === 'CONNECTED') {
      await this.graph.call(user.tenantId, { method: 'DELETE', path: `${conn.pageId}/subscribed_apps`, token: `page:${conn.pageId}`, attempts: 1 }).catch(() => null);
    }
    await this.prisma.metaConnection.update({ where: { tenantId: user.tenantId }, data: this.wipe('DISCONNECTED') });
    return { ok: true };
  }

  private wipe(status: string): Prisma.MetaConnectionUpdateInput {
    return {
      status, userToken: null, tokenExpiresAt: null, pages: Prisma.DbNull, scopes: [], webhooksAt: null,
      lastError: status === 'REVOKED' ? 'Facebook par Nafaa ki ijazat hata di gayi' : null, lastErrorAt: status === 'REVOKED' ? new Date() : null,
    };
  }

  async require(tenantId: string): Promise<MetaConnection> {
    const conn = await this.graph.connection(tenantId);
    if (!conn) throw new NotFoundException('Facebook abhi jura nahi');
    return conn;
  }

  /* ───────────────────────── Meta callbacks ───────────────────────── */

  /** Deauthorize callback: the person removed the app; tokens are dropped and the shop sees "Dobara joren". */
  async deauthorize(signedRequest: string | undefined) {
    const { appSecret } = this.graph.app();
    const data = parseSignedRequest(signedRequest, appSecret);
    if (!data?.user_id) return { ok: false };
    const rows = await this.prisma.metaConnection.findMany({ where: { metaUserId: String(data.user_id) }, select: { tenantId: true, connectedById: true } });
    for (const r of rows) {
      await this.prisma.metaConnection.update({ where: { tenantId: r.tenantId }, data: this.wipe('REVOKED') });
      await this.notify(r.tenantId, r.connectedById, apiMessage('Facebook ka jor toot gaya'), apiMessage('Facebook par Nafaa ki ijazat hata di gayi. Auto-post aur inbox ruk gaye hain — dobara joren.'));
    }
    return { ok: true, count: rows.length };
  }

  /**
   * Data deletion callback (Meta spec): verify signed_request, delete the
   * person's data (their token, name and id on every connection they made),
   * and return { url, confirmation_code } for the status page.
   */
  async dataDeletion(signedRequest: string | undefined) {
    const { appSecret } = this.graph.app();
    const data = parseSignedRequest(signedRequest, appSecret);
    if (!data?.user_id) return null;
    const metaUserId = String(data.user_id);
    const rows = await this.prisma.metaConnection.findMany({ where: { metaUserId }, select: { tenantId: true } });
    const code = crypto.randomBytes(9).toString('base64url');
    await this.prisma.metaDataDeletion.create({ data: { code, metaUserId, tenantIds: rows.map((r) => r.tenantId) } });
    for (const r of rows) {
      await this.prisma.metaConnection.update({ where: { tenantId: r.tenantId }, data: { ...this.wipe('REVOKED'), metaUserId: null, metaUserName: null, adAccounts: Prisma.DbNull, businesses: Prisma.DbNull, catalogs: Prisma.DbNull } });
    }
    await this.prisma.metaDataDeletion.update({ where: { code }, data: { status: 'DONE', completedAt: new Date() } });
    return { url: `${apiBase()}/integrations/meta/data-deletion/status?code=${encodeURIComponent(code)}`, confirmation_code: code };
  }

  async deletionStatus(code: string) {
    const row = await this.prisma.metaDataDeletion.findUnique({ where: { code: String(code ?? '') } });
    if (!row) return null;
    return { code: row.code, status: row.status, requestedAt: row.createdAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null };
  }

  /* ───────────────────────── health ───────────────────────── */

  /**
   * Daily: checks each connection with a light call (a revoked or expired
   * token marks it), warns 7 days before a token expires, and tells the
   * merchant once when the connection breaks.
   */
  @Cron('0 40 4 * * *')
  async healthCheck() {
    if (process.env.DISABLE_META_JOBS === '1') return;
    const rows = await this.prisma.metaConnection.findMany({ where: { status: 'CONNECTED' }, select: { tenantId: true, tokenExpiresAt: true, connectedById: true } }).catch(() => []);
    for (const r of rows) {
      const health = tokenHealth(r.tokenExpiresAt);
      if (health === 'expired') {
        await this.graph.markTokenError(r.tenantId, { code: 190, error_subcode: 463 });
      } else {
        await this.graph.call(r.tenantId, { path: 'me', params: { fields: 'id' }, attempts: 2 }).catch(() => null);
      }
      const after = await this.graph.connection(r.tenantId);
      if (after && after.status !== 'CONNECTED') {
        await this.notify(r.tenantId, r.connectedById, apiMessage('Facebook ka jor toot gaya'), apiMessage('Auto-post, inbox aur catalog ruk gaye hain. Settings → Facebook & Instagram me "Dobara joren" dabayein.'));
      } else if (health === 'expiring') {
        await this.notify(r.tenantId, r.connectedById, apiMessage('Facebook ka jor jaldi khatam hoga'), apiMessage('Kuch din me Facebook ka jor khatam ho jayega. Settings → Facebook & Instagram me "Dobara joren" dabayein.'));
      }
    }
  }

  async notify(tenantId: string, userId: string | null, title: ReturnType<typeof apiMessage>, message: ReturnType<typeof apiMessage>, link = '/settings/facebook') {
    await this.notifications.create({ tenantId, userId: userId ?? undefined, type: 'WARNING', title, message, link, metadata: { kind: 'META' } })
      .catch((e) => this.logger.warn(`Meta notify: ${(e as Error).message}`));
  }
}
