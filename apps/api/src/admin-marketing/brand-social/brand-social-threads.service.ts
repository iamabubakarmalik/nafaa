/**
 * Threads adapter (graph.threads.com, v1.0). OAuth with the Threads app ID
 * and secret (separate from META_APP_ID): the code becomes a 1-hour token,
 * exchanged for a 60-day token (th_exchange_token) and refreshed with
 * th_refresh_token. Publishing makes a container (TEXT, IMAGE, VIDEO or a
 * CAROUSEL of 2 to 20 items), waits for it to be FINISHED and publishes it
 * with threads_publish.
 */

import { Injectable } from '@nestjs/common';
import { classifyGraphError, type GraphErrorBody } from '../../integrations/meta/meta-graph';
import { SocialGraphError } from './brand-social-graph.service';
import { threadsRoute } from './brand-social-oauth.logic';
import {
  AdapterResult, CONTAINER_TIMEOUT_MS, emptyMetrics, httpJson, HttpOptions, MetricValues, n, PlatformApp, platformError, platformErrorText,
  ProfileInfo, PublishContext, sleep, SocialAdapter, TokenSet,
} from './brand-social-adapter';

const HOST = 'https://graph.threads.com';
const API = `${HOST}/v1.0`;

/** Threads errors have the Graph shape; sort them with the Graph rules. */
const threadsError = (status: number, body: unknown): SocialGraphError => {
  const err = (body as { error?: GraphErrorBody } | null)?.error;
  if (!err || typeof err !== 'object') return platformError('THREADS', status, body);
  let kind: string = classifyGraphError(err, status);
  if (kind === 'invalid' || kind === 'window' || kind === 'not_found') kind = 'unknown';
  return new SocialGraphError(kind, platformErrorText('THREADS', kind, String(err.error_user_msg || err.message || '')), err);
};

@Injectable()
export class BrandSocialThreadsService implements SocialAdapter {
  readonly platform = 'THREADS' as const;

  private call<T = any>(path: string, token: string, o: HttpOptions = {}) {
    return httpJson<T>('THREADS', `${API}/${path}`, { ...o, query: { ...(o.query ?? {}), access_token: token }, onError: threadsError }).then((r) => r.data);
  }

  async exchangeCode(app: PlatformApp, code: string, redirectUri: string): Promise<TokenSet> {
    const short = (await httpJson<{ access_token?: string; user_id?: string | number }>('THREADS', `${HOST}/oauth/access_token`, {
      method: 'POST',
      form: { client_id: app.clientId, client_secret: app.clientSecret, code: code.replace(/#_$/, ''), grant_type: 'authorization_code', redirect_uri: redirectUri },
      onError: threadsError,
    })).data;
    if (!short?.access_token) throw new SocialGraphError('token', 'Threads did not give access. Try connecting again.');
    const long = await httpJson<{ access_token?: string; expires_in?: number }>('THREADS', `${HOST}/access_token`, {
      query: { grant_type: 'th_exchange_token', client_secret: app.clientSecret, access_token: short.access_token },
      onError: threadsError,
    }).then((r) => r.data).catch(() => null);
    return {
      accessToken: long?.access_token || short.access_token,
      expiresIn: long?.access_token ? long.expires_in ?? 60 * 86_400 : 3600,
      refreshToken: null,
      userId: short.user_id != null ? String(short.user_id) : null,
    };
  }

  async refresh(_app: PlatformApp, t: { accessToken: string }): Promise<TokenSet> {
    const r = (await httpJson<{ access_token?: string; expires_in?: number }>('THREADS', `${HOST}/refresh_access_token`, {
      query: { grant_type: 'th_refresh_token', access_token: t.accessToken },
      onError: threadsError,
    })).data;
    if (!r?.access_token) throw new SocialGraphError('token', 'Threads did not refresh the token. Reconnect the account.');
    return { accessToken: r.access_token, expiresIn: r.expires_in ?? 60 * 86_400, refreshToken: null };
  }

  async profile(token: string): Promise<ProfileInfo> {
    const me = await this.call<{ id: string; username?: string; name?: string; threads_profile_picture_url?: string }>('me', token, {
      query: { fields: 'id,username,name,threads_profile_picture_url' },
    });
    const ins = await this.call<{ data?: any[] }>(`${me.id}/threads_insights`, token, { query: { metric: 'followers_count' } }).catch(() => null);
    const f = ins?.data?.find((d) => d?.name === 'followers_count');
    return {
      externalId: String(me.id),
      name: me.name || (me.username ? `@${me.username}` : 'Threads'),
      handle: me.username ? `@${me.username}` : null,
      profileUrl: me.username ? `https://www.threads.com/@${me.username}` : null,
      avatarUrl: me.threads_profile_picture_url ?? null,
      followers: f ? n(f.total_value?.value ?? f.values?.[0]?.value) : null,
    };
  }

  /** FINISHED → true, IN_PROGRESS → false; ERROR / EXPIRED throw. */
  private async ready(token: string, id: string, tries: number, waitMs = 5_000): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
      const s = await this.call<{ status?: string; error_message?: string }>(id, token, { query: { fields: 'status,error_message' } });
      if (s?.status === 'FINISHED' || s?.status === 'PUBLISHED') return true;
      if (s?.status === 'ERROR' || s?.status === 'EXPIRED') {
        throw new SocialGraphError('media', `Threads could not use the media${s.error_message ? ` (${s.error_message})` : ''}. Use JPEG/PNG images, or an MP4 video up to 5 minutes.`);
      }
      if (i < tries - 1) await sleep(waitMs);
    }
    return false;
  }

