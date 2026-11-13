/**
 * Nafaa Social accounts: manual accounts for platforms without an API, and
 * the Facebook Page + Instagram account connected through Meta OAuth.
 *
 * OAuth: the admin app opens GET accounts/meta/connect-url, Meta sends the
 * browser to the admin page /social/accounts/callback?code&state, and that
 * page posts { code, state } to accounts/meta/callback. The long-lived user
 * token and the page list are kept (encrypted) in a SystemSetting until the
 * owner picks the Page (accounts/meta/select). Page tokens made from a
 * long-lived user token do not expire. Auto-publish starts OFF.
 *
 * Threads, YouTube, TikTok, X and Pinterest connect through their own OAuth
 * apps; that flow is in brand-social-platforms.service.ts and is exposed here
 * as accounts/<platform>/connect-url and accounts/<platform>/callback.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrandSocialAccount, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { DIALOG_BASE, expiryFrom, signState, tokenHealth, verifyState } from '../../integrations/meta/meta-graph';
import { BrandSocialGraphService, SocialGraphError, toSocialError } from './brand-social-graph.service';
import { BrandSocialSettingsService, StoredMetaUser } from './brand-social-settings.service';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';
import { isOAuthPlatform, platformFromSlug } from './brand-social-oauth.logic';
import { isApiPlatform, isPlatform, PLATFORM_LABEL } from './brand-social.logic';
import type {
  AccountOptionsResponse, AccountPatchInput, AccountPlatformSettings, AccountsResponse, BrandAccountStatus, BrandAccountView, BrandPlatform, MetaCallbackResponse,
  MetaConnectUrlResponse, MetaPageChoice, OAuthPlatform, PlatformCallbackResponse, PlatformConnectUrlResponse, TokenHealthView,
} from './brand-social.types';

/** Permissions asked for in the Meta dialog. */
export const BRAND_META_SCOPES = [
  'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_engagement', 'read_insights',
  'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'instagram_manage_comments',
  'business_management', 'ads_read',
];

const STATE_TENANT = 'brand-social';

/** The admin app origin (ADMIN_APP_URL, else ADMIN_URL, else admin.nafaa.pk). */
export function adminOrigin(): string {
  const raw = (process.env.ADMIN_APP_URL || process.env.ADMIN_URL || 'https://admin.nafaa.pk').trim();
  try { return new URL(raw).origin; } catch { return 'https://admin.nafaa.pk'; }
}

export function brandRedirectUri(): string {
  return (process.env.BRAND_SOCIAL_META_REDIRECT_URI || `${adminOrigin()}/social/accounts/callback`).trim();
}

const stateSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-state';

const MANUAL_URL: Partial<Record<BrandPlatform, (h: string) => string>> = {
  TIKTOK: (h) => `https://www.tiktok.com/@${h}`,
  YOUTUBE: (h) => `https://www.youtube.com/@${h}`,
  X: (h) => `https://x.com/${h}`,
  THREADS: (h) => `https://www.threads.net/@${h}`,
  PINTEREST: (h) => `https://www.pinterest.com/${h}`,
  LINKEDIN: (h) => `https://www.linkedin.com/company/${h}`,
  INSTAGRAM: (h) => `https://www.instagram.com/${h}`,
  FACEBOOK: (h) => `https://www.facebook.com/${h}`,
};

