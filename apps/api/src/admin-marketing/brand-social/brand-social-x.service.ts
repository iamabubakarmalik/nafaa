/**
 * X adapter (API v2). OAuth 2.0 with PKCE as a confidential client (Basic
 * auth with the client id and secret on the token endpoint), offline.access
 * for a refresh token. Media goes through the v2 chunked upload
 * (initialize, append, finalize, status), then POST /2/tweets. X counts 280
 * characters with every link as 23 (see xLength). Plan and credit refusals
 * come back as plain text, not retried.
 */

import { Injectable } from '@nestjs/common';
import { SocialGraphError } from './brand-social-graph.service';
import { evenChunks, xRoute } from './brand-social-oauth.logic';
import {
  AdapterResult, emptyMetrics, errorParts, httpJson, HttpOptions, kindOf, mediaHead, mediaRange, MetricValues, n, PlatformApp, platformErrorText,
  ProfileInfo, PublishContext, sleep, SocialAdapter, TokenSet,
} from './brand-social-adapter';
import type { PostMediaItem } from './brand-social.types';

const API = 'https://api.x.com/2';

const xError = (status: number, body: unknown): SocialGraphError => {
  const { message, code } = errorParts(body);
  const t = `${code} ${message}`.toLowerCase();
  if (status === 402 || /credits?depleted|credits/.test(t)) {
    return new SocialGraphError('plan', 'X refused: the developer account has no credits left for this (402). Add credits or change the plan in the X developer portal, then retry.');
  }
  if (/client-not-enrolled|client forbidden|not.*attached to a project/.test(t)) {
    return new SocialGraphError('plan', 'X refused: the app is not attached to a Project with API access. Fix it in the X developer portal, then retry.');
  }
  if (/duplicate content/.test(t)) return new SocialGraphError('media', 'X refused a duplicate: the same text was already posted. Change the text and retry.');
  const kind = kindOf(status, code, message);
  return new SocialGraphError(kind, platformErrorText('X', kind, message || `HTTP ${status}`));
};

@Injectable()
export class BrandSocialXService implements SocialAdapter {
  readonly platform = 'X' as const;

  private call<T = any>(path: string, token: string, o: HttpOptions = {}) {
    return httpJson<T>('X', `${API}/${path}`, { ...o, bearer: token, onError: xError }).then((r) => r.data);
  }

  private async token(app: PlatformApp, form: Record<string, string>): Promise<TokenSet> {
    const r = (await httpJson<any>('X', `${API}/oauth2/token`, { method: 'POST', form, basic: [app.clientId, app.clientSecret], onError: xError })).data;
    if (!r?.access_token) throw new SocialGraphError('token', 'X did not give access. Try connecting again.');
    return { accessToken: r.access_token, refreshToken: r.refresh_token ?? null, expiresIn: r.expires_in ?? 7200, scopes: String(r.scope ?? '').split(' ').filter(Boolean) };
  }

  exchangeCode(app: PlatformApp, code: string, redirectUri: string, verifier: string | null): Promise<TokenSet> {
    if (!verifier) throw new SocialGraphError('token', 'The X sign-in lost its PKCE verifier. Click Connect again.');
    return this.token(app, { code, grant_type: 'authorization_code', redirect_uri: redirectUri, code_verifier: verifier });
  }

  refresh(app: PlatformApp, t: { refreshToken: string | null }): Promise<TokenSet> {
    if (!t.refreshToken) throw new SocialGraphError('token', 'X gave no refresh token. Reconnect X.');
    return this.token(app, { refresh_token: t.refreshToken, grant_type: 'refresh_token' });
  }

  async profile(token: string): Promise<ProfileInfo> {
    const r = await this.call<{ data?: { id: string; name?: string; username?: string; profile_image_url?: string; public_metrics?: { followers_count?: number } } }>(
      'users/me', token, { query: { 'user.fields': 'profile_image_url,public_metrics,username,name' } },
    );
    const u = r.data;
    if (!u?.id) throw new SocialGraphError('unknown', 'X did not return the account.');
    return {
      externalId: String(u.id),
      name: u.name || (u.username ? `@${u.username}` : 'X'),
      handle: u.username ? `@${u.username}` : null,
      profileUrl: u.username ? `https://x.com/${u.username}` : null,
      avatarUrl: u.profile_image_url ?? null,
      followers: u.public_metrics?.followers_count ?? null,
    };
  }

