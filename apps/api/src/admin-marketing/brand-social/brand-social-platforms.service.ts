/**
 * Nafaa Social: the platforms with their own OAuth app (Threads, YouTube,
 * TikTok, X, Pinterest).
 *
 * - App credentials live in SystemSetting "brand_social_apps", secrets
 *   encrypted; they are entered on the Settings page, never in env.
 * - Connect: GET accounts/<platform>/connect-url gives the platform's sign-in
 *   URL with a signed state; the platform sends the browser to the admin page
 *   /social/accounts/callback/<platform>, which posts { code, state } to
 *   accounts/<platform>/callback. The account is saved CONNECTED with
 *   auto-publish off. A MANUAL account for the same platform is upgraded in
 *   place (same row id).
 * - Tokens: the access token is on the row (accessTokenEnc, tokenExpiresAt);
 *   the refresh token, its expiry and the account settings are in
 *   brand_social_accounts.meta. Short tokens are refreshed before use; an
 *   hourly job refreshes the long ones before they end.
 * - Publishing, first comments and post numbers go through the adapter of
 *   each platform (brand-social-<platform>.service.ts).
 * - Threads uninstall / data deletion callbacks (public routes in
 *   brand-social-webhooks.controller.ts).
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrandSocialAccount, BrandSocialPost, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { Cron } from '../../core/system-control/cron.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { dateKeyTz, hourInTz } from '../../common/helpers/business-time.helper';
import { expiryFrom, parseSignedRequest } from '../../integrations/meta/meta-graph';
import { BrandSocialGraphService, SocialGraphError, toSocialError } from './brand-social-graph.service';
import { BrandSocialThreadsService } from './brand-social-threads.service';
import { BrandSocialYoutubeService } from './brand-social-youtube.service';
import { BrandSocialTiktokService, creatorLimits } from './brand-social-tiktok.service';
import { normalizePostOptions } from './brand-social-tiktok.logic';
import { BrandSocialXService } from './brand-social-x.service';
import { BrandSocialPinterestService } from './brand-social-pinterest.service';
import { AdapterResult, PlatformApp, PublishContext, SocialAdapter } from './brand-social-adapter';
import {
  buildAuthorizeUrl, isOAuthPlatform, needsRefresh, OAUTH, pkceChallenge, pkceVerifier, platformRedirectUri, signOAuthState, USE_REFRESH_MS, verifyOAuthState,
} from './brand-social-oauth.logic';
import { engagementOf, isKind, linkFor, PLATFORM_LABEL, textFor } from './brand-social.logic';
import {
  OAUTH_PLATFORMS, type AccountOptionsResponse, type AccountPlatformSettings, type BrandPlatform, type OAuthPlatform, type PlatformAppInput,
  type PlatformAppView, type PlatformConnectUrlResponse, type PlatformPublishState, type PostMediaItem, type PublishStateMap, type TikTokCreatorInfoResponse,
} from './brand-social.types';

export const APPS_KEY = 'brand_social_apps';
export const THREADS_DELETIONS_KEY = 'brand_social_threads_deletions';

interface StoredApp { clientId: string; clientSecretEnc: string | null; updatedAt: string; updatedById: string | null }
type StoredApps = Partial<Record<OAuthPlatform, StoredApp>>;

/** Fields kept in brand_social_accounts.meta for OAuth accounts. */
interface OAuthMeta {
  refreshTokenEnc?: string | null;
  refreshExpiresAt?: string | null;
  refreshedAt?: string | null;
  followers?: number | null;
  settings?: AccountPlatformSettings;
  [k: string]: unknown;
}

interface ThreadsDeletion { code: string; threadsUserId: string; accounts: number; status: 'DONE'; requestedAt: string; completedAt: string }

/** The admin app origin (ADMIN_APP_URL, else ADMIN_URL, else admin.nafaa.pk). */
const adminOrigin = (): string => {
  const raw = (process.env.ADMIN_APP_URL || process.env.ADMIN_URL || 'https://admin.nafaa.pk').trim();
  try { return new URL(raw).origin; } catch { return 'https://admin.nafaa.pk'; }
};

/** The public API base, ending in /api. */
export const apiBase = (): string => {
  const raw = (process.env.PUBLIC_API_URL || process.env.API_URL || process.env.INTEGRATIONS_API_URL || 'https://api.nafaa.pk/api').trim().replace(/\/+$/, '');
  return /\/api$/.test(raw) ? raw : `${raw}/api`;
};