@Injectable()
export class BrandSocialAccountsService {
  private readonly logger = new Logger('BrandSocialAccounts');

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: BrandSocialGraphService,
    private readonly settings: BrandSocialSettingsService,
    private readonly platforms: BrandSocialPlatformsService,
  ) {}

  /* ───────────────────────── views ───────────────────────── */

  health(a: Pick<BrandSocialAccount, 'accessTokenEnc' | 'tokenExpiresAt' | 'status' | 'meta'>): TokenHealthView {
    if (!a.accessTokenEnc) return 'none';
    if (a.status === 'NEEDS_RECONNECT') return 'expired';
    // Short-lived access tokens (YouTube, X, TikTok, Pinterest) are renewed
    // from the stored refresh token before use, so they are healthy.
    const meta = a.meta && typeof a.meta === 'object' && !Array.isArray(a.meta) ? (a.meta as Record<string, unknown>) : null;
    if (meta?.refreshTokenEnc) return 'ok';
    return tokenHealth(a.tokenExpiresAt);
  }

  view(a: BrandSocialAccount, followers: number | null = null): BrandAccountView {
    const meta = (a.meta && typeof a.meta === 'object' ? a.meta : {}) as Record<string, unknown>;
    return {
      id: a.id,
      platform: a.platform as BrandPlatform,
      name: a.name,
      handle: a.handle,
      profileUrl: a.profileUrl,
      avatarUrl: a.avatarUrl,
      externalId: a.externalId,
      status: a.status as BrandAccountStatus,
      api: isPlatform(a.platform) && isApiPlatform(a.platform) && !!a.accessTokenEnc,
      oauth: isOAuthPlatform(a.platform) && !!a.accessTokenEnc,
      settings: isOAuthPlatform(a.platform) ? ((meta.settings && typeof meta.settings === 'object' ? meta.settings : {}) as AccountPlatformSettings) : null,
      autoPublish: a.autoPublish,
      tokenHealth: this.health(a),
      tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
      scopes: a.scopes,
      followers: followers ?? (typeof meta.followers === 'number' ? meta.followers : null),
      lastError: a.lastError,
      lastCheckedAt: a.lastCheckedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  /** Accounts that are not disconnected (the publisher and composer use these). */
  active() {
    return this.prisma.brandSocialAccount.findMany({ where: { status: { not: 'DISCONNECTED' } }, orderBy: [{ platform: 'asc' }, { createdAt: 'asc' }] });
  }

  async list(): Promise<AccountsResponse> {
    const rows = await this.prisma.brandSocialAccount.findMany({ orderBy: [{ status: 'asc' }, { platform: 'asc' }, { createdAt: 'asc' }] });
    const days = rows.length
      ? await this.prisma.brandSocialAccountDay.findMany({
          where: { accountId: { in: rows.map((r) => r.id) }, followers: { not: null } },
          orderBy: { day: 'desc' }, distinct: ['accountId'], select: { accountId: true, followers: true },
        })
      : [];
    const followers = new Map(days.map((d) => [d.accountId, d.followers]));
    const user = await this.settings.metaUser();
    const expiresAt = user?.expiresAt ? new Date(user.expiresAt) : null;
    return {
      accounts: rows.map((r) => this.view(r, followers.get(r.id) ?? null)),
      meta: {
        configured: this.graph.configured(),
        connected: !!user?.tokenEnc,
        userName: user?.metaUserName ?? null,
        tokenHealth: user?.tokenEnc ? tokenHealth(expiresAt) : 'none',
        tokenExpiresAt: user?.expiresAt ?? null,
        scopes: user?.scopes ?? [],
        adsRead: !!user?.scopes?.some((s) => s === 'ads_read' || s === 'ads_management'),
        redirectUri: brandRedirectUri(),
      },
      apps: await this.platforms.appsSummary(),
    };
  }

  async get(id: string) {
    const a = await this.prisma.brandSocialAccount.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Account not found.');
    return a;
  }

  /* ───────────────────────── manual accounts ───────────────────────── */

  async upsertManual(body: { platform?: string; handle?: string; url?: string | null; name?: string | null; avatarUrl?: string | null }, userId: string) {
    if (!isPlatform(body?.platform)) throw new BadRequestException('Choose a platform.');
    const platform = body.platform;
    const handle = String(body.handle ?? '').trim().replace(/^@+/, '').slice(0, 100);
    if (!handle) throw new BadRequestException('Enter the handle.');
    let url = typeof body.url === 'string' && body.url.trim() ? body.url.trim() : MANUAL_URL[platform]?.(handle) ?? null;
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    const existing = await this.prisma.brandSocialAccount.findUnique({ where: { platform_externalId: { platform, externalId: handle.toLowerCase() } } });
    if (existing?.accessTokenEnc && existing.status !== 'DISCONNECTED') throw new BadRequestException('This account is connected through the API already.');
    const data = {
      name: (body.name ?? '').trim().slice(0, 120) || `${PLATFORM_LABEL[platform]} @${handle}`,
      handle: `@${handle}`,
      profileUrl: url,
      avatarUrl: typeof body.avatarUrl === 'string' && /^https?:\/\//.test(body.avatarUrl) ? body.avatarUrl : existing?.avatarUrl ?? null,
      status: 'MANUAL',
      autoPublish: false,
      accessTokenEnc: null,
      tokenExpiresAt: null,
      lastError: null,
    };
    const row = await this.prisma.brandSocialAccount.upsert({
      where: { platform_externalId: { platform, externalId: handle.toLowerCase() } },
      create: { platform, externalId: handle.toLowerCase(), connectedById: userId, ...data },
      update: data,
    });
    return this.view(row);
  }

  async patch(id: string, body: AccountPatchInput) {
    let a = await this.get(id);
    if (body?.settings && typeof body.settings === 'object') a = await this.platforms.saveSettings(a, body.settings);
    const data: Prisma.BrandSocialAccountUpdateInput = {};
    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 120);
    if (typeof body?.autoPublish === 'boolean') {
      if (body.autoPublish && !(isPlatform(a.platform) && isApiPlatform(a.platform))) throw new BadRequestException(`${PLATFORM_LABEL[a.platform as BrandPlatform] ?? a.platform} has no publishing API; its posts are always handed to a person.`);
      if (body.autoPublish && (a.status !== 'CONNECTED' || !a.accessTokenEnc)) throw new BadRequestException(a.status === 'MANUAL' ? 'Connect this account first, then turn on auto-publish.' : 'Reconnect this account before turning on auto-publish.');
      data.autoPublish = body.autoPublish;
    }
    return this.view(await this.prisma.brandSocialAccount.update({ where: { id }, data }));
  }

  /** Soft disconnect: keeps the row and every post; drops the token and turns publishing off. */
  async disconnect(id: string) {
    const a = await this.get(id);
    if (isOAuthPlatform(a.platform)) await this.platforms.dropTokens(a);
    const row = await this.prisma.brandSocialAccount.update({
      where: { id }, data: { status: 'DISCONNECTED', autoPublish: false, accessTokenEnc: null, tokenExpiresAt: null },
    });
    return this.view(row);
  }

  /* ───────────────────────── platform OAuth ───────────────────────── */

  private oauthPlatform(slug: string): OAuthPlatform {
    const p = platformFromSlug(slug);
    if (!p) throw new NotFoundException('This platform does not connect through its own app.');
    return p;
  }

  platformConnectUrl(slug: string, userId: string): Promise<PlatformConnectUrlResponse> {
    return this.platforms.connectUrl(this.oauthPlatform(slug), userId);
  }

  async platformCallback(slug: string, userId: string, q: { code?: string; state?: string; error?: string; error_description?: string }): Promise<PlatformCallbackResponse> {
    const { row, upgraded } = await this.platforms.callback(this.oauthPlatform(slug), userId, q ?? {});
    return { account: this.view(row), upgraded };
  }

  async options(id: string): Promise<AccountOptionsResponse> {
    return this.platforms.options(await this.get(id));
  }

  /* ───────────────────────── Meta OAuth ───────────────────────── */

  connectUrl(userId: string): MetaConnectUrlResponse {
    const { appId } = this.graph.meta.app();
    const redirectUri = brandRedirectUri();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: signState({ tenantId: STATE_TENANT, userId, origin: adminOrigin() }, stateSecret()),
      response_type: 'code',
    });
    const configId = (process.env.BRAND_SOCIAL_META_CONFIG_ID ?? '').trim();
    if (configId) {
      params.set('config_id', configId);
      params.set('override_default_response_type', 'true');
    } else {
      params.set('scope', BRAND_META_SCOPES.join(','));
    }
    return { url: `${DIALOG_BASE}?${params}`, redirectUri };
  }

  async callback(userId: string, q: { code?: string; state?: string; error?: string; error_description?: string }): Promise<MetaCallbackResponse> {
    const st = verifyState(String(q?.state ?? ''), stateSecret());
    if (!st || st === 'expired' || st.tenantId !== STATE_TENANT) throw new BadRequestException(st === 'expired' ? 'The connect link expired. Click "Connect Facebook & Instagram" again.' : 'This sign-in did not start here. Click "Connect Facebook & Instagram" again.');
    if (st.userId !== userId) throw new BadRequestException('Finish the connection with the same admin user who started it.');
    if (!q.code) throw new BadRequestException(q.error_description || (q.error === 'access_denied' ? 'Facebook access was not allowed.' : 'Facebook did not return a code.'));

    const { appId, appSecret } = this.graph.meta.app();
    const short = await this.oauthToken({ client_id: appId, client_secret: appSecret, redirect_uri: brandRedirectUri(), code: q.code });
    const long = await this.oauthToken({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token }).catch(() => short);
    const token = long.access_token;

    const [me, perms, accounts] = await Promise.all([
      this.graph.withToken<{ id: string; name: string }>(token, { path: 'me', params: { fields: 'id,name' } }),
      this.graph.withToken<{ data: Array<{ permission: string; status: string }> }>(token, { path: 'me/permissions' }).catch(() => ({ data: [] })),
      this.graph.withToken<{ data: any[] }>(token, {
        path: 'me/accounts',
        params: { fields: 'id,name,link,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}', limit: 100 },
      }),
    ]);
    const stored: StoredMetaUser = {
      metaUserId: String(me.id),
      metaUserName: String(me.name ?? ''),
      tokenEnc: encrypt(token),
      expiresAt: expiryFrom(long.expires_in)?.toISOString() ?? null,
      scopes: (perms?.data ?? []).filter((p) => p.status === 'granted').map((p) => p.permission),
      connectedById: userId,
      connectedAt: new Date().toISOString(),
      pages: (accounts?.data ?? []).map((p) => ({
        id: String(p.id), name: String(p.name ?? ''), picture: p.picture?.data?.url ?? null, link: p.link ?? null,
        tokenEnc: encrypt(p.access_token ?? null),
        igId: p.instagram_business_account?.id ? String(p.instagram_business_account.id) : null,
        igUsername: p.instagram_business_account?.username ?? null,
        igPicture: p.instagram_business_account?.profile_picture_url ?? null,
        igName: p.instagram_business_account?.name ?? null,
      })),
    };
    await this.settings.saveMetaUser(stored, userId);
    return { userName: stored.metaUserName, scopes: stored.scopes, pages: await this.choices(stored) };
  }

  private async choices(u: StoredMetaUser): Promise<MetaPageChoice[]> {
    const connected = await this.prisma.brandSocialAccount.findMany({ where: { platform: 'FACEBOOK', status: { in: ['CONNECTED', 'NEEDS_RECONNECT'] } }, select: { externalId: true } });
    const ids = new Set(connected.map((c) => c.externalId));
    return u.pages.map((p) => ({ pageId: p.id, name: p.name, picture: p.picture, igUserId: p.igId, igUsername: p.igUsername, igPicture: p.igPicture, connected: ids.has(p.id) }));
  }

  private async oauthToken(params: Record<string, string>): Promise<{ access_token: string; expires_in?: number }> {
    const res = await this.graph.bareCall<{ access_token?: string; expires_in?: number }>({ path: 'oauth/access_token', params });
    if (!res?.access_token) throw new BadRequestException('Facebook did not give access. Try connecting again.');
    return { access_token: res.access_token, expires_in: res.expires_in };
  }

  /** Saves the chosen Page and its Instagram account as two connected accounts. */
  async select(userId: string, body: { pageId?: string }) {
    const u = await this.settings.metaUser();
    if (!u?.tokenEnc) throw new BadRequestException('Connect Facebook first.');
    const page = u.pages.find((p) => p.id === String(body?.pageId ?? ''));
    if (!page) throw new BadRequestException('This Page was not in the list Facebook returned. Connect again and tick the Page.');
    if (!decrypt(page.tokenEnc)) throw new BadRequestException('Facebook gave no access to this Page. Connect again and allow every permission.');

    const out: BrandSocialAccount[] = [];
    const base = { accessTokenEnc: page.tokenEnc, tokenExpiresAt: null, scopes: u.scopes, status: 'CONNECTED', lastError: null, lastCheckedAt: new Date(), connectedById: userId };
    const fb = await this.prisma.brandSocialAccount.upsert({
      where: { platform_externalId: { platform: 'FACEBOOK', externalId: page.id } },
      create: {
        platform: 'FACEBOOK', externalId: page.id, name: page.name, handle: null, profileUrl: page.link ?? `https://www.facebook.com/${page.id}`,
        avatarUrl: page.picture, autoPublish: false, meta: { pageId: page.id, igUserId: page.igId } as Prisma.InputJsonValue, ...base,
      },
      update: { name: page.name, avatarUrl: page.picture, profileUrl: page.link ?? undefined, meta: { pageId: page.id, igUserId: page.igId } as Prisma.InputJsonValue, ...base },
    });
    out.push(fb);
    if (page.igId) {
      const ig = await this.prisma.brandSocialAccount.upsert({
        where: { platform_externalId: { platform: 'INSTAGRAM', externalId: page.igId } },
        create: {
          platform: 'INSTAGRAM', externalId: page.igId, name: page.igName || (page.igUsername ? `@${page.igUsername}` : 'Instagram'),
          handle: page.igUsername ? `@${page.igUsername}` : null, profileUrl: page.igUsername ? `https://www.instagram.com/${page.igUsername}` : null,
          avatarUrl: page.igPicture, autoPublish: false, meta: { pageId: page.id, username: page.igUsername } as Prisma.InputJsonValue, ...base,
        },
        update: {
          name: page.igName || (page.igUsername ? `@${page.igUsername}` : undefined), handle: page.igUsername ? `@${page.igUsername}` : undefined,
          avatarUrl: page.igPicture, meta: { pageId: page.id, username: page.igUsername } as Prisma.InputJsonValue, ...base,
        },
      });
      out.push(ig);
      // A manual Instagram row for the same handle is replaced by the connected one.
      if (page.igUsername) {
        await this.prisma.brandSocialAccount.updateMany({
          where: { platform: 'INSTAGRAM', status: 'MANUAL', externalId: page.igUsername.toLowerCase() },
          data: { status: 'DISCONNECTED' },
        });
      }
    }
    for (const a of out) await this.refresh(a.id).catch((e) => this.logger.warn(`Refresh after connect: ${(e as Error).message}`));
    const fresh = await this.prisma.brandSocialAccount.findMany({ where: { id: { in: out.map((a) => a.id) } } });
    return { accounts: fresh.map((a) => this.view(a)) };
  }

  /* ───────────────────────── refresh ───────────────────────── */

  /** Checks the token and reads the profile again (name, picture, followers). */
  async refresh(id: string) {
    const a = await this.get(id);
    if (isOAuthPlatform(a.platform) && a.accessTokenEnc) return this.view(await this.platforms.check(a));
    if (!a.accessTokenEnc || !isPlatform(a.platform) || !isApiPlatform(a.platform)) {
      return this.view(await this.prisma.brandSocialAccount.update({ where: { id }, data: { lastCheckedAt: new Date() } }));
    }
    try {
      const token = this.graph.tokenOf(a);
      const dbg = await this.graph.appCall<{ data?: { is_valid?: boolean; expires_at?: number; scopes?: string[] } }>({ path: 'debug_token', params: { input_token: token } }).catch(() => null);
      if (dbg?.data && dbg.data.is_valid === false) throw new SocialGraphError('token', 'Facebook says this token is no longer valid. Reconnect the account.');
      let data: Prisma.BrandSocialAccountUpdateInput;
      const meta = (a.meta && typeof a.meta === 'object' ? a.meta : {}) as Record<string, unknown>;
      if (a.platform === 'FACEBOOK') {
        const p = await this.graph.call<{ name?: string; link?: string; followers_count?: number; fan_count?: number; picture?: { data?: { url?: string } } }>(a, {
          path: a.externalId, params: { fields: 'name,link,followers_count,fan_count,picture{url}' },
        });
        data = { name: p.name ?? a.name, profileUrl: p.link ?? a.profileUrl, avatarUrl: p.picture?.data?.url ?? a.avatarUrl, meta: { ...meta, followers: p.followers_count ?? p.fan_count ?? null } as Prisma.InputJsonValue };
      } else {
        const p = await this.graph.call<{ username?: string; name?: string; followers_count?: number; profile_picture_url?: string }>(a, {
          path: a.externalId, params: { fields: 'username,name,followers_count,profile_picture_url' },
        });
        data = {
          name: p.name || (p.username ? `@${p.username}` : a.name), handle: p.username ? `@${p.username}` : a.handle,
          profileUrl: p.username ? `https://www.instagram.com/${p.username}` : a.profileUrl, avatarUrl: p.profile_picture_url ?? a.avatarUrl,
          meta: { ...meta, username: p.username ?? meta.username ?? null, followers: p.followers_count ?? null } as Prisma.InputJsonValue,
        };
      }
      const expires = dbg?.data?.expires_at ? new Date(dbg.data.expires_at * 1000) : null;
      const row = await this.prisma.brandSocialAccount.update({
        where: { id },
        data: {
          ...data, status: 'CONNECTED', lastError: null, lastCheckedAt: new Date(), tokenExpiresAt: expires,
          ...(dbg?.data?.scopes?.length ? { scopes: dbg.data.scopes } : {}),
        },
      });
      return this.view(row);
    } catch (e) {
      const err = toSocialError(e);
      const reconnect = err.kind === 'token' || err.kind === 'permission';
      const row = await this.prisma.brandSocialAccount.update({
        where: { id }, data: { lastError: err.text, lastCheckedAt: new Date(), ...(reconnect ? { status: 'NEEDS_RECONNECT' } : {}) },
      });
      return this.view(row);
    }
  }
}