  private async create(ctx: PublishContext, body: Record<string, string>): Promise<string> {
    const r = await this.call<{ id?: string }>(`${ctx.externalId}/threads`, ctx.accessToken, { method: 'POST', form: body });
    if (!r?.id) throw new SocialGraphError('unknown', 'Threads did not return an id for the new post.');
    return r.id;
  }

  private async finish(ctx: PublishContext, containerId: string): Promise<AdapterResult> {
    const r = await this.call<{ id?: string }>(`${ctx.externalId}/threads_publish`, ctx.accessToken, { method: 'POST', form: { creation_id: containerId } });
    if (!r?.id) throw new SocialGraphError('unknown', 'Threads did not return an id for the published post.');
    const link = await this.call<{ permalink?: string }>(r.id, ctx.accessToken, { query: { fields: 'permalink' } }).catch(() => null);
    return { postId: r.id, permalink: link?.permalink ?? null };
  }

  async publish(ctx: PublishContext): Promise<AdapterResult> {
    if (ctx.prev.status === 'WAITING' && ctx.prev.containerId) {
      if (await this.ready(ctx.accessToken, ctx.prev.containerId, 1)) return this.finish(ctx, ctx.prev.containerId);
      if (Date.now() - new Date(ctx.prev.at).getTime() > CONTAINER_TIMEOUT_MS) throw new SocialGraphError('media', 'Threads did not finish processing the video within an hour.');
      return { waiting: true, containerId: ctx.prev.containerId };
    }
    const route = threadsRoute(ctx.media);
    const text = ctx.text.trim();
    let containerId: string;
    if (route.type === 'TEXT') {
      containerId = await this.create(ctx, { media_type: 'TEXT', text, ...(ctx.link ? { link_attachment: ctx.link } : {}) });
    } else if (route.type !== 'CAROUSEL') {
      const m = route.items[0];
      containerId = await this.create(ctx, { media_type: route.type, [route.type === 'VIDEO' ? 'video_url' : 'image_url']: m.url, ...(text ? { text } : {}) });
    } else {
      const children: string[] = [];
      for (const m of route.items) {
        children.push(await this.create(ctx, { media_type: m.kind === 'video' ? 'VIDEO' : 'IMAGE', [m.kind === 'video' ? 'video_url' : 'image_url']: m.url, is_carousel_item: 'true' }));
      }
      for (const c of children) {
        if (!(await this.ready(ctx.accessToken, c, 12))) throw new SocialGraphError('transient', 'Threads is still processing a carousel item. Another try will happen on its own.');
      }
      containerId = await this.create(ctx, { media_type: 'CAROUSEL', children: children.join(','), ...(text ? { text } : {}) });
    }
    // Threads advises waiting for FINISHED before publishing (about 30 seconds for video).
    if (!(await this.ready(ctx.accessToken, containerId, route.type === 'TEXT' ? 3 : 6, route.type === 'TEXT' ? 2_000 : 5_000))) {
      return { waiting: true, containerId };
    }
    return this.finish(ctx, containerId);
  }

  async comment(ctx: PublishContext, postId: string, text: string): Promise<string | null> {
    const id = await this.create(ctx, { media_type: 'TEXT', text: text.slice(0, 500), reply_to_id: postId });
    await this.ready(ctx.accessToken, id, 4, 3_000);
    const r = await this.call<{ id?: string }>(`${ctx.externalId}/threads_publish`, ctx.accessToken, { method: 'POST', form: { creation_id: id } });
    return r?.id ?? null;
  }

  async metrics(token: string, _externalId: string, ids: string[]): Promise<Map<string, MetricValues>> {
    const out = new Map<string, MetricValues>();
    for (const id of ids) {
      const r = await this.call<{ data?: any[] }>(`${id}/insights`, token, { query: { metric: 'views,likes,replies,reposts,quotes,shares' } }).catch(() => null);
      if (!r?.data) continue;
      const v: Record<string, number> = {};
      for (const d of r.data) if (d?.name) v[d.name] = n(d.total_value?.value ?? d.values?.[0]?.value);
      out.set(id, {
        ...emptyMetrics(),
        reach: v.views ?? 0, impressions: v.views ?? 0, likes: v.likes ?? 0, comments: v.replies ?? 0,
        shares: (v.reposts ?? 0) + (v.quotes ?? 0) + (v.shares ?? 0), raw: { insights: v },
      });
    }
    return out;
  }
}