export const threadsWebhookUrls = () => ({
  uninstall: `${apiBase()}/brand-social/webhooks/threads/uninstall`,
  delete: `${apiBase()}/brand-social/webhooks/threads/delete`,
});

const stateSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-state';
const jobsOff = () => process.env.DISABLE_BRAND_SOCIAL_JOBS === '1' || process.env.DISABLE_META_JOBS === '1';
/** OAuth meta as a Prisma JSON value. */
const asJson = (v: OAuthMeta) => v as unknown as Prisma.InputJsonValue;
const metaOf = (a: Pick<BrandSocialAccount, 'meta'>): OAuthMeta => (a.meta && typeof a.meta === 'object' && !Array.isArray(a.meta) ? { ...(a.meta as OAuthMeta) } : {});
const DEFAULT_SETTINGS: Partial<Record<OAuthPlatform, AccountPlatformSettings>> = {
  YOUTUBE: { youtubePrivacy: 'private' },
  TIKTOK: { tiktokMode: 'INBOX' },
  PINTEREST: { pinterestBoardId: null, pinterestBoardName: null },
};

/** How long a TikTok creator_info answer is reused by the composer. */
const CREATOR_INFO_TTL_MS = 3 * 60_000;

export type PublishOutcome = { result: AdapterResult; commentId?: string | null; commentError?: string | null };