  /** Uploads one image or video and waits for X to process it. Returns the media id. */
  private async upload(token: string, m: PostMediaItem): Promise<string> {
    const head = await mediaHead('X', m.url);
    const video = m.kind === 'video';
    const type = video ? 'video/mp4' : /^image\/(jpeg|png|webp|gif)$/.test(head.type) ? head.type : 'image/jpeg';
    const init = await this.call<{ data?: { id?: string } }>('media/upload/initialize', token, {
      method: 'POST', json: { media_type: type, total_bytes: head.size, media_category: video ? 'tweet_video' : type === 'image/gif' ? 'tweet_gif' : 'tweet_image' },
    });
    const id = init.data?.id;
    if (!id) throw new SocialGraphError('unknown', 'X did not start the media upload.');
    const cache: { whole?: Buffer } = {};
    let i = 0;
    for (const [a, b] of evenChunks(head.size)) {
      const chunk = await mediaRange(m.url, a, b, cache);
      const form = new FormData();
      form.set('segment_index', String(i++));
      form.set('media', new Blob([new Uint8Array(chunk)], { type }), 'media');
      await this.call(`media/upload/${id}/append`, token, { method: 'POST', body: form, timeoutMs: 5 * 60_000 });
    }
    const fin = await this.call<{ data?: { processing_info?: { state?: string; check_after_secs?: number } } }>(`media/upload/${id}/finalize`, token, { method: 'POST' });
    let info = fin.data?.processing_info;
    const started = Date.now();
    while (info && info.state !== 'succeeded') {
      if (info.state === 'failed') throw new SocialGraphError('media', 'X could not process the video. Use an MP4 (H.264, AAC), up to 2 minutes 20 seconds.');
      if (Date.now() - started > 3 * 60_000) throw new SocialGraphError('transient', 'X is still processing the video. Another try will happen on its own.');
      await sleep(Math.min(20, Math.max(2, info.check_after_secs ?? 5)) * 1000);
      const s = await this.call<{ data?: { processing_info?: { state?: string; check_after_secs?: number } } }>('media/upload', token, { query: { command: 'STATUS', media_id: id } });
      info = s.data?.processing_info;
    }
    return id;
  }

  async publish(ctx: PublishContext): Promise<AdapterResult> {
    const route = xRoute(ctx.media);
    if (!route.ok) throw new SocialGraphError('media', route.reason);
    const items = route.video ? [route.video] : route.images;
    const ids: string[] = [];
    for (const m of items) ids.push(await this.upload(ctx.accessToken, m));
    const r = await this.call<{ data?: { id?: string } }>('tweets', ctx.accessToken, {
      method: 'POST', json: { text: ctx.text, ...(ids.length ? { media: { media_ids: ids } } : {}) },
    });
    const id = r.data?.id;
    if (!id) throw new SocialGraphError('unknown', 'X did not return an id for the new post.');
    const user = ctx.handle?.replace(/^@/, '');
    return { postId: id, permalink: user ? `https://x.com/${user}/status/${id}` : `https://x.com/i/web/status/${id}` };
  }

  async comment(ctx: PublishContext, postId: string, text: string): Promise<string | null> {
    const r = await this.call<{ data?: { id?: string } }>('tweets', ctx.accessToken, { method: 'POST', json: { text, reply: { in_reply_to_tweet_id: postId } } });
    return r.data?.id ?? null;
  }

  async metrics(token: string, _externalId: string, ids: string[]): Promise<Map<string, MetricValues>> {
    const out = new Map<string, MetricValues>();
    for (let i = 0; i < ids.length; i += 100) {
      const r = await this.call<{ data?: Array<{ id: string; public_metrics?: Record<string, number> }> }>('tweets', token, {
        query: { ids: ids.slice(i, i + 100).join(','), 'tweet.fields': 'public_metrics' },
      }).catch(() => null);
      for (const t of r?.data ?? []) {
        const p = t.public_metrics ?? {};
        out.set(String(t.id), {
          ...emptyMetrics(), impressions: n(p.impression_count), reach: n(p.impression_count), likes: n(p.like_count), comments: n(p.reply_count),
          shares: n(p.retweet_count) + n(p.quote_count), saves: n(p.bookmark_count), raw: { public_metrics: p },
        });
      }
    }
    return out;
  }
}
