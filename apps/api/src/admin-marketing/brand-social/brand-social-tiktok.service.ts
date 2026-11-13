/**
 * TikTok adapter (Login Kit v2 + Content Posting API). Two modes, chosen per
 * account:
 * - INBOX (default): the video goes to the TikTok drafts inbox; the post then
 *   waits in "To post by hand" until a person finishes it in the TikTok app;
 * - DIRECT: posted at once with a privacy level from creator_info. TikTok
 *   keeps posts from an unaudited app private (SELF_ONLY).
 * Videos use FILE_UPLOAD, sent in chunks read from the media URL (PULL_FROM_URL
 * needs a verified domain and the media is on Cloudinary). Photo posts only
 * accept PULL_FROM_URL; when TikTok refuses the domain the post is handed to a
 * person with the reason.
 */

import { Injectable } from '@nestjs/common';
import { SocialGraphError } from './brand-social-graph.service';
import { pickTikTokPrivacy, tiktokChunks, tiktokRoute } from './brand-social-oauth.logic';
import {
  AdapterResult, CONTAINER_TIMEOUT_MS, errorParts, httpJson, HttpOptions, kindOf, mediaHead, mediaRange, PlatformApp, platformErrorText, ProfileInfo,
  PublishContext, sleep, SocialAdapter, TokenSet, videoMime,
} from './brand-social-adapter';

const API = 'https://open.tiktokapis.com/v2';

const PLAIN: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts: 'TikTok only lets an unaudited app post privately. Set the TikTok account to "Send to TikTok drafts", or make the privacy "Only me", until TikTok audits the app.',
  privacy_level_option_mismatch: 'The chosen TikTok privacy is not offered for this account. Pick another on the Accounts page.',
  spam_risk_too_many_posts: 'TikTok says this account has posted too much today. Try again tomorrow.',
  spam_risk_too_many_pending_share: 'TikTok allows at most 5 drafts waiting in the inbox per day. Finish or delete some drafts in the TikTok app.',
  spam_risk_user_banned_from_posting: 'TikTok has blocked this account from posting.',
  reached_active_user_cap: 'The TikTok app has reached its daily limit of users. Try again tomorrow.',
  url_ownership_unverified: 'TikTok only takes photos from a verified domain, and Nafaa media is on Cloudinary.',
};

const tiktokError = (status: number, body: unknown): SocialGraphError => {
  const { message, code } = errorParts(body);
  const plain = PLAIN[code];
  const kind = code === 'url_ownership_unverified' ? 'domain' : kindOf(status, code, message);
  return new SocialGraphError(kind, plain ?? platformErrorText('TIKTOK', kind, message || code || `HTTP ${status}`));
};

/** TikTok answers 200 with error.code other than "ok" for some failures. */
const check = <T extends { error?: { code?: string } }>(r: T): T => {
  if (r?.error?.code && r.error.code !== 'ok') throw tiktokError(400, r);
  return r;
};

interface CreatorInfo {
  creator_username?: string; creator_nickname?: string; creator_avatar_url?: string;
  privacy_level_options?: string[]; comment_disabled?: boolean; duet_disabled?: boolean; stitch_disabled?: boolean; max_video_post_duration_sec?: number;
}

@Injectable()
export class BrandSocialTiktokService implements SocialAdapter {
  readonly platform = 'TIKTOK' as const;

  private call<T = any>(path: string, token: string, o: HttpOptions = {}) {
    return httpJson<T & { error?: { code?: string } }>('TIKTOK', `${API}/${path}`, { ...o, bearer: token, onError: tiktokError }).then((r) => check(r.data));
  }

  private async token(form: Record<string, string>): Promise<TokenSet> {
    const r = (await httpJson<any>('TIKTOK', `${API}/oauth/token/`, { method: 'POST', form, onError: tiktokError })).data;
    if (!r?.access_token) throw new SocialGraphError('token', `TikTok did not give access${r?.error_description ? ` (${r.error_description})` : ''}. Try connecting again.`);
    return {
      accessToken: r.access_token, refreshToken: r.refresh_token ?? null, expiresIn: r.expires_in ?? 86_400, refreshExpiresIn: r.refresh_expires_in ?? null,
      scopes: String(r.scope ?? '').split(',').filter(Boolean), userId: r.open_id ?? null,
    };
  }

  exchangeCode(app: PlatformApp, code: string, redirectUri: string): Promise<TokenSet> {
    return this.token({ client_key: app.clientId, client_secret: app.clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri });
  }

  refresh(app: PlatformApp, t: { refreshToken: string | null }): Promise<TokenSet> {
    if (!t.refreshToken) throw new SocialGraphError('token', 'TikTok gave no refresh token. Reconnect TikTok.');
    return this.token({ client_key: app.clientId, client_secret: app.clientSecret, grant_type: 'refresh_token', refresh_token: t.refreshToken });
  }

  creatorInfo(token: string): Promise<CreatorInfo> {
    return this.call<{ data?: CreatorInfo }>('post/publish/creator_info/query/', token, { method: 'POST', json: {} }).then((r) => r.data ?? {});
  }

