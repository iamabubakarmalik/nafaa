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
  AccountRef, AdapterResult, emptyMetrics, errorParts, httpJson, HttpOptions, kindOf, mediaHead, mediaRange, MetricValues, n, PlatformApp, platformErrorText,
  ProfileInfo, PublishContext, RemoteComment, sleep, SocialAdapter, TokenSet,
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
    // A poll goes on text posts only (validation blocks a poll with media).
    const poll = !ids.length ? ctx.post.options.x?.poll : null;
    const r = await this.call<{ data?: { id?: string } }>('tweets', ctx.accessToken, {
      method: 'POST',
      json: {
        text: ctx.text,
        ...(ids.length ? { media: { media_ids: ids } } : {}),
        ...(poll && poll.options.length >= 2 ? { poll: { options: poll.options.slice(0, 4), duration_minutes: poll.durationMinutes } } : {}),
      },
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

  async deletePost(token: string, postId: string): Promise<void> {
    await this.call(`tweets/${postId}`, token, { method: 'DELETE' });
  }

  /**
   * Replies in the post's conversation from the last 7 days (recent search).
   * Reading needs a plan that allows search; a refusal comes back as a
   * "plan" error and the inbox shows it.
   */
  async listComments(token: string, account: AccountRef, postId: string): Promise<RemoteComment[]> {
    const r = await this.call<{ data?: any[]; includes?: { users?: any[] } }>('tweets/search/recent', token, {
      query: {
        query: `conversation_id:${postId}`, max_results: 50,
        'tweet.fields': 'author_id,created_at,referenced_tweets,conversation_id', expansions: 'author_id', 'user.fields': 'username,name',
      },
    });
    const users = new Map((r?.includes?.users ?? []).map((u: any) => [String(u.id), u]));
    const user = account.handle?.replace(/^@/, '');
    return (r?.data ?? []).map((t: any): RemoteComment => {
      const u = users.get(String(t.author_id));
      const parent = (t.referenced_tweets ?? []).find((x: any) => x?.type === 'replied_to')?.id;
      return {
        id: String(t.id), parentId: parent && String(parent) !== postId ? String(parent) : null, authorId: t.author_id ? String(t.author_id) : null,
        authorName: u?.name ?? (u?.username ? `@${u.username}` : 'X user'), authorHandle: u?.username ? `@${u.username}` : null,
        text: String(t.text ?? ''), permalink: u?.username ? `https://x.com/${u.username}/status/${t.id}` : user ? `https://x.com/i/web/status/${t.id}` : null,
        at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
        mine: String(t.author_id) === account.externalId, hidden: false,
      };
    });
  }

  async replyComment(token: string, _account: AccountRef, _postId: string, commentId: string, text: string): Promise<string | null> {
    const r = await this.call<{ data?: { id?: string } }>('tweets', token, { method: 'POST', json: { text, reply: { in_reply_to_tweet_id: commentId } } });
    return r.data?.id ?? null;
  }

  /** Needs tweet.moderate.write; works on replies to Nafaa's own posts. */
  async hideComment(token: string, commentId: string, hidden: boolean): Promise<void> {
    await this.call(`tweets/${commentId}/hidden`, token, { method: 'PUT', json: { hidden } });
  }

  /** Only Nafaa's own replies can be deleted. */
  async deleteComment(token: string, commentId: string): Promise<void> {
    await this.call(`tweets/${commentId}`, token, { method: 'DELETE' });
  }

  /**
   * public_metrics (impressions, likes, replies, reposts, quotes, bookmarks)
   * and, for Nafaa's own posts under 30 days, non_public_metrics link clicks.
   * When X refuses the private numbers, the public ones are read alone.
   */
  async metrics(token: string, _externalId: string, ids: string[]): Promise<Map<string, MetricValues>> {
    const out = new Map<string, MetricValues>();
    type Row = { id: string; public_metrics?: Record<string, number>; non_public_metrics?: Record<string, number> };
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100).join(',');
      let refused: string[] = [];
      let r = await this.call<{ data?: Row[] }>('tweets', token, { query: { ids: batch, 'tweet.fields': 'public_metrics,non_public_metrics' } }).catch(() => null);
      if (!r?.data) {
        refused = ['non_public_metrics'];
        r = await this.call<{ data?: Row[] }>('tweets', token, { query: { ids: batch, 'tweet.fields': 'public_metrics' } }).catch(() => null);
      }
      for (const t of r?.data ?? []) {
        const p = t.public_metrics ?? {};
        const np = t.non_public_metrics ?? {};
        out.set(String(t.id), {
          ...emptyMetrics(), impressions: n(p.impression_count), reach: n(p.impression_count), likes: n(p.like_count), comments: n(p.reply_count),
          shares: n(p.retweet_count) + n(p.quote_count), saves: n(p.bookmark_count), clicks: n(np.url_link_clicks),
          raw: { public_metrics: p, non_public_metrics: np, ...(refused.length ? { refused } : {}) },
        });
      }
    }
    return out;
  }
}
