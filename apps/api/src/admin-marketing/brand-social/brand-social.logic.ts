/**
 * Nafaa Social: rules with no I/O. Platform validation, UTM tagging, the post
 * status machine, the publisher's per-platform decisions and retry timing,
 * content pack parsing, settings defaults, and image / MP4 size reading.
 * Unit-tested in brand-social.spec.ts; the services add storage and HTTP.
 */

import { zonedToUtc } from '../../common/helpers/business-time.helper';
import type { MetaErrorKind, GraphErrorBody } from '../../integrations/meta/meta-graph';
import { platformTextLength } from './brand-social-oauth.logic';
import { normalizePostOptions, normalizeTikTokOptions, tiktokOptionIssues } from './brand-social-tiktok.logic';
import {
  API_PLATFORMS, BRAND_PLATFORMS, POST_KINDS, POST_STATUSES,
  type BrandPlatform, type BrandPostKind, type BrandPostStatus, type BrandSocialSettings, type ContentPack,
  type PlatformPublishState, type PostMediaItem, type PostOptions, type PostWarning, type PublishStateMap,
} from './brand-social.types';

export const isPlatform = (v: unknown): v is BrandPlatform => typeof v === 'string' && (BRAND_PLATFORMS as readonly string[]).includes(v);
export const isKind = (v: unknown): v is BrandPostKind => typeof v === 'string' && (POST_KINDS as readonly string[]).includes(v);
export const isStatus = (v: unknown): v is BrandPostStatus => typeof v === 'string' && (POST_STATUSES as readonly string[]).includes(v);
export const isApiPlatform = (p: BrandPlatform) => API_PLATFORMS.includes(p);

export const PLATFORM_LABEL: Record<BrandPlatform, string> = {
  FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', THREADS: 'Threads', TIKTOK: 'TikTok', YOUTUBE: 'YouTube', X: 'X',
  LINKEDIN: 'LinkedIn', PINTEREST: 'Pinterest', WHATSAPP_CHANNEL: 'WhatsApp channel', GOOGLE_BUSINESS: 'Google Business',
};

/** Accepts "facebook", "fb", "ig", "twitter" and the like from pack files. */
export function platformFrom(v: unknown): BrandPlatform | null {
  if (typeof v !== 'string') return null;
  const k = v.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (isPlatform(k)) return k;
  const alias: Record<string, BrandPlatform> = {
    FB: 'FACEBOOK', IG: 'INSTAGRAM', INSTA: 'INSTAGRAM', TWITTER: 'X', YT: 'YOUTUBE', LI: 'LINKEDIN', TT: 'TIKTOK',
    WHATSAPP: 'WHATSAPP_CHANNEL', GBP: 'GOOGLE_BUSINESS', GOOGLE: 'GOOGLE_BUSINESS', PIN: 'PINTEREST',
  };
  return alias[k] ?? null;
}

/* ───────────────────────── limits ───────────────────────── */

export const CAPTION_LIMITS: Record<BrandPlatform, number> = {
  FACEBOOK: 63_206, INSTAGRAM: 2_200, THREADS: 500, TIKTOK: 2_200, YOUTUBE: 5_000, X: 280,
  LINKEDIN: 3_000, PINTEREST: 500, WHATSAPP_CHANNEL: 4_096, GOOGLE_BUSINESS: 1_500,
};
export const HASHTAG_LIMITS: Partial<Record<BrandPlatform, number>> = { INSTAGRAM: 30, THREADS: 1, LINKEDIN: 10 };

export const UTM_SOURCE: Record<BrandPlatform, string> = {
  FACEBOOK: 'facebook', INSTAGRAM: 'instagram', THREADS: 'threads', TIKTOK: 'tiktok', YOUTUBE: 'youtube', X: 'x',
  LINKEDIN: 'linkedin', PINTEREST: 'pinterest', WHATSAPP_CHANNEL: 'whatsapp', GOOGLE_BUSINESS: 'google_business',
};

/** Platforms where a link in the text is clickable, so it goes under the caption. */
const LINK_IN_TEXT: readonly BrandPlatform[] = ['FACEBOOK', 'X', 'LINKEDIN', 'THREADS', 'WHATSAPP_CHANNEL', 'GOOGLE_BUSINESS', 'YOUTUBE', 'PINTEREST'];

/* ───────────────────────── codes and links ───────────────────────── */

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Short post tag without look-alike characters, e.g. "k7m2qp". */
export function newPostCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}