  async profile(token: string, hint: { userId?: string | null }): Promise<ProfileInfo> {
    const u = await this.call<{ data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } } }>('user/info/', token, {
      query: { fields: 'open_id,avatar_url,display_name' },
    });
    const user = u.data?.user ?? {};
    const c = await this.creatorInfo(token).catch(() => null);
    const username = c?.creator_username ?? null;
    return {
      externalId: String(user.open_id ?? hint.userId ?? ''),
      name: user.display_name || c?.creator_nickname || (username ? `@${username}` : 'TikTok'),
      handle: username ? `@${username}` : null,
      profileUrl: username ? `https://www.tiktok.com/@${username}` : null,
      avatarUrl: user.avatar_url ?? c?.creator_avatar_url ?? null,
      followers: null,
    };
  }

  /** Reads the post status: done, still working, or failed. */
  private async status(ctx: PublishContext, publishId: string): Promise<AdapterResult | null> {
    const r = await this.call<{ data?: { status?: string; fail_reason?: string; publicaly_available_post_id?: Array<string | number> } }>(
      'post/publish/status/fetch/', ctx.accessToken, { method: 'POST', json: { publish_id: publishId } },
    );
    const s = r.data?.status;
    if (s === 'PUBLISH_COMPLETE') {
      const id = r.data?.publicaly_available_post_id?.[0];
      const user = ctx.handle?.replace(/^@/, '');
      return { postId: id != null ? String(id) : publishId, permalink: id != null && user ? `https://www.tiktok.com/@${user}/video/${id}` : null };
    }
    if (s === 'SEND_TO_USER_INBOX') return { handoff: 'Sent to the TikTok drafts inbox. Open the TikTok app, tap the notification, finish the post, then mark it posted here.' };
    if (s === 'FAILED') throw new SocialGraphError('media', `TikTok could not post it${r.data?.fail_reason ? ` (${r.data.fail_reason})` : ''}. Use an MP4 (H.264), 3 seconds to 10 minutes, 9:16.`);
    return null;
  }

  async publish(ctx: PublishContext): Promise<AdapterResult> {
    if (ctx.prev.status === 'WAITING' && ctx.prev.containerId) {
      const done = await this.status(ctx, ctx.prev.containerId);
      if (done) return done;
      if (Date.now() - new Date(ctx.prev.at).getTime() > CONTAINER_TIMEOUT_MS) throw new SocialGraphError('media', 'TikTok did not finish processing the video within an hour.');
      return { waiting: true, containerId: ctx.prev.containerId };
    }
    const route = tiktokRoute(ctx.media);
    if (!route.ok) throw new SocialGraphError('media', route.reason);
    const direct = ctx.settings.tiktokMode === 'DIRECT';
    const creator = direct ? await this.creatorInfo(ctx.accessToken) : null;
    const privacy = creator ? pickTikTokPrivacy(creator.privacy_level_options ?? [], ctx.settings.tiktokPrivacy) : null;
    if (direct && !privacy) throw new SocialGraphError('permission', 'TikTok offered no privacy level for this account. Reconnect TikTok.');

    let publishId: string;
    if (route.video) {
      const v = route.video;
      const max = creator?.max_video_post_duration_sec;
      if (max && v.durationSec && v.durationSec > max) throw new SocialGraphError('media', `This TikTok account can post videos up to ${max} seconds; this one is ${Math.round(v.durationSec)} s.`);
      const head = await mediaHead('TIKTOK', v.url);
      const plan = tiktokChunks(head.size);
      const source_info = { source: 'FILE_UPLOAD', video_size: head.size, chunk_size: plan.chunkSize, total_chunk_count: plan.ranges.length };
      const body = direct
        ? {
            post_info: {
              title: ctx.text.slice(0, 2200), privacy_level: privacy,
              disable_comment: !!creator?.comment_disabled, disable_duet: !!creator?.duet_disabled, disable_stitch: !!creator?.stitch_disabled,
              brand_organic_toggle: true, brand_content_toggle: false,
            },
            source_info,
          }
        : { source_info };
      const init = await this.call<{ data?: { publish_id?: string; upload_url?: string } }>(direct ? 'post/publish/video/init/' : 'post/publish/inbox/video/init/', ctx.accessToken, { method: 'POST', json: body });
      const uploadUrl = init.data?.upload_url;
      publishId = String(init.data?.publish_id ?? '');
      if (!publishId || !uploadUrl) throw new SocialGraphError('unknown', 'TikTok did not return an upload address.');
      const mime = videoMime(v.url, head.type);
      const cache: { whole?: Buffer } = {};
      for (const [a, b] of plan.ranges) {
        const chunk = await mediaRange(v.url, a, b, cache);
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mime, 'Content-Length': String(chunk.length), 'Content-Range': `bytes ${a}-${b}/${head.size}` },
          body: new Uint8Array(chunk),
          signal: AbortSignal.timeout(10 * 60_000),
        }).catch((e) => { throw new SocialGraphError('transient', `TikTok upload failed (${(e as Error).message}).`); });
        if (!res.ok) throw tiktokError(res.status, await res.json().catch(() => null));
      }
    } else {
      try {
        const init = await this.call<{ data?: { publish_id?: string } }>('post/publish/content/init/', ctx.accessToken, {
          method: 'POST',
          json: {
            media_type: 'PHOTO',
            post_mode: direct ? 'DIRECT_POST' : 'MEDIA_UPLOAD',
            post_info: {
              title: (ctx.post.title || ctx.text.split('\n')[0]).slice(0, 90), description: ctx.text.slice(0, 4000),
              ...(direct ? { privacy_level: privacy, disable_comment: !!creator?.comment_disabled, auto_add_music: true, brand_organic_toggle: true, brand_content_toggle: false } : {}),
            },
            source_info: { source: 'PULL_FROM_URL', photo_images: route.images.map((m) => m.url), photo_cover_index: 0 },
          },
        });
        publishId = String(init.data?.publish_id ?? '');
      } catch (e) {
        if (e instanceof SocialGraphError && e.kind === 'domain') return { handoff: `${e.text} Post the photos by hand, or use a video.` };
        throw e;
      }
      if (!publishId) throw new SocialGraphError('unknown', 'TikTok did not return a post id.');
    }
    for (let i = 0; i < 3; i++) {
      await sleep(5_000);
      const done = await this.status(ctx, publishId);
      if (done) return done;
    }
    return { waiting: true, containerId: publishId };
  }
}
