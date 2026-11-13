/**
 * Caption, link and validation helpers shared by the composer, previews,
 * approvals and the hand-posting queue. The checks mirror the API's
 * per-platform validation so problems show while typing; the API's own
 * warnings are still shown when a post is saved.
 */

import type { PostKind, PostMedia, SocialPlatform } from '@/api/admin-brand-social.api';
import { PLATFORM } from './platforms';

/** The caption a platform gets: its own override, or the shared one. */
export const captionFor = (caption: string, captions: Partial<Record<SocialPlatform, string>> | null | undefined, p: SocialPlatform) =>
  (captions?.[p] ?? '').trim() ? captions![p]! : caption;

/** Hashtags written as "#tag", without duplicates. */
export function normaliseTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(`#${t}`);
  }
  return out;
}

/** Splits "a, #b c" into tags. */
export const parseTags = (s: string) => normaliseTags(s.split(/[\s,]+/));

/** Caption plus hashtags not already written in it, ready to post. */
export function fullText(caption: string, hashtags: string[]) {
  const lower = caption.toLowerCase();
  const extra = normaliseTags(hashtags).filter((t) => !lower.includes(t.toLowerCase()));
  return [caption.trim(), extra.join(' ')].filter(Boolean).join('\n\n');
}

/** Tags written inside a caption. */
export const tagsIn = (text: string) => text.match(/(^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0;

/** Character count as the platform counts it (X counts every link as 23). */
export function charCount(text: string, p: SocialPlatform) {
  const chars = [...text].length;
  if (p !== 'X') return chars;
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  return urls.reduce((n, u) => n - [...u].length + 23, chars);
}

/** Link with Nafaa's UTM tags for one platform. */
export function utmLink(link: string | null | undefined, p: SocialPlatform, campaign: string | null | undefined, code: string | null | undefined, medium = 'social') {
  if (!link?.trim()) return '';
  try {
    const u = new URL(link.trim().match(/^https?:\/\//) ? link.trim() : `https://${link.trim()}`);
    u.searchParams.set('utm_source', p.toLowerCase());
    u.searchParams.set('utm_medium', medium || 'social');
    if (campaign) u.searchParams.set('utm_campaign', slug(campaign));
    if (code) u.searchParams.set('utm_content', code);
    return u.toString();
  } catch {
    return '';
  }
}

export const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const isValidUrl = (s: string) => {
  try { const u = new URL(s.match(/^https?:\/\//) ? s : `https://${s}`); return !!u.hostname.includes('.'); } catch { return false; }
};

const ratio = (m: PostMedia) => (m.width && m.height ? m.width / m.height : null);

/** A warning the composer found itself (same shape as the API's, code optional). */
export interface LocalWarning { platform?: SocialPlatform | null; level: 'error' | 'warning'; code?: string; message: string }

/** Problems the composer can see before saving. */
export function localWarnings(input: {
  kind: PostKind; caption: string; captions: Partial<Record<SocialPlatform, string>>; hashtags: string[];
  media: PostMedia[]; platforms: SocialPlatform[]; link: string; scheduledAt: string | null;
}): LocalWarning[] {
  const out: LocalWarning[] = [];
  const { kind, media, platforms } = input;
  if (!platforms.length) out.push({ level: 'error', message: 'Pick at least one platform.' });
  if (!input.caption.trim() && !Object.values(input.captions).some((c) => c?.trim())) out.push({ level: 'warning', message: 'The caption is empty.' });
  if (input.link && !isValidUrl(input.link)) out.push({ level: 'error', message: 'The link is not a valid web address.' });
  if (input.scheduledAt && new Date(input.scheduledAt).getTime() < Date.now() - 60_000) out.push({ level: 'warning', message: 'The scheduled time has already passed. It will go out on the next publishing run.' });

  const videos = media.filter((m) => m.kind === 'video');
  if (kind === 'CAROUSEL' && media.length < 2) out.push({ level: 'error', message: 'A carousel needs at least 2 images or videos.' });
  if ((kind === 'REEL' || kind === 'VIDEO') && !videos.length) out.push({ level: 'error', message: `A ${kind === 'REEL' ? 'reel' : 'video'} needs a video file.` });

  for (const p of platforms) {
    const info = PLATFORM[p];
    const text = fullText(captionFor(input.caption, input.captions, p), input.hashtags);
    const n = charCount(text, p);
    if (n > info.limit) out.push({ platform: p, level: 'error', message: `${info.label} caption is ${n - info.limit} characters over the ${info.limit.toLocaleString('en-PK')} limit.` });
    if (info.hashtagLimit) {
      const tags = tagsIn(text);
      if (tags > info.hashtagLimit) out.push({ platform: p, level: 'error', message: `${info.label} allows ${info.hashtagLimit} hashtags; this has ${tags}.` });
    }
    if (p === 'INSTAGRAM') {
      if (!media.length) out.push({ platform: p, level: 'error', message: 'Instagram needs at least one image or video.' });
      if (media.length > 10) out.push({ platform: p, level: 'error', message: 'An Instagram carousel holds up to 10 items.' });
      if (kind !== 'REEL' && kind !== 'STORY') {
        for (const m of media) {
          const r = ratio(m);
          if (r && (r < 0.8 - 0.01 || r > 1.91 + 0.01)) { out.push({ platform: p, level: 'warning', message: 'An image is outside Instagram\'s 4:5 to 1.91:1 shape and will be cropped or refused.' }); break; }
        }
      }
      if (kind === 'REEL') {
        const v = videos[0];
        if (v?.durationSec && (v.durationSec < 3 || v.durationSec > 90)) out.push({ platform: p, level: 'error', message: `Instagram reels must be 3 to 90 seconds; this video is ${Math.round(v.durationSec)} s.` });
        const r = v ? ratio(v) : null;
        if (r && Math.abs(r - 9 / 16) > 0.03) out.push({ platform: p, level: 'warning', message: 'Reels look best as 9:16 vertical video.' });
      }
    }
    if (p === 'TIKTOK' && !videos.length) out.push({ platform: p, level: 'warning', message: 'TikTok posts are usually videos.' });
    if (p === 'YOUTUBE' && !videos.length) out.push({ platform: p, level: 'error', message: 'YouTube needs a video.' });
    if (p === 'PINTEREST' && !media.length) out.push({ platform: p, level: 'error', message: 'Pinterest needs an image.' });
  }
  return out;
}

/** Copies text and reports success. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Downloads a file from its URL (falls back to opening it). */
export async function downloadUrl(url: string, name?: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch');
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href, download: name ?? url.split('/').pop()?.split('?')[0] ?? 'media' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export const fmtBytes = (b: number | null | undefined) =>
  !b ? '—' : b < 1024 ** 2 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 ** 2).toFixed(b < 10 * 1024 ** 2 ? 1 : 0)} MB`;

export const fmtDuration = (s: number | null | undefined) => (s == null ? '' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