@Injectable()
export class BrandSocialPlatformsService {
  private readonly logger = new Logger('BrandSocialPlatforms');
  private readonly adapters: Record<OAuthPlatform, SocialAdapter>;
  private refreshing = false;
  private readonly creatorCache = new Map<string, { at: number; value: TikTokCreatorInfoResponse }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: BrandSocialGraphService,
    threads: BrandSocialThreadsService,
    youtube: BrandSocialYoutubeService,
    tiktok: BrandSocialTiktokService,
    x: BrandSocialXService,
    private readonly pinterest: BrandSocialPinterestService,
  ) {
    this.adapters = { THREADS: threads, YOUTUBE: youtube, TIKTOK: tiktok, X: x, PINTEREST: pinterest };
  }

  adapter(p: OAuthPlatform): SocialAdapter { return this.adapters[p]; }

  /* ───────────────────────── app credentials ───────────────────────── */

  private async readApps(): Promise<StoredApps> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: APPS_KEY } });
    if (!row?.value) return {};
    try { const v = JSON.parse(row.value); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
  }

  private async writeApps(apps: StoredApps, userId: string | null) {
    const value = JSON.stringify(apps);
    await this.prisma.systemSetting.upsert({
      where: { key: APPS_KEY },
      create: { key: APPS_KEY, value, category: 'brand_social', description: 'Nafaa Social: platform OAuth apps (secrets encrypted)', isPublic: false, updatedById: userId ?? undefined },
      update: { value, ...(userId ? { updatedById: userId } : {}) },
    });
  }

  /** The app for a platform, or null when its id or secret is missing. */
  async app(p: OAuthPlatform): Promise<PlatformApp | null> {
    const a = (await this.readApps())[p];
    const secret = decrypt(a?.clientSecretEnc ?? null);
    return a?.clientId && secret ? { clientId: a.clientId, clientSecret: secret } : null;
  }

  redirectUri(p: OAuthPlatform) { return platformRedirectUri(p, adminOrigin()); }

  async listApps(): Promise<PlatformAppView[]> {
    const apps = await this.readApps();
    const hooks = threadsWebhookUrls();
    return OAUTH_PLATFORMS.map((p) => ({
      platform: p,
      idLabel: OAUTH[p].idLabel,
      clientId: apps[p]?.clientId ?? null,
      secretSet: !!apps[p]?.clientSecretEnc,
      redirectUri: this.redirectUri(p),
      consoleUrl: OAUTH[p].consoleUrl,
      howTo: OAUTH[p].howTo,
      extraUrls: p === 'THREADS' ? [{ label: 'Uninstall callback URL', url: hooks.uninstall }, { label: 'Delete callback URL', url: hooks.delete }] : [],
      updatedAt: apps[p]?.updatedAt ?? null,
    }));
  }

  async appsSummary() {
    const apps = await this.readApps();
    return OAUTH_PLATFORMS.map((p) => ({ platform: p, configured: !!apps[p]?.clientId && !!apps[p]?.clientSecretEnc, redirectUri: this.redirectUri(p) }));
  }

  async saveApp(p: OAuthPlatform, body: PlatformAppInput, userId: string | null): Promise<PlatformAppView> {
    const clientId = String(body?.clientId ?? '').trim();
    const secret = String(body?.clientSecret ?? '').trim();
    if (!clientId || clientId.length > 300 || /\s/.test(clientId)) throw new BadRequestException(`Enter the ${OAUTH[p].idLabel}.`);
    if (secret && (secret.length > 500 || /\s/.test(secret))) throw new BadRequestException('The secret has spaces in it. Copy it again.');
    const apps = await this.readApps();
    const cur = apps[p];
    if (!secret && !cur?.clientSecretEnc) throw new BadRequestException('Enter the secret.');
    apps[p] = { clientId, clientSecretEnc: secret ? encrypt(secret) : cur!.clientSecretEnc, updatedAt: new Date().toISOString(), updatedById: userId };
    await this.writeApps(apps, userId);
    return (await this.listApps()).find((a) => a.platform === p)!;
  }

  async removeApp(p: OAuthPlatform, userId: string | null): Promise<PlatformAppView> {
    const apps = await this.readApps();
    delete apps[p];
    await this.writeApps(apps, userId);
    return (await this.listApps()).find((a) => a.platform === p)!;
  }

  /* ───────────────────────── connect ───────────────────────── */

  async connectUrl(p: OAuthPlatform, userId: string): Promise<PlatformConnectUrlResponse> {
    const app = await this.app(p);
    if (!app) throw new BadRequestException(`Save the ${PLATFORM_LABEL[p]} app on the Settings page first.`);
    const nonce = crypto.randomBytes(12).toString('base64url');
    const state = signOAuthState({ platform: p, userId, nonce }, stateSecret());
    const redirectUri = this.redirectUri(p);
    const codeChallenge = OAUTH[p].pkce ? pkceChallenge(pkceVerifier(nonce, stateSecret())) : null;
    return { url: buildAuthorizeUrl(p, { clientId: app.clientId, redirectUri, state, codeChallenge }), redirectUri };
  }

  /** Finishes the sign-in and saves the account. Returns the row and whether a manual row was upgraded. */
  async callback(p: OAuthPlatform, userId: string, q: { code?: string; state?: string; error?: string; error_description?: string }): Promise<{ row: BrandSocialAccount; upgraded: boolean }> {
    const name = PLATFORM_LABEL[p];
    const st = verifyOAuthState(String(q?.state ?? ''), stateSecret());
    if (!st) throw new BadRequestException(`This sign-in did not start here. Click "Connect ${name}" again.`);
    if (st === 'expired') throw new BadRequestException(`The connect link expired. Click "Connect ${name}" again.`);
    if (st.platform !== p) throw new BadRequestException(`This sign-in was for ${PLATFORM_LABEL[st.platform]}, not ${name}. Start again.`);
    if (st.userId !== userId) throw new BadRequestException('Finish the connection with the same admin user who started it.');
    if (!q.code) throw new BadRequestException(q.error_description || (q.error === 'access_denied' ? `${name} access was not allowed.` : `${name} did not return a code.`));
    const app = await this.app(p);
    if (!app) throw new BadRequestException(`Save the ${name} app on the Settings page first.`);
    const adapter = this.adapter(p);
    const redirectUri = this.redirectUri(p);

    let tokens;
    let profile;
    try {
      tokens = await adapter.exchangeCode(app, String(q.code), redirectUri, OAUTH[p].pkce ? pkceVerifier(st.nonce, stateSecret()) : null);
      profile = await adapter.profile(tokens.accessToken, { userId: tokens.userId });
    } catch (e) {
      throw new BadRequestException(toSocialError(e).text);
    }
    if (!profile.externalId) throw new BadRequestException(`${name} did not return the account id. Try again.`);

    const byExternal = await this.prisma.brandSocialAccount.findUnique({ where: { platform_externalId: { platform: p, externalId: profile.externalId } } });
    const manual = await this.prisma.brandSocialAccount.findFirst({ where: { platform: p, status: 'MANUAL' }, orderBy: { createdAt: 'asc' } });
    const target = byExternal ?? manual;
    const oldMeta = target ? metaOf(target) : {};
    const meta: OAuthMeta = {
      ...oldMeta,
      refreshTokenEnc: encrypt(tokens.refreshToken ?? null) ?? (target?.externalId === profile.externalId ? oldMeta.refreshTokenEnc ?? null : null),
      refreshExpiresAt: expiryFrom(tokens.refreshExpiresIn)?.toISOString() ?? null,
      refreshedAt: new Date().toISOString(),
      followers: profile.followers,
      settings: { ...(DEFAULT_SETTINGS[p] ?? {}), ...(oldMeta.settings ?? {}) },
    };
    const data = {
      name: profile.name.slice(0, 120),
      handle: profile.handle,
      profileUrl: profile.profileUrl,
      avatarUrl: profile.avatarUrl,
      accessTokenEnc: encrypt(tokens.accessToken),
      tokenExpiresAt: expiryFrom(tokens.expiresIn),
      scopes: tokens.scopes?.length ? tokens.scopes : OAUTH[p].scopes,
      status: 'CONNECTED',
      lastError: null,
      lastCheckedAt: new Date(),
      connectedById: userId,
    };
    // A reconnect keeps the auto-publish choice; a first connection starts with it off.
    const keepAuto = !!target?.accessTokenEnc && target.externalId === profile.externalId && target.autoPublish;
    let row: BrandSocialAccount;
    if (target) {
      row = await this.prisma.brandSocialAccount.update({
        where: { id: target.id },
        data: { ...data, externalId: profile.externalId, autoPublish: keepAuto, meta: asJson(meta) },
      });
    } else {
      row = await this.prisma.brandSocialAccount.create({
        data: { platform: p, externalId: profile.externalId, autoPublish: false, meta: asJson(meta), ...data },
      });
    }
    if (byExternal && manual && manual.id !== byExternal.id) {
      await this.prisma.brandSocialAccount.update({ where: { id: manual.id }, data: { status: 'DISCONNECTED' } });
    }
    if (p === 'PINTEREST' && !meta.settings?.pinterestBoardId) {
      const boards = await this.pinterest.boards(tokens.accessToken).catch(() => []);
      if (boards.length === 1) row = await this.saveSettings(row, { pinterestBoardId: boards[0].id, pinterestBoardName: boards[0].name });
    }
    return { row, upgraded: !byExternal && !!manual };
  }

  /* ───────────────────────── tokens ───────────────────────── */

  /** A usable access token, refreshed first when it ends within a few minutes. */
  async accessToken(a: BrandSocialAccount): Promise<string> {
    const token = decrypt(a.accessTokenEnc);
    if (!token) throw new SocialGraphError('token', `The ${PLATFORM_LABEL[a.platform as BrandPlatform] ?? a.platform} connection has no token. Reconnect it on the Accounts page.`);
    if (a.tokenExpiresAt && a.tokenExpiresAt.getTime() - Date.now() < USE_REFRESH_MS) return (await this.refreshToken(a)).token;
    return token;
  }

  /** Refreshes the token now and saves it. A refused refresh marks the account for reconnecting. */
  async refreshToken(a: BrandSocialAccount): Promise<{ token: string; row: BrandSocialAccount }> {
    const p = a.platform;
    if (!isOAuthPlatform(p)) throw new SocialGraphError('unknown', 'Not an OAuth platform.');
    const app = await this.app(p);
    if (!app) throw new SocialGraphError('setup', `The ${PLATFORM_LABEL[p]} app is not saved on the Settings page.`);
    const meta = metaOf(a);
    try {
      const t = await this.adapter(p).refresh(app, { accessToken: decrypt(a.accessTokenEnc) ?? '', refreshToken: decrypt(meta.refreshTokenEnc ?? null) });
      const next: OAuthMeta = {
        ...meta,
        refreshTokenEnc: t.refreshToken ? encrypt(t.refreshToken) : meta.refreshTokenEnc ?? null,
        refreshExpiresAt: t.refreshExpiresIn ? expiryFrom(t.refreshExpiresIn)?.toISOString() ?? null : meta.refreshExpiresAt ?? null,
        refreshedAt: new Date().toISOString(),
      };
      const row = await this.prisma.brandSocialAccount.update({
        where: { id: a.id },
        data: {
          accessTokenEnc: encrypt(t.accessToken), tokenExpiresAt: expiryFrom(t.expiresIn) ?? (t.expiresIn === null ? null : a.tokenExpiresAt),
          meta: asJson(next), ...(a.status === 'NEEDS_RECONNECT' ? {} : { lastError: null }),
        },
      });
      return { token: t.accessToken, row };
    } catch (e) {
      const err = toSocialError(e);
      if (err.kind === 'token' || err.kind === 'permission') await this.graph.markReconnect(a.id, err.text);
      throw err;
    }
  }

  /** Hourly: refreshes tokens that are close to their end (see needsRefresh). */
  @Cron('0 40 * * * *')
  async refreshJob() {
    if (this.refreshing || jobsOff()) return;
    this.refreshing = true;
    try {
      const rows = await this.prisma.brandSocialAccount.findMany({ where: { status: 'CONNECTED', platform: { in: [...OAUTH_PLATFORMS] }, accessTokenEnc: { not: null } } });
      for (const a of rows) {
        const m = metaOf(a);
        if (!needsRefresh(a.platform as OAuthPlatform, a.tokenExpiresAt, m.refreshedAt ? new Date(m.refreshedAt) : null)) continue;
        await this.refreshToken(a).catch((e) => this.logger.warn(`Token refresh ${a.platform} ${a.id}: ${toSocialError(e).text}`));
      }
    } finally {
      this.refreshing = false;
    }
  }

  /** "Check now": refresh the token when due, then read the profile again. */
  async check(a: BrandSocialAccount): Promise<BrandSocialAccount> {
    const p = a.platform as OAuthPlatform;
    try {
      const m = metaOf(a);
      let row = a;
      let token: string;
      if (needsRefresh(p, a.tokenExpiresAt, m.refreshedAt ? new Date(m.refreshedAt) : null) || (a.tokenExpiresAt && a.tokenExpiresAt.getTime() < Date.now() + USE_REFRESH_MS)) {
        ({ token, row } = await this.refreshToken(a));
      } else {
        token = await this.accessToken(a);
      }
      const prof = await this.adapter(p).profile(token, { userId: a.externalId });
      return await this.prisma.brandSocialAccount.update({
        where: { id: a.id },
        data: {
          name: prof.name.slice(0, 120), handle: prof.handle ?? row.handle, profileUrl: prof.profileUrl ?? row.profileUrl, avatarUrl: prof.avatarUrl ?? row.avatarUrl,
          status: 'CONNECTED', lastError: null, lastCheckedAt: new Date(), meta: asJson({ ...metaOf(row), followers: prof.followers }),
        },
      });
    } catch (e) {
      const err = toSocialError(e);
      const reconnect = err.kind === 'token' || err.kind === 'permission';
      return this.prisma.brandSocialAccount.update({ where: { id: a.id }, data: { lastError: err.text, lastCheckedAt: new Date(), ...(reconnect ? { status: 'NEEDS_RECONNECT' } : {}) } });
    }
  }

  /** Clears the stored refresh token (on disconnect). */
  async dropTokens(a: BrandSocialAccount) {
    const m = metaOf(a);
    delete m.refreshTokenEnc;
    delete m.refreshExpiresAt;
    await this.prisma.brandSocialAccount.update({ where: { id: a.id }, data: { meta: asJson(m) } });
  }

  /* ───────────────────────── account settings ───────────────────────── */

  /** Checks and saves the per-account settings. */
  async saveSettings(a: BrandSocialAccount, input: AccountPlatformSettings): Promise<BrandSocialAccount> {
    const p = a.platform;
    if (!isOAuthPlatform(p)) throw new BadRequestException('This account has no settings.');
    const meta = metaOf(a);
    const cur: AccountPlatformSettings = { ...(DEFAULT_SETTINGS[p] ?? {}), ...(meta.settings ?? {}) };
    const s = input ?? {};
    if (p === 'YOUTUBE' && s.youtubePrivacy !== undefined) {
      if (!['private', 'unlisted', 'public'].includes(s.youtubePrivacy)) throw new BadRequestException('Privacy must be private, unlisted or public.');
      cur.youtubePrivacy = s.youtubePrivacy;
    }
    if (p === 'TIKTOK') {
      if (s.tiktokMode !== undefined) {
        if (s.tiktokMode !== 'INBOX' && s.tiktokMode !== 'DIRECT') throw new BadRequestException('Choose "Send to TikTok drafts" or "Post directly".');
        cur.tiktokMode = s.tiktokMode;
      }
      if (s.tiktokPrivacy !== undefined) {
        const ok = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'];
        if (s.tiktokPrivacy !== null && !ok.includes(s.tiktokPrivacy)) throw new BadRequestException('Unknown TikTok privacy level.');
        cur.tiktokPrivacy = s.tiktokPrivacy;
      }
    }
    if (p === 'PINTEREST' && s.pinterestBoardId !== undefined) {
      cur.pinterestBoardId = s.pinterestBoardId ? String(s.pinterestBoardId).slice(0, 64) : null;
      cur.pinterestBoardName = s.pinterestBoardId ? String(s.pinterestBoardName ?? '').slice(0, 180) || null : null;
    }
    return this.prisma.brandSocialAccount.update({ where: { id: a.id }, data: { meta: asJson({ ...meta, settings: cur }) } });
  }

  /** Choices for the account settings: Pinterest boards, TikTok privacy levels. */
  async options(a: BrandSocialAccount): Promise<AccountOptionsResponse> {
    const p = a.platform as OAuthPlatform;
    if (!isOAuthPlatform(p)) throw new NotFoundException('This account has no settings.');
    const settings = { ...(DEFAULT_SETTINGS[p] ?? {}), ...(metaOf(a).settings ?? {}) };
    const out: AccountOptionsResponse = { platform: p, settings, notes: [] };
    const token = await this.accessToken(a).catch((e) => { throw new BadRequestException(toSocialError(e).text); });
    try {
      if (p === 'PINTEREST') out.boards = await this.pinterest.boards(token);
      if (p === 'TIKTOK') {
        const c = await (this.adapters.TIKTOK as BrandSocialTiktokService).creatorInfo(token);
        out.tiktok = { privacyOptions: c.privacy_level_options ?? [], maxDurationSec: c.max_video_post_duration_sec ?? null, username: c.creator_username ?? null };
      }
    } catch (e) {
      out.notes.push(toSocialError(e).text);
    }
    if (p === 'YOUTUBE') out.notes.push('Google keeps uploads from an unverified API project private. Switch to unlisted or public after the project passes Google\'s audit.');
    if (p === 'X') out.notes.push('Posting needs an X developer plan or credits that include writes.');
    return out;
  }

  /**
   * TikTok creator_info for the composer's TikTok settings, kept for a few
   * minutes. A refusal (posting limit reached, account blocked, token) comes
   * back as canPost false with the reason, and is not kept.
   */
  async tiktokCreatorInfo(a: BrandSocialAccount, fresh = false): Promise<TikTokCreatorInfoResponse> {
    if (a.platform !== 'TIKTOK') throw new BadRequestException('This is not a TikTok account.');
    const hit = this.creatorCache.get(a.id);
    if (!fresh && hit && Date.now() - hit.at < CREATOR_INFO_TTL_MS) return hit.value;
    const base: TikTokCreatorInfoResponse = {
      accountId: a.id, nickname: a.name, username: a.handle?.replace(/^@/, '') ?? null, avatarUrl: a.avatarUrl,
      privacyLevelOptions: [], commentDisabled: false, duetDisabled: false, stitchDisabled: false, maxVideoPostDurationSec: null,
      canPost: false, reason: null, fetchedAt: new Date().toISOString(),
    };
    try {
      const c = await (this.adapters.TIKTOK as BrandSocialTiktokService).creatorInfo(await this.accessToken(a));
      const value: TikTokCreatorInfoResponse = {
        ...base, ...creatorLimits(c),
        nickname: c.creator_nickname || base.nickname, username: c.creator_username ?? base.username, avatarUrl: c.creator_avatar_url ?? base.avatarUrl,
        canPost: true,
      };
      this.creatorCache.set(a.id, { at: Date.now(), value });
      return value;
    } catch (e) {
      this.creatorCache.delete(a.id);
      const err = toSocialError(e);
      return { ...base, reason: err.kind === 'token' || err.kind === 'permission' ? err.text : `${err.text} Try again later.` };
    }
  }

  /* ───────────────────────── publishing ───────────────────────── */

  async publish(post: BrandSocialPost, p: OAuthPlatform, account: BrandSocialAccount, prev: PlatformPublishState, utm: { medium: string; defaultCampaign: string }, abs: (u: string) => string): Promise<PublishOutcome> {
    const media = ((Array.isArray(post.media) ? post.media : []) as unknown as PostMediaItem[]).map((m) => ({ ...m, url: abs(m.url), thumbUrl: m.thumbUrl ? abs(m.thumbUrl) : m.thumbUrl }));
    const src = { code: post.code, caption: post.caption, captions: (post.captions ?? {}) as Partial<Record<BrandPlatform, string>>, hashtags: post.hashtags, link: post.link, campaign: post.campaign, media };
    try {
      const ctx: PublishContext = {
        accessToken: await this.accessToken(account),
        externalId: account.externalId,
        handle: account.handle,
        settings: { ...(DEFAULT_SETTINGS[p] ?? {}), ...(metaOf(account).settings ?? {}) },
        post: { id: post.id, code: post.code, title: post.title, kind: isKind(post.kind) ? post.kind : 'POST', firstComment: post.firstComment, options: normalizePostOptions(post.options) },
        text: textFor(src, p, utm),
        textNoLink: textFor({ ...src, link: null }, p, utm),
        link: linkFor(src, p, utm),
        media,
        prev,
      };
      const adapter = this.adapter(p);
      const result = await adapter.publish(ctx);
      const out: PublishOutcome = { result };
      const comment = post.firstComment?.trim();
      if (comment && 'postId' in result) {
        if (!adapter.comment) out.commentError = `${PLATFORM_LABEL[p]} has no API for comments; add the first comment by hand.`;
        else {
          try { out.commentId = await adapter.comment(ctx, result.postId, comment); } catch (e) { out.commentError = `The post is live, but the first comment failed: ${toSocialError(e).text}`; }
        }
      }
      return out;
    } catch (e) {
      const err = toSocialError(e);
      if (err.kind === 'token') await this.graph.markReconnect(account.id, err.text);
      throw err;
    }
  }

  /* ───────────────────────── results ───────────────────────── */

  /**
   * Post numbers and followers for the OAuth platforms. Every 3 hours for
   * posts younger than 7 days; once a day (03:00 Pakistan time) up to 60 days.
   * A platform that refuses is skipped.
   */
  async insightsRun() {
    const hour = hourInTz(new Date());
    if (hour % 3 !== 0) return;
    const accounts = await this.prisma.brandSocialAccount.findMany({ where: { status: 'CONNECTED', platform: { in: [...OAUTH_PLATFORMS] }, accessTokenEnc: { not: null } } });
    if (!accounts.length) return;
    const now = Date.now();
    const posts = await this.prisma.brandSocialPost.findMany({
      where: { publishedAt: { gte: new Date(now - (hour === 3 ? 60 : 7) * 86_400_000) }, status: { in: ['PUBLISHED', 'PARTIAL', 'PUBLISHING'] } },
      select: { id: true, publishState: true },
      take: 500,
    });
    const today = new Date(`${dateKeyTz(new Date())}T00:00:00.000Z`);
    for (const a of accounts) {
      const p = a.platform as OAuthPlatform;
      let token: string;
      try { token = await this.accessToken(a); } catch (e) { this.logger.warn(`Insights token ${p}: ${toSocialError(e).text}`); continue; }
      const prof = await this.adapter(p).profile(token, { userId: a.externalId }).catch(() => null);
      if (prof && prof.followers != null) {
        await this.prisma.brandSocialAccountDay.upsert({
          where: { accountId_day: { accountId: a.id, day: today } },
          create: { accountId: a.id, day: today, followers: prof.followers },
          update: { followers: prof.followers },
        }).catch(() => null);
        await this.prisma.brandSocialAccount.update({ where: { id: a.id }, data: { meta: asJson({ ...metaOf(a), followers: prof.followers }) } }).catch(() => null);
      }
      const adapter = this.adapter(p);
      if (!adapter.metrics) continue;
      const refs = new Map<string, string>();
      for (const post of posts) {
        const s = ((post.publishState ?? {}) as PublishStateMap)[p];
        if (s?.status === 'PUBLISHED' && !s.manual && s.postId) refs.set(s.postId, post.id);
      }
      if (!refs.size) continue;
      const values = await adapter.metrics(token, a.externalId, [...refs.keys()]).catch((e) => { this.logger.warn(`Insights ${p}: ${toSocialError(e).text}`); return null; });
      for (const [postRef, m] of values ?? []) {
        const postId = refs.get(postRef);
        if (!postId) continue;
        const data = { reach: m.reach, impressions: m.impressions, likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saves, plays: m.plays, clicks: m.clicks, engagement: engagementOf(m), raw: m.raw as Prisma.InputJsonValue, fetchedAt: new Date() };
        await this.prisma.brandSocialPostMetric.upsert({
          where: { postId_platform_day: { postId, platform: p, day: today } },
          create: { postId, platform: p, day: today, ...data },
          update: data,
        }).catch((e) => this.logger.warn(`Save insights ${postId}/${p}: ${(e as Error).message}`));
      }
    }
  }

  /* ───────────────────────── Threads callbacks ───────────────────────── */

  private async threadsUser(signed: string | undefined): Promise<string | null> {
    const app = await this.app('THREADS');
    if (!app) return null;
    const data = parseSignedRequest(signed, app.clientSecret);
    return data?.user_id ? String(data.user_id) : null;
  }

  private wipe(a: BrandSocialAccount, deleteData: boolean): Prisma.BrandSocialAccountUpdateInput {
    const m = metaOf(a);
    delete m.refreshTokenEnc;
    delete m.refreshExpiresAt;
    return {
      status: 'DISCONNECTED', autoPublish: false, accessTokenEnc: null, tokenExpiresAt: null, meta: asJson(m),
      lastError: deleteData ? 'Threads data deletion requested: the token and profile picture were removed.' : 'The Nafaa app was removed from Threads. Connect again to publish.',
      ...(deleteData ? { avatarUrl: null } : {}),
    };
  }

  /** Uninstall callback: the Threads account removed the app. */
  async threadsUninstall(signed: string | undefined): Promise<{ ok: boolean; count: number }> {
    const uid = await this.threadsUser(signed);
    if (!uid) return { ok: false, count: 0 };
    const rows = await this.prisma.brandSocialAccount.findMany({ where: { platform: 'THREADS', externalId: uid } });
    for (const a of rows) await this.prisma.brandSocialAccount.update({ where: { id: a.id }, data: this.wipe(a, false) });
    return { ok: true, count: rows.length };
  }

  /** Data deletion callback: drop tokens and profile data, answer { url, confirmation_code }. */
  async threadsDelete(signed: string | undefined): Promise<{ url: string; confirmation_code: string } | null> {
    const uid = await this.threadsUser(signed);
    if (!uid) return null;
    const rows = await this.prisma.brandSocialAccount.findMany({ where: { platform: 'THREADS', externalId: uid } });
    for (const a of rows) await this.prisma.brandSocialAccount.update({ where: { id: a.id }, data: this.wipe(a, true) });
    const code = crypto.randomBytes(9).toString('base64url');
    const at = new Date().toISOString();
    const row = await this.prisma.systemSetting.findUnique({ where: { key: THREADS_DELETIONS_KEY } });
    let list: ThreadsDeletion[] = [];
    try { list = row?.value ? JSON.parse(row.value) : []; } catch { list = []; }
    list = [{ code, threadsUserId: uid, accounts: rows.length, status: 'DONE' as const, requestedAt: at, completedAt: at }, ...(Array.isArray(list) ? list : [])].slice(0, 200);
    const value = JSON.stringify(list);
    await this.prisma.systemSetting.upsert({
      where: { key: THREADS_DELETIONS_KEY },
      create: { key: THREADS_DELETIONS_KEY, value, category: 'brand_social', description: 'Nafaa Social: Threads data deletion requests', isPublic: false },
      update: { value },
    });
    return { url: `${apiBase()}/brand-social/webhooks/threads/deletion-status?code=${encodeURIComponent(code)}`, confirmation_code: code };
  }

  async threadsDeletionStatus(code: string): Promise<ThreadsDeletion | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: THREADS_DELETIONS_KEY } });
    try {
      const list = row?.value ? (JSON.parse(row.value) as ThreadsDeletion[]) : [];
      return list.find((d) => d.code === String(code ?? '')) ?? null;
    } catch {
      return null;
    }
  }
}