export function slugify(text: string, max = 50): string {
  return String(text ?? '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, max).replace(/-$/, '');
}

/**
 * Adds utm_source=<platform>, utm_medium=social, utm_campaign=<campaign> and
 * utm_content=<code>. A utm_campaign already on the link stays when the post
 * has no campaign. Non-http(s) values come back unchanged.
 */
export function tagLink(url: string, o: { platform: BrandPlatform; code: string; campaign?: string | null; medium?: string; defaultCampaign?: string }): string {
  let u: URL;
  try { u = new URL(String(url ?? '').trim()); } catch { return url; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
  const campaign = slugify(o.campaign ?? '') || u.searchParams.get('utm_campaign') || slugify(o.defaultCampaign ?? '') || 'nafaa-social';
  u.searchParams.set('utm_source', UTM_SOURCE[o.platform]);
  u.searchParams.set('utm_medium', (o.medium || 'social').trim() || 'social');
  u.searchParams.set('utm_campaign', campaign);
  u.searchParams.set('utm_content', o.code);
  return u.toString();
}

/** Hashtags with one leading #, no spaces, no repeats. */
export function cleanHashtags(list: unknown, max = 60): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    for (const part of raw.split(/[\s,]+/)) {
      const t = `#${part.replace(/^#+/, '').trim()}`;
      if (t.length > 1 && t.length <= 80 && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    }
  }
  return out.slice(0, max);
}

export interface TextSource {
  code: string;
  caption: string;
  captions?: Partial<Record<BrandPlatform, string>> | null;
  hashtags: string[];
  link?: string | null;
  campaign?: string | null;
  media?: Array<{ kind: string }>;
}

/** The UTM-tagged link for one platform, or null. */
export function linkFor(p: TextSource, platform: BrandPlatform, utm?: { medium?: string; defaultCampaign?: string }): string | null {
  if (!p.link?.trim()) return null;
  return tagLink(p.link.trim(), { platform, code: p.code, campaign: p.campaign, medium: utm?.medium, defaultCampaign: utm?.defaultCampaign });
}

/**
 * The full text for one platform: the platform's own caption (or the shared
 * one), the hashtags not already in it, and the tagged link where links are
 * clickable. Facebook text-only posts carry the link as a link post instead.
 */
export function textFor(p: TextSource, platform: BrandPlatform, utm?: { medium?: string; defaultCampaign?: string }): string {
  const own = p.captions?.[platform];
  const base = (typeof own === 'string' && own.trim() ? own : p.caption ?? '').trim();
  const inText = new Set((base.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.toLowerCase()));
  const tags = p.hashtags.filter((h) => !inText.has(h.toLowerCase())).join(' ');
  const parts = [base, tags].filter(Boolean);
  const link = linkFor(p, platform, utm);
  const linkPost = platform === 'FACEBOOK' && !(p.media ?? []).length;
  if (link && LINK_IN_TEXT.includes(platform) && !linkPost && !base.includes(link)) parts.push(link);
  return parts.join('\n\n');
}

const countHashtags = (text: string) => (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

/* ───────────────────────── validation ───────────────────────── */

export interface ValidationInput extends TextSource {
  kind: BrandPostKind;
  platforms: BrandPlatform[];
  media: PostMediaItem[];
  firstComment?: string | null;
  options?: PostOptions | null;
  /** The TikTok account posts directly, so the post's TikTok settings are required. */
  tiktokDirect?: boolean;
}

/** Problems per platform; level "error" means that platform will not publish as is. */
export function validatePost(p: ValidationInput, utm?: { medium?: string; defaultCampaign?: string }): PostWarning[] {
  const out: PostWarning[] = [];
  const add = (platform: BrandPlatform | null, level: PostWarning['level'], code: string, message: string) => out.push({ platform, level, code, message });
  const images = p.media.filter((m) => m.kind === 'image');
  const videos = p.media.filter((m) => m.kind === 'video');
  const video = videos[0];

  if (!p.platforms.length) add(null, 'error', 'no_platforms', 'Choose at least one platform.');
  if (!p.caption.trim() && !Object.values(p.captions ?? {}).some((c) => typeof c === 'string' && c.trim()) && !p.media.length) {
    add(null, 'error', 'empty', 'Add a caption or media.');
  }
  if (p.kind === 'CAROUSEL' && p.media.length < 2) add(null, 'warning', 'carousel_short', 'A carousel needs at least 2 items.');
  if ((p.kind === 'REEL' || p.kind === 'VIDEO') && !video) add(null, 'error', 'needs_video', 'A reel or video post needs a video.');

  for (const platform of p.platforms) {
    const name = PLATFORM_LABEL[platform];
    const text = textFor(p, platform, utm);
    const limit = CAPTION_LIMITS[platform];
    const length = platformTextLength(platform, text);
    if (length > limit) {
      const how = platform === 'X' ? ' (X counts each link as 23 and each emoji as 2)' : platform === 'THREADS' ? ' (Threads counts emoji by their bytes)' : '';
      add(platform, 'error', 'caption_long', `${name} allows ${limit.toLocaleString('en-US')} characters; this text has ${length.toLocaleString('en-US')}${how}.`);
    }
    const tagLimit = HASHTAG_LIMITS[platform];
    const tagCount = countHashtags(text);
    if (tagLimit && tagCount > tagLimit) add(platform, platform === 'INSTAGRAM' ? 'error' : 'warning', 'hashtags_many', `${name} allows ${tagLimit} hashtag${tagLimit === 1 ? '' : 's'}; this text has ${tagCount}.`);

    switch (platform) {
      case 'INSTAGRAM': {
        if (!p.media.length) { add(platform, 'error', 'needs_media', 'Instagram needs at least one image or video.'); break; }
        if (p.media.length > 10) add(platform, 'error', 'carousel_long', 'An Instagram carousel can have at most 10 items.');
        const reel = p.kind === 'REEL' || p.kind === 'VIDEO' || (!!video && !images.length);
        if (reel && video) {
          const d = video.durationSec ?? null;
          if (d != null && (d < 3 || d > 90)) add(platform, 'error', 'reel_length', `Instagram reels must be 3 to 90 seconds; this video is ${Math.round(d)} s.`);
          const r = ratio(video);
          if (r != null && Math.abs(r - 9 / 16) > 0.02) add(platform, 'warning', 'reel_ratio', 'Reels look best at 9:16 (for example 1080 x 1920).');
        } else if (p.kind === 'STORY') {
          const r = ratio(p.media[0]);
          if (r != null && Math.abs(r - 9 / 16) > 0.05) add(platform, 'warning', 'story_ratio', 'Stories look best at 9:16.');
        } else {
          for (const [i, m] of images.entries()) {
            const r = ratio(m);
            if (r != null && (r < 0.8 - 0.005 || r > 1.91 + 0.005)) {
              add(platform, 'error', 'image_ratio', `Image ${i + 1} is ${r.toFixed(2)}:1; Instagram feed images must be between 4:5 and 1.91:1.`);
            }
          }
          if (images.length > 1 && videos.length) add(platform, 'warning', 'carousel_video', 'Auto-publish sends the images of a mixed carousel only; videos are left out.');
        }
        break;
      }
      case 'FACEBOOK':
        if (p.media.length > 10) add(platform, 'warning', 'too_many', 'Facebook takes the first 10 images.');
        if (images.length && videos.length) add(platform, 'warning', 'mixed_media', 'Facebook posts the video only when a post has both images and a video.');
        break;
      case 'X':
        if (videos.length > 1 || (videos.length && images.length) || images.length > 4) add(platform, 'warning', 'x_media', 'X takes up to 4 images or 1 video.');
        break;
      case 'TIKTOK':
        if (!video && !images.length) add(platform, 'error', 'needs_media', 'TikTok needs a video or photos.');
        else if (!video) add(platform, 'warning', 'tiktok_photos', 'TikTok takes photo posts only from a verified domain; if it refuses, the post goes to "To post by hand".');
        if (p.tiktokDirect) {
          for (const i of tiktokOptionIssues(normalizeTikTokOptions(p.options?.tiktok), { photo: !video, durationSec: video?.durationSec })) add(platform, 'error', i.code, i.message);
        }
        break;
      case 'YOUTUBE':
        if (p.kind !== 'VIDEO' && p.kind !== 'REEL') add(platform, 'warning', 'youtube_kind', 'YouTube takes video and reel posts only; set the kind to Video or Reel, or this post is skipped there.');
        if (!video) add(platform, 'error', 'needs_video', 'YouTube needs a video.');
        else if (p.kind === 'REEL' && (video.durationSec ?? 0) > 180) add(platform, 'warning', 'short_length', 'YouTube Shorts are up to 3 minutes.');
        break;
      case 'PINTEREST':
        if (!p.media.length) add(platform, 'error', 'needs_media', 'Pinterest needs an image or video.');
        else if (!video && images.length > 5) add(platform, 'warning', 'too_many', 'Pinterest takes up to 5 images in one pin; the rest are left out.');
        break;
      case 'THREADS':
        if (p.media.length > 20) add(platform, 'warning', 'too_many', 'Threads takes up to 20 items in a carousel.');
        break;
      case 'LINKEDIN':
        if (p.media.length > 20) add(platform, 'warning', 'too_many', 'LinkedIn takes up to 20 images.');
        break;
      default:
        break;
    }
  }
  if (p.firstComment && p.firstComment.length > 2_200) add(null, 'warning', 'comment_long', 'The first comment is longer than 2,200 characters.');
  return out;
}

const ratio = (m: { width?: number | null; height?: number | null } | undefined) =>
  m?.width && m?.height && m.width > 0 && m.height > 0 ? m.width / m.height : null;

/** TikTok settings problems: they block approving, scheduling and publishing now. */
export const tiktokSettingErrors = (w: PostWarning[]) => w.filter((x) => x.level === 'error' && x.platform === 'TIKTOK' && x.code.startsWith('tiktok_'));

export const blockingErrors = (w: PostWarning[], platform?: BrandPlatform) =>
  w.filter((x) => x.level === 'error' && (platform ? x.platform === platform || x.platform === null : true));

/* ───────────────────────── status machine ───────────────────────── */

export const TRANSITIONS: Record<BrandPostStatus, readonly BrandPostStatus[]> = {
  IDEA: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'ARCHIVED'],
  DRAFT: ['IDEA', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'ARCHIVED'],
  IN_REVIEW: ['DRAFT', 'APPROVED', 'SCHEDULED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHING', 'ARCHIVED'],
  SCHEDULED: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHING', 'ARCHIVED'],
  PUBLISHING: ['PUBLISHED', 'PARTIAL', 'FAILED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  PARTIAL: ['PUBLISHING', 'PUBLISHED', 'ARCHIVED'],
  FAILED: ['DRAFT', 'SCHEDULED', 'PUBLISHING', 'ARCHIVED'],
  REJECTED: ['DRAFT', 'IN_REVIEW', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

export const canTransition = (from: BrandPostStatus, to: BrandPostStatus) => from === to || TRANSITIONS[from].includes(to);

/** Statuses whose content can still be edited. */
export const EDITABLE: readonly BrandPostStatus[] = ['IDEA', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'FAILED', 'REJECTED'];

/** Where an approval lands: SCHEDULED when the post has a future time, else APPROVED. */
export const approvedStatus = (scheduledAt: Date | null | undefined): BrandPostStatus => (scheduledAt ? 'SCHEDULED' : 'APPROVED');

/**
 * Status after a content edit. Approved or scheduled posts go back to review
 * when approval is required; a rejected or failed post becomes a draft again.
 */
export function statusAfterEdit(current: BrandPostStatus, requireApproval: boolean): BrandPostStatus {
  if ((current === 'APPROVED' || current === 'SCHEDULED') && requireApproval) return 'IN_REVIEW';
  if (current === 'REJECTED' || current === 'FAILED') return 'DRAFT';
  return current;
}

/* ───────────────────────── publisher ───────────────────────── */

/** Minutes to wait before try 2, 3 and 4 of a transient failure. */
export const RETRY_MINUTES = [5, 15, 60] as const;
export const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;
/** A post more than this late when first picked up is not published on its own. */
export const MISSED_WINDOW_MS = 24 * 3600_000;
/** An Instagram video still processing after this long fails. */
export const CONTAINER_WAIT_MS = 60 * 60_000;
/** A platform stuck in PUBLISHING (a crash mid-run) is looked at again after this. */
export const STUCK_MS = 10 * 60_000;

/** Time of the next try after `attempts` failed tries, or null when it should stop. */
export function retryAt(attempts: number, retryable: boolean, now = Date.now()): Date | null {
  if (!retryable || attempts >= MAX_ATTEMPTS) return null;
  return new Date(now + RETRY_MINUTES[Math.max(0, attempts - 1)] * 60_000);
}

export const missedWindow = (scheduledAt: Date | null | undefined, now = Date.now()) =>
  !!scheduledAt && now - scheduledAt.getTime() > MISSED_WINDOW_MS;

export interface AccountForDispatch { platform: string; status: string; autoPublish: boolean }

export type DispatchAction = { action: 'auto' } | { action: 'handoff' } | { action: 'fail'; error: string };

/**
 * What the publisher does for one platform: publish through the API (a
 * connected account of an API platform with auto-publish on), hand it to a
 * person (manual platforms, or auto-publish off), or fail with a reason.
 */
export function dispatchFor(platform: BrandPlatform, accounts: AccountForDispatch[]): DispatchAction {
  const live = accounts.filter((a) => a.platform === platform && a.status !== 'DISCONNECTED');
  if (!isApiPlatform(platform)) return { action: 'handoff' };
  const auto = live.find((a) => a.autoPublish);
  if (!auto) return { action: 'handoff' };
  if (auto.status === 'NEEDS_RECONNECT') return { action: 'fail', error: `${PLATFORM_LABEL[platform]} needs to be reconnected (Accounts page) before posts can go out.` };
  if (auto.status !== 'CONNECTED') return { action: 'handoff' };
  return { action: 'auto' };
}

/** Platforms the publisher should work on now. */
export function duePlatforms(platforms: BrandPlatform[], state: PublishStateMap, now = Date.now()): BrandPlatform[] {
  return platforms.filter((p) => {
    const s = state[p];
    if (!s) return true;
    if (s.status === 'PUBLISHED' || s.status === 'HANDOFF' || s.status === 'SKIPPED') return false;
    if (s.status === 'PUBLISHING') return now - new Date(s.at).getTime() > STUCK_MS;
    if (s.status === 'FAILED' && !s.willRetry) return false;
    return !s.nextAt || new Date(s.nextAt).getTime() <= now;
  });
}

/**
 * The post status from its platform states, and when the publisher should
 * look again:
 * - every platform published (or skipped, at least one published) → PUBLISHED;
 * - anything still in progress (publishing, video processing, a planned retry,
 *   or waiting to be posted by hand) → PUBLISHING;
 * - otherwise some published → PARTIAL, none → FAILED.
 */
export function summarize(platforms: BrandPlatform[], state: PublishStateMap): { status: BrandPostStatus; nextRunAt: Date | null } {
  const list = platforms.map((p) => state[p]).filter((s): s is PlatformPublishState => !!s);
  let next: number | null = null;
  for (const s of list) {
    if (s.status === 'WAITING' || (s.status === 'FAILED' && s.willRetry)) {
      const t = s.nextAt ? new Date(s.nextAt).getTime() : Date.now();
      next = next == null ? t : Math.min(next, t);
    }
    if (s.status === 'PUBLISHING') {
      const t = new Date(s.at).getTime() + STUCK_MS;
      next = next == null ? t : Math.min(next, t);
    }
  }
  const nextRunAt = next == null ? null : new Date(next);
  if (list.length < platforms.length) return { status: 'PUBLISHING', nextRunAt: nextRunAt ?? new Date() };
  const published = list.filter((s) => s.status === 'PUBLISHED').length;
  const skipped = list.filter((s) => s.status === 'SKIPPED').length;
  if (published > 0 && published + skipped === list.length) return { status: 'PUBLISHED', nextRunAt: null };
  const open = list.some((s) => s.status === 'PUBLISHING' || s.status === 'WAITING' || s.status === 'HANDOFF' || (s.status === 'FAILED' && s.willRetry));
  if (open) return { status: 'PUBLISHING', nextRunAt };
  if (published > 0) return { status: 'PARTIAL', nextRunAt: null };
  // Every platform skipped by the team: the post is shelved.
  return { status: skipped === list.length ? 'ARCHIVED' : 'FAILED', nextRunAt: null };
}

/** English text for a Graph failure (the merchant helpers speak Roman Urdu). */
export function metaErrorText(kind: MetaErrorKind | string, e?: GraphErrorBody | null): string {
  switch (kind) {
    case 'token': return 'The Facebook connection has expired or was removed. Reconnect it on the Accounts page.';
    case 'permission': return 'Facebook did not allow this. Reconnect and allow every permission asked for.';
    case 'rate_limit': return 'Facebook asked us to slow down. Another try will happen on its own.';
    case 'transient': return 'Facebook did not answer. Another try will happen on its own.';
    case 'media': return `Facebook could not use the image or video${e?.error_user_msg ? ` (${e.error_user_msg})` : ''}. Check its size and format.`;
    case 'not_found': return 'This item no longer exists on Facebook.';
    case 'not_configured': return 'The Meta app is not set up on the server (META_APP_ID / META_APP_SECRET).';
    case 'paused': return 'Publishing is paused.';
    default: {
      const msg = e?.error_user_msg || e?.message;
      return msg ? `Facebook refused: ${String(msg).slice(0, 240)}` : 'Facebook refused the request.';
    }
  }
}

/* ───────────────────────── dates ───────────────────────── */

const PKT = 'Asia/Karachi';

/**
 * Reads a date-time from a pack or form. A value with a zone (Z or +05:00)
 * is taken as is; "2026-12-01T19:30" or "2026-12-01 19:30" is Pakistan time;
 * a bare date is 12:00 Pakistan time. Returns null when unreadable.
 */
export function parsePktDateTime(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const out = zonedToUtc(+y, +mo, +d, h != null ? +h : 12, mi != null ? +mi : 0, se != null ? +se : 0, PKT);
  return Number.isNaN(out.getTime()) ? null : out;
}

/* ───────────────────────── content pack ───────────────────────── */

export interface ParsedPackPost {
  index: number;
  title: string;
  kind: BrandPostKind;
  pillar: string | null;
  caption: string;
  captions: Partial<Record<BrandPlatform, string>>;
  hashtags: string[];
  firstComment: string | null;
  link: string | null;
  platforms: BrandPlatform[];
  scheduledAt: Date | null;
  media: string[];
  notes: string | null;
  options: PostOptions;
}

export interface ParsedPack {
  campaign: string | null;
  posts: ParsedPackPost[];
  skipped: Array<{ index: number; title: string; reason: string }>;
}

export const PACK_MAX_POSTS = 400;

/** Last part of a path, lower case: how pack media names are matched to zip entries. */
export const fileKey = (name: string) => String(name ?? '').replace(/\\/g, '/').split('/').pop()!.trim().toLowerCase();

/**
 * Checks pack.json. `files` holds the media names found in the zip (any
 * folder, matched by file name). Posts with missing media, unknown
 * platforms or a bad date are skipped with a reason; the rest come back clean.
 */
export function parsePack(raw: unknown, files: Set<string>, now = Date.now()): ParsedPack {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('pack.json must be a JSON object with a "posts" list.');
  const pack = raw as Partial<ContentPack>;
  if (!Array.isArray(pack.posts)) throw new Error('pack.json has no "posts" list.');
  if (pack.posts.length > PACK_MAX_POSTS) throw new Error(`pack.json has ${pack.posts.length} posts; the limit is ${PACK_MAX_POSTS} per import.`);
  const campaign = typeof pack.campaign === 'string' && pack.campaign.trim() ? pack.campaign.trim().slice(0, 120) : null;
  const posts: ParsedPackPost[] = [];
  const skipped: ParsedPack['skipped'] = [];
  const keys = new Set([...files].map(fileKey));

  pack.posts.forEach((p, index) => {
    const title = typeof p?.title === 'string' ? p.title.trim().slice(0, 200) : '';
    const skip = (reason: string) => skipped.push({ index, title: title || `Post ${index + 1}`, reason });
    if (!p || typeof p !== 'object') return skip('Not an object.');
    const rawPlatforms = Array.isArray(p.platforms) ? p.platforms : [];
    const platforms = [...new Set(rawPlatforms.map(platformFrom).filter((x): x is BrandPlatform => !!x))];
    const unknown = rawPlatforms.filter((x) => !platformFrom(x));
    if (!platforms.length) return skip(unknown.length ? `Unknown platforms: ${unknown.join(', ')}.` : 'No platforms.');
    const kindRaw = typeof p.kind === 'string' ? p.kind.trim().toUpperCase() : 'POST';
    const kind: BrandPostKind = isKind(kindRaw) ? kindRaw : kindRaw === 'IMAGE' || kindRaw === 'PHOTO' ? 'POST' : kindRaw === 'SHORT' ? 'REEL' : 'POST';
    let scheduledAt: Date | null = null;
    if (p.scheduledAt != null && p.scheduledAt !== '') {
      scheduledAt = parsePktDateTime(p.scheduledAt);
      if (!scheduledAt) return skip(`Unreadable scheduledAt "${String(p.scheduledAt)}".`);
      if (scheduledAt.getTime() < now - 60_000) return skip(`scheduledAt ${String(p.scheduledAt)} is in the past.`);
    }
    const media = (Array.isArray(p.media) ? p.media : []).filter((m): m is string => typeof m === 'string' && !!m.trim());
    const missing = media.filter((m) => !keys.has(fileKey(m)));
    if (missing.length) return skip(`Media not in the zip: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}.`);
    const captions: Partial<Record<BrandPlatform, string>> = {};
    if (p.captions && typeof p.captions === 'object') {
      for (const [k, v] of Object.entries(p.captions)) {
        const pk = platformFrom(k);
        if (pk && typeof v === 'string' && v.trim()) captions[pk] = v;
      }
    }
    const caption = typeof p.caption === 'string' ? p.caption : '';
    if (!caption.trim() && !Object.keys(captions).length && !media.length) return skip('No caption and no media.');
    posts.push({
      index,
      title: title || caption.split('\n')[0].slice(0, 80) || `Post ${index + 1}`,
      kind,
      pillar: typeof p.pillar === 'string' && p.pillar.trim() ? p.pillar.trim().slice(0, 60) : null,
      caption,
      captions,
      hashtags: cleanHashtags(p.hashtags),
      firstComment: typeof p.firstComment === 'string' && p.firstComment.trim() ? p.firstComment : null,
      link: typeof p.link === 'string' && /^https?:\/\//i.test(p.link.trim()) ? p.link.trim() : null,
      platforms,
      scheduledAt,
      media,
      notes: typeof p.notes === 'string' && p.notes.trim() ? p.notes.slice(0, 4000) : null,
      options: normalizePostOptions(p.options),
    });
  });
  return { campaign, posts, skipped };
}

/* ───────────────────────── settings ───────────────────────── */

export const DEFAULT_SETTINGS: BrandSocialSettings = {
  timezone: PKT,
  requireApproval: true,
  autoApproveAiDrafts: false,
  paused: false,
  pausedAt: null,
  bestTimes: {
    FACEBOOK: ['13:00', '20:30'], INSTAGRAM: ['12:30', '21:00'], TIKTOK: ['19:00', '22:00'], YOUTUBE: ['18:00'],
    X: ['10:00', '17:00'], LINKEDIN: ['09:30', '12:00'], THREADS: ['13:00', '21:00'], PINTEREST: ['20:00'],
    WHATSAPP_CHANNEL: ['11:00', '19:30'], GOOGLE_BUSINESS: ['11:00'],
  },
  hashtagSets: [
    { name: 'Brand', tags: ['#Nafaa', '#NafaaPK', '#PakistanBusiness'] },
    { name: 'Retail', tags: ['#POS', '#RetailPakistan', '#SmallBusiness', '#ShopOwner'] },
  ],
  pillars: [
    { key: 'product', label: 'Product', color: '#2563eb' },
    { key: 'education', label: 'Tips & how-to', color: '#16a34a' },
    { key: 'customers', label: 'Customer stories', color: '#d97706' },
    { key: 'offers', label: 'Offers', color: '#dc2626' },
    { key: 'culture', label: 'Behind the scenes', color: '#7c3aed' },
  ],
  campaigns: [],
  brandVoice: 'Friendly, clear and practical. We help Pakistani shop owners run their business with Nafaa (POS, stock, khata, online store). Simple words, no hype, no fake claims. English or Roman Urdu.',
  utm: { medium: 'social', defaultCampaign: 'nafaa-social' },
  adAccountId: '1154105040370350',
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Settings with defaults filled and anything malformed dropped. */
export function normalizeSettings(raw: unknown, base: BrandSocialSettings = DEFAULT_SETTINGS): BrandSocialSettings {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const bool = (k: keyof BrandSocialSettings) => (typeof r[k] === 'boolean' ? r[k] : base[k]) as boolean;
  const bestTimes: BrandSocialSettings['bestTimes'] = {};
  const srcTimes = r.bestTimes && typeof r.bestTimes === 'object' ? r.bestTimes : base.bestTimes;
  for (const [k, v] of Object.entries(srcTimes ?? {})) {
    if (!isPlatform(k) || !Array.isArray(v)) continue;
    bestTimes[k] = [...new Set(v.filter((t): t is string => typeof t === 'string' && TIME.test(t)))].sort().slice(0, 8);
  }
  const hashtagSets = Array.isArray(r.hashtagSets)
    ? r.hashtagSets.map((s: any) => ({ name: str(s?.name, 60), tags: cleanHashtags(s?.tags, 30) })).filter((s: any) => s.name && s.tags.length).slice(0, 40)
    : base.hashtagSets;
  const pillars = Array.isArray(r.pillars)
    ? r.pillars.map((p: any) => ({
        key: slugify(str(p?.key, 40) || str(p?.label, 40), 40), label: str(p?.label, 60) || str(p?.key, 60),
        color: COLOR.test(String(p?.color ?? '')) ? String(p.color).toLowerCase() : '#64748b',
      })).filter((p: any) => p.key && p.label).slice(0, 20)
    : base.pillars;
  const campaigns = Array.isArray(r.campaigns)
    ? r.campaigns.map((c: any) => ({
        key: slugify(str(c?.key, 50) || str(c?.label, 50)), label: str(c?.label, 80) || str(c?.key, 80),
        color: COLOR.test(String(c?.color ?? '')) ? String(c.color).toLowerCase() : null, active: c?.active !== false,
      })).filter((c: any) => c.key && c.label).slice(0, 100)
    : base.campaigns;
  const paused = bool('paused');
  const ad = typeof r.adAccountId === 'string' || typeof r.adAccountId === 'number' ? String(r.adAccountId).replace(/^act_/, '').replace(/\D/g, '') : undefined;
  return {
    timezone: PKT,
    requireApproval: bool('requireApproval'),
    autoApproveAiDrafts: bool('autoApproveAiDrafts'),
    paused,
    pausedAt: paused ? (typeof r.pausedAt === 'string' ? r.pausedAt : base.pausedAt ?? null) : null,
    bestTimes,
    hashtagSets,
    pillars: dedupe(pillars, (p) => p.key),
    campaigns: dedupe(campaigns, (c) => c.key),
    brandVoice: typeof r.brandVoice === 'string' ? r.brandVoice.slice(0, 3000) : base.brandVoice,
    utm: {
      medium: slugify(str(r.utm?.medium, 40)) || base.utm.medium,
      defaultCampaign: slugify(str(r.utm?.defaultCampaign, 50)) || base.utm.defaultCampaign,
    },
    adAccountId: ad === undefined ? base.adAccountId : ad || null,
  };
}

function dedupe<T>(list: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

/* ───────────────────────── media files ───────────────────────── */

export interface MediaInfo { kind: 'image' | 'video'; mime: string; width: number | null; height: number | null; durationSec: number | null }

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

/**
 * File type and size from the first bytes: JPEG, PNG, WebP and GIF images
 * (width / height) and MP4 / MOV videos (width, height, duration). Null for
 * anything else.
 */
export function readMediaInfo(b: Uint8Array): MediaInfo | null {
  if (b.length < 16) return null;
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return { kind: 'image', mime: 'image/png', width: u32be(b, 16), height: u32be(b, 20), durationSec: null };
  if (ascii(b, 0, 4) === 'GIF8') return { kind: 'image', mime: 'image/gif', width: u16le(b, 6), height: u16le(b, 8), durationSec: null };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') {
    const chunk = ascii(b, 12, 4);
    let width: number | null = null;
    let height: number | null = null;
    if (chunk === 'VP8X') { width = u24le(b, 24) + 1; height = u24le(b, 27) + 1; }
    else if (chunk === 'VP8 ') { width = u16le(b, 26) & 0x3fff; height = u16le(b, 28) & 0x3fff; }
    else if (chunk === 'VP8L') { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); width = (v & 0x3fff) + 1; height = ((v >> 14) & 0x3fff) + 1; }
    return { kind: 'image', mime: 'image/webp', width, height, durationSec: null };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = u16be(b, i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { kind: 'image', mime: 'image/jpeg', width: u16be(b, i + 7), height: u16be(b, i + 5), durationSec: null };
      }
      i += 2 + len;
    }
    return { kind: 'image', mime: 'image/jpeg', width: null, height: null, durationSec: null };
  }
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    const info = mp4Info(b);
    return { kind: 'video', mime: brand === 'qt  ' ? 'video/quicktime' : 'video/mp4', ...info };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { kind: 'video', mime: 'video/webm', width: null, height: null, durationSec: null };
  return null;
}

/** Width, height and duration from an MP4 / MOV "moov" box (the first video track). */
export function mp4Info(b: Uint8Array): { width: number | null; height: number | null; durationSec: number | null } {
  const out = { width: null as number | null, height: null as number | null, durationSec: null as number | null };
  const walk = (start: number, end: number, depth: number) => {
    let i = start;
    while (i + 8 <= end && depth < 8) {
      let size = u32be(b, i);
      const type = ascii(b, i + 4, 4);
      let header = 8;
      if (size === 1 && i + 16 <= end) { size = u32be(b, i + 8) * 2 ** 32 + u32be(b, i + 12); header = 16; }
      if (size === 0) size = end - i;
      if (size < header) break;
      const boxEnd = Math.min(end, i + size);
      if (type === 'moov' || type === 'trak' || type === 'mdia') walk(i + header, boxEnd, depth + 1);
      else if (type === 'mvhd' && out.durationSec == null) {
        const v = b[i + header];
        const timescale = v === 1 ? u32be(b, i + header + 20) : u32be(b, i + header + 12);
        const duration = v === 1 ? u32be(b, i + header + 24) * 2 ** 32 + u32be(b, i + header + 28) : u32be(b, i + header + 16);
        if (timescale > 0) out.durationSec = Math.round((duration / timescale) * 100) / 100;
      } else if (type === 'tkhd' && out.width == null) {
        const v = b[i + header];
        const off = i + header + (v === 1 ? 88 : 76);
        if (off + 8 <= boxEnd) {
          const w = u32be(b, off) / 65536;
          const h = u32be(b, off + 4) / 65536;
          if (w > 0 && h > 0) { out.width = Math.round(w); out.height = Math.round(h); }
        }
      }
      if (boxEnd <= i) break;
      i = boxEnd;
    }
  };
  walk(0, b.length, 0);
  return out;
}

/** Mime type from a file name, for files whose bytes did not say. */
export function mimeFromName(name: string): string | null {
  const ext = fileKey(name).split('.').pop() ?? '';
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/mp4' } as Record<string, string>)[ext] ?? null;
}

/* ───────────────────────── analytics ───────────────────────── */

export const engagementOf = (m: { likes?: number; comments?: number; shares?: number; saves?: number }) =>
  (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);

export const rate = (engagement: number, reach: number) => (reach > 0 ? Math.round((engagement / reach) * 10_000) / 100 : 0);
