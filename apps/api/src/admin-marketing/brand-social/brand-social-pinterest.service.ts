/**
 * Pinterest adapter (API v5). OAuth at www.pinterest.com/oauth/, tokens at
 * api.pinterest.com/v5/oauth/token with Basic auth; refresh tokens rotate, so
 * the new one is kept every time. Pins go to the board picked on the
 * Accounts page: one image (image_url), 2 to 5 images (multiple_image_urls),
 * or a video through the media upload flow (register, upload to the address
 * Pinterest gives, wait for "succeeded", then create the pin).
 */

import { Injectable } from '@nestjs/common';
import { SocialGraphError } from './brand-social-graph.service';
import { pinterestRoute } from './brand-social-oauth.logic';
import {
  AdapterResult, CONTAINER_TIMEOUT_MS, emptyMetrics, httpJson, HttpOptions, mediaHead, mediaRange, MetricValues, n, PlatformApp, platformError,
  ProfileInfo, PublishContext, sleep, SocialAdapter, TokenSet, videoMime,
} from './brand-social-adapter';

const API = 'https://api.pinterest.com/v5';
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class BrandSocialPinterestService implements SocialAdapter {
  readonly platform = 'PINTEREST' as const;

  private call<T = any>(path: string, token: string, o: HttpOptions = {}) {
    return httpJson<T>('PINTEREST', `${API}/${path}`, { ...o, bearer: token }).then((r) => r.data);
  }

  private async token(app: PlatformApp, form: Record<string, string>): Promise<TokenSet> {
    const r = (await httpJson<any>('PINTEREST', `${API}/oauth/token`, { method: 'POST', form, basic: [app.clientId, app.clientSecret] })).data;
    if (!r?.access_token) throw new SocialGraphError('token', 'Pinterest did not give access. Try connecting again.');
    return {
      accessToken: r.access_token, refreshToken: r.refresh_token ?? null, expiresIn: r.expires_in ?? null, refreshExpiresIn: r.refresh_token_expires_in ?? null,
      scopes: String(r.scope ?? '').split(/[ ,]+/).filter(Boolean),
    };
  }

  exchangeCode(app: PlatformApp, code: string, redirectUri: string): Promise<TokenSet> {
    return this.token(app, { grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  }

  refresh(app: PlatformApp, t: { refreshToken: string | null }): Promise<TokenSet> {
    if (!t.refreshToken) throw new SocialGraphError('token', 'Pinterest gave no refresh token. Reconnect Pinterest.');
    return this.token(app, { grant_type: 'refresh_token', refresh_token: t.refreshToken });
  }

  async profile(token: string): Promise<ProfileInfo> {
    const u = await this.call<{ username?: string; business_name?: string; profile_image?: string; follower_count?: number; id?: string }>('user_account', token);
    if (!u?.username) throw new SocialGraphError('unknown', 'Pinterest did not return the account.');
    return {
      externalId: String(u.id ?? u.username).toLowerCase(),
      name: u.business_name || `@${u.username}`,
      handle: `@${u.username}`,
      profileUrl: `https://www.pinterest.com/${u.username}/`,
      avatarUrl: u.profile_image ?? null,
      followers: typeof u.follower_count === 'number' ? u.follower_count : null,
    };
  }

  /** Boards for the account settings (first 250). */
  async boards(token: string): Promise<Array<{ id: string; name: string }>> {
    const out: Array<{ id: string; name: string }> = [];
    let bookmark: string | undefined;
    for (let i = 0; i < 10; i++) {
      const r = await this.call<{ items?: Array<{ id: string; name: string }>; bookmark?: string | null }>('boards', token, { query: { page_size: 25, bookmark } });
      for (const b of r.items ?? []) out.push({ id: String(b.id), name: String(b.name ?? '') });
      if (!r.bookmark) break;
      bookmark = r.bookmark;
    }
    return out;
  }

  private pinBody(ctx: PublishContext, media_source: Record<string, unknown>) {
    const first = ctx.media[0];
    return {
      board_id: ctx.settings.pinterestBoardId,
      title: (ctx.post.title || ctx.textNoLink.split('\n')[0]).slice(0, 100),
      description: ctx.textNoLink.slice(0, 500),
      ...(ctx.link ? { link: ctx.link } : {}),
      ...(first?.alt ? { alt_text: first.alt.slice(0, 500) } : {}),
      media_source,
    };
  }

  private async createPin(ctx: PublishContext, media_source: Record<string, unknown>): Promise<AdapterResult> {
    const pin = await this.call<{ id?: string }>('pins', ctx.accessToken, { method: 'POST', json: this.pinBody(ctx, media_source) });
    if (!pin?.id) throw new SocialGraphError('unknown', 'Pinterest did not return an id for the new pin.');
    return { postId: String(pin.id), permalink: `https://www.pinterest.com/pin/${pin.id}/` };
  }

  /** "video:<media id>" containers: create the pin once the upload is processed. */
  private async videoReady(ctx: PublishContext, mediaId: string, tries: number): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
      const s = await this.call<{ status?: string }>(`media/${mediaId}`, ctx.accessToken);
      if (s?.status === 'succeeded') return true;
      if (s?.status === 'failed') throw new SocialGraphError('media', 'Pinterest could not process the video. Use an MP4 or MOV, 4 seconds to 15 minutes, under 2 GB.');
      if (i < tries - 1) await sleep(5_000);
    }
    return false;
  }

  private videoSource(ctx: PublishContext, mediaId: string) {
    const cover = ctx.media.find((m) => m.kind === 'image')?.url ?? ctx.media.find((m) => m.kind === 'video')?.thumbUrl ?? null;
    return { source_type: 'video_id', media_id: mediaId, ...(cover ? { cover_image_url: cover } : { cover_image_key_frame_time: 1 }) };
  }

  async publish(ctx: PublishContext): Promise<AdapterResult> {
    if (!ctx.settings.pinterestBoardId) throw new SocialGraphError('setup', 'Pick a Pinterest board for this account on the Accounts page.');
    if (ctx.prev.status === 'WAITING' && ctx.prev.containerId?.startsWith('video:')) {
      const mediaId = ctx.prev.containerId.slice(6);
      if (await this.videoReady(ctx, mediaId, 1)) return this.createPin(ctx, this.videoSource(ctx, mediaId));
      if (Date.now() - new Date(ctx.prev.at).getTime() > CONTAINER_TIMEOUT_MS) throw new SocialGraphError('media', 'Pinterest did not finish processing the video within an hour.');
      return { waiting: true, containerId: ctx.prev.containerId };
    }
    const route = pinterestRoute(ctx.media);
    if (!route.ok) throw new SocialGraphError('media', route.reason);
    if (!route.video) {
      if (route.images.length === 1) return this.createPin(ctx, { source_type: 'image_url', url: route.images[0].url });
      return this.createPin(ctx, {
        source_type: 'multiple_image_urls',
        items: route.images.map((m) => ({ url: m.url, ...(m.alt ? { description: m.alt.slice(0, 500) } : {}) })),
      });
    }

    // Video: register, upload to the given address with its form fields, wait, then pin.
    const reg = await this.call<{ media_id?: string; upload_url?: string; upload_parameters?: Record<string, string> }>('media', ctx.accessToken, { method: 'POST', json: { media_type: 'video' } });
    if (!reg?.media_id || !reg.upload_url) throw new SocialGraphError('unknown', 'Pinterest did not give a video upload address.');
    const head = await mediaHead('PINTEREST', route.video.url);
    const file = await mediaRange(route.video.url, 0, head.size - 1);
    const form = new FormData();
    for (const [k, v] of Object.entries(reg.upload_parameters ?? {})) form.set(k, String(v));
    form.set('file', new Blob([new Uint8Array(file)], { type: videoMime(route.video.url, head.type) }), 'video.mp4');
    const up = await fetch(reg.upload_url, { method: 'POST', body: form, signal: AbortSignal.timeout(20 * 60_000) })
      .catch((e) => { throw new SocialGraphError('transient', `Pinterest video upload failed (${(e as Error).message}).`); });
    if (!up.ok) throw platformError('PINTEREST', up.status, { message: (await up.text().catch(() => '')).slice(0, 200) });
    if (await this.videoReady(ctx, reg.media_id, 6)) return this.createPin(ctx, this.videoSource(ctx, reg.media_id));
    return { waiting: true, containerId: `video:${reg.media_id}` };
  }

  async metrics(token: string, _externalId: string, ids: string[]): Promise<Map<string, MetricValues>> {
    const out = new Map<string, MetricValues>();
    const end = new Date();
    const start = new Date(end.getTime() - 89 * 86_400_000);
    for (const id of ids) {
      const r = await this.call<Record<string, { summary_metrics?: Record<string, number>; lifetime_metrics?: Record<string, number> }>>(`pins/${id}/analytics`, token, {
        query: { start_date: dayKey(start), end_date: dayKey(end), metric_types: 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK,VIDEO_MRC_VIEW' },
      }).catch(() => null);
      const s = r?.all?.lifetime_metrics ?? r?.all?.summary_metrics;
      if (!s) continue;
      out.set(id, {
        ...emptyMetrics(), impressions: n(s.IMPRESSION), reach: n(s.IMPRESSION), saves: n(s.SAVE), clicks: n(s.OUTBOUND_CLICK) + n(s.PIN_CLICK),
        plays: n(s.VIDEO_MRC_VIEW), raw: { analytics: s },
      });
    }
    return out;
  }
}
