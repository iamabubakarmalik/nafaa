/**
 * YouTube adapter (YouTube Data API v3). Google OAuth with offline access
 * (a refresh token) and the youtube.upload + youtube.readonly scopes.
 * Publishing is a resumable videos.insert: the session is opened with the
 * title, description, tags and privacy, then the file is streamed from the
 * media URL in one PUT. Only VIDEO and REEL posts go here; a vertical video up
 * to 3 minutes shows as a Short. Privacy comes from the account settings and
 * stays "private" until the owner changes it (Google locks uploads from an
 * unverified API project to private anyway).
 */

import { Injectable } from '@nestjs/common';
import { SocialGraphError } from './brand-social-graph.service';
import { youtubeRoute, youtubeSafe } from './brand-social-oauth.logic';
import {
  AccountRef, AdapterResult, emptyMetrics, httpJson, mediaHead, MetricValues, n, PlatformApp, platformError, PostEdit, ProfileInfo, PublishContext, RemoteComment,
  SocialAdapter, streamUpload, TokenSet, videoMime,
} from './brand-social-adapter';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';

@Injectable()
export class BrandSocialYoutubeService implements SocialAdapter {
  readonly platform = 'YOUTUBE' as const;

  private token(form: Record<string, string>) {
    return httpJson<{ access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; scope?: string }>('YOUTUBE', TOKEN_URL, { method: 'POST', form })
      .then((r) => r.data);
  }

  async exchangeCode(app: PlatformApp, code: string, redirectUri: string): Promise<TokenSet> {
    const r = await this.token({ code, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' });
    if (!r?.access_token) throw new SocialGraphError('token', 'Google did not give access. Try connecting again.');
    return { accessToken: r.access_token, refreshToken: r.refresh_token ?? null, expiresIn: r.expires_in ?? 3600, refreshExpiresIn: r.refresh_token_expires_in ?? null, scopes: (r.scope ?? '').split(' ').filter(Boolean) };
  }

  async refresh(app: PlatformApp, t: { refreshToken: string | null }): Promise<TokenSet> {
    if (!t.refreshToken) throw new SocialGraphError('token', 'Google gave no refresh token. Reconnect YouTube.');
    const r = await this.token({ client_id: app.clientId, client_secret: app.clientSecret, refresh_token: t.refreshToken, grant_type: 'refresh_token' });
    if (!r?.access_token) throw new SocialGraphError('token', 'Google did not refresh the token. Reconnect YouTube.');
    return { accessToken: r.access_token, refreshToken: r.refresh_token ?? t.refreshToken, expiresIn: r.expires_in ?? 3600, scopes: (r.scope ?? '').split(' ').filter(Boolean) };
  }

  async profile(token: string): Promise<ProfileInfo> {
    const r = (await httpJson<{ items?: any[] }>('YOUTUBE', `${API}/channels`, { bearer: token, query: { part: 'snippet,statistics', mine: 'true' } })).data;
    const ch = r?.items?.[0];
    if (!ch) throw new SocialGraphError('permission', 'This Google account has no YouTube channel. Sign in with the account that owns the Nafaa channel.');
    const custom = ch.snippet?.customUrl ? String(ch.snippet.customUrl).replace(/^@?/, '@') : null;
    return {
      externalId: String(ch.id),
      name: ch.snippet?.title ?? 'YouTube',
      handle: custom,
      profileUrl: custom ? `https://www.youtube.com/${custom}` : `https://www.youtube.com/channel/${ch.id}`,
      avatarUrl: ch.snippet?.thumbnails?.default?.url ?? ch.snippet?.thumbnails?.medium?.url ?? null,
      followers: ch.statistics?.hiddenSubscriberCount ? null : n(ch.statistics?.subscriberCount),
    };
  }

  async publish(ctx: PublishContext): Promise<AdapterResult> {
    const route = youtubeRoute(ctx.post.kind, ctx.media);
    if (!route.ok) {
      if (route.skip) return { skipped: route.reason };
      throw new SocialGraphError('media', route.reason);
    }
    const video = route.video!;
    const head = await mediaHead('YOUTUBE', video.url);
    const mime = videoMime(video.url, head.type);
    const short = ctx.post.kind === 'REEL';
    let description = youtubeSafe(ctx.text, 5000);
    if (short && !/#shorts\b/i.test(description)) description = youtubeSafe(`${description}\n\n#Shorts`, 5000);
    const tags = (ctx.text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.slice(1)).filter((t, i, a) => a.indexOf(t) === i).slice(0, 15);
    const title = youtubeSafe(ctx.post.title, 100) || youtubeSafe(ctx.text.split('\n')[0], 100) || 'Nafaa';

    // 1. Open the upload session.
    const init = await fetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(head.size), 'X-Upload-Content-Type': mime,
      },
      body: JSON.stringify({
        snippet: { title, description, tags, categoryId: '22' },
        status: { privacyStatus: ctx.settings.youtubePrivacy ?? 'private', selfDeclaredMadeForKids: false, embeddable: true },
      }),
      signal: AbortSignal.timeout(60_000),
    }).catch((e) => { throw new SocialGraphError('transient', `YouTube did not answer (${(e as Error).message}).`); });
    if (!init.ok) throw platformError('YOUTUBE', init.status, await init.json().catch(() => null));
    const session = init.headers.get('location');
    if (!session) throw new SocialGraphError('transient', 'YouTube did not open an upload session. Another try will happen on its own.');

    // 2. Stream the file in one request.
    const up = await streamUpload(session, video.url, { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': mime });
    let body: any = null;
    try { body = JSON.parse(up.body); } catch { /* not JSON */ }
    if (up.status !== 200 && up.status !== 201) throw platformError('YOUTUBE', up.status, body);
    if (!body?.id) throw new SocialGraphError('unknown', 'YouTube did not return an id for the new video.');
    return { postId: String(body.id), permalink: short ? `https://www.youtube.com/shorts/${body.id}` : `https://www.youtube.com/watch?v=${body.id}` };
  }

  /** Video statistics: views, likes, comments (YouTube no longer gives dislikes or shares). */
  async metrics(token: string, _externalId: string, ids: string[]): Promise<Map<string, MetricValues>> {
    const out = new Map<string, MetricValues>();
    for (let i = 0; i < ids.length; i += 50) {
      const r = await httpJson<{ items?: any[] }>('YOUTUBE', `${API}/videos`, { bearer: token, query: { part: 'statistics', id: ids.slice(i, i + 50).join(',') } })
        .then((x) => x.data).catch(() => null);
      for (const v of r?.items ?? []) {
        const s = v.statistics ?? {};
        out.set(String(v.id), {
          ...emptyMetrics(), impressions: n(s.viewCount), reach: n(s.viewCount), plays: n(s.viewCount), likes: n(s.likeCount), comments: n(s.commentCount),
          saves: n(s.favoriteCount), raw: { statistics: s },
        });
      }
    }
    return out;
  }

  /* ───── live video and comments (youtube.force-ssl) ───── */

  /**
   * videos.update replaces the whole snippet, so the current one is read
   * first and only the title and description change (tags, category and
   * language are kept).
   */
  async editPost(token: string, videoId: string, edit: PostEdit): Promise<void> {
    const cur = (await httpJson<{ items?: any[] }>('YOUTUBE', `${API}/videos`, { bearer: token, query: { part: 'snippet', id: videoId } })).data?.items?.[0];
    if (!cur) throw new SocialGraphError('unknown', 'YouTube no longer has this video.');
    const sn = cur.snippet ?? {};
    const snippet: Record<string, unknown> = {
      title: edit.title != null ? youtubeSafe(edit.title, 100) || sn.title : sn.title,
      description: edit.description != null ? youtubeSafe(edit.description, 5000) : sn.description ?? '',
      categoryId: sn.categoryId ?? '22',
      ...(Array.isArray(sn.tags) ? { tags: sn.tags } : {}),
      ...(sn.defaultLanguage ? { defaultLanguage: sn.defaultLanguage } : {}),
    };
    await httpJson('YOUTUBE', `${API}/videos`, { method: 'PUT', bearer: token, query: { part: 'snippet' }, json: { id: videoId, snippet } });
  }

  async deletePost(token: string, videoId: string): Promise<void> {
    await httpJson('YOUTUBE', `${API}/videos`, { method: 'DELETE', bearer: token, query: { id: videoId } });
  }

  /** Comment threads on the video, newest first, with their replies (up to 100 threads). */
  async listComments(token: string, account: AccountRef, videoId: string): Promise<RemoteComment[]> {
    const out: RemoteComment[] = [];
    let pageToken: string | undefined;
    const add = (c: any, parentId: string | null) => {
      const sn = c?.snippet ?? {};
      out.push({
        id: String(c.id), parentId, authorId: sn.authorChannelId?.value ?? null, authorName: sn.authorDisplayName ?? 'YouTube user',
        authorHandle: sn.authorDisplayName && String(sn.authorDisplayName).startsWith('@') ? sn.authorDisplayName : null,
        text: String(sn.textOriginal ?? sn.textDisplay ?? ''), permalink: `https://www.youtube.com/watch?v=${videoId}&lc=${c.id}`,
        at: sn.publishedAt ? new Date(sn.publishedAt).toISOString() : new Date().toISOString(),
        mine: !!sn.authorChannelId?.value && sn.authorChannelId.value === account.externalId, hidden: sn.moderationStatus === 'rejected',
      });
    };
    for (let page = 0; page < 2; page++) {
      const r = (await httpJson<{ items?: any[]; nextPageToken?: string }>('YOUTUBE', `${API}/commentThreads`, {
        bearer: token, query: { part: 'snippet,replies', videoId, maxResults: 50, order: 'time', textFormat: 'plainText', pageToken },
      })).data;
      for (const t of r?.items ?? []) {
        const top = t.snippet?.topLevelComment;
        if (!top?.id) continue;
        add(top, null);
        for (const c of t.replies?.comments ?? []) add(c, c.snippet?.parentId ?? top.id);
      }
      pageToken = r?.nextPageToken;
      if (!pageToken) break;
    }
    return out;
  }

  /** YouTube replies only to top-level comments; the caller passes the thread's top comment. */
  async replyComment(token: string, _account: AccountRef, _videoId: string, commentId: string, text: string): Promise<string | null> {
    const r = (await httpJson<{ id?: string }>('YOUTUBE', `${API}/comments`, {
      method: 'POST', bearer: token, query: { part: 'snippet' }, json: { snippet: { parentId: commentId, textOriginal: text.slice(0, 10_000) } },
    })).data;
    return r?.id ?? null;
  }

  /** Hide = "rejected" (removed from the public page); unhide = "published". */
  async hideComment(token: string, commentId: string, hidden: boolean): Promise<void> {
    await httpJson('YOUTUBE', `${API}/comments/setModerationStatus`, { method: 'POST', bearer: token, query: { id: commentId, moderationStatus: hidden ? 'rejected' : 'published' } });
  }

  /** Only comments written by the channel itself can be deleted. */
  async deleteComment(token: string, commentId: string): Promise<void> {
    await httpJson('YOUTUBE', `${API}/comments`, { method: 'DELETE', bearer: token, query: { id: commentId } });
  }
}
