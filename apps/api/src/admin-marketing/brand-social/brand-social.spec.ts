/**
 * Nafaa Social pure rules: platform validation, UTM tagging, the status
 * machine, publisher decisions and retry timing, pack.json parsing,
 * settings defaults and media size reading.
 */
import {
  canTransition, cleanHashtags, dispatchFor, duePlatforms, MAX_ATTEMPTS, missedWindow, mp4Info, normalizeSettings, parsePack, parsePktDateTime,
  readMediaInfo, retryAt, statusAfterEdit, summarize, tagLink, textFor, validatePost, approvedStatus, platformFrom,
} from './brand-social.logic';
import type { PostMediaItem, PublishStateMap } from './brand-social.types';

const img = (w: number, h: number): PostMediaItem => ({ url: 'https://x/a.jpg', kind: 'image', width: w, height: h });
const vid = (w: number, h: number, d: number): PostMediaItem => ({ url: 'https://x/a.mp4', kind: 'video', width: w, height: h, durationSec: d });
const base = { code: 'abc123', caption: 'Hello shops', hashtags: [] as string[], link: null, campaign: null, captions: {}, firstComment: null };

describe('UTM tagging', () => {
  it('adds source, medium, campaign and content', () => {
    const u = new URL(tagLink('https://nafaa.pk/pricing', { platform: 'INSTAGRAM', code: 'k7m2qp', campaign: 'December Launch' }));
    expect(u.searchParams.get('utm_source')).toBe('instagram');
    expect(u.searchParams.get('utm_medium')).toBe('social');
    expect(u.searchParams.get('utm_campaign')).toBe('december-launch');
    expect(u.searchParams.get('utm_content')).toBe('k7m2qp');
  });
  it('keeps a campaign already on the link when the post has none, and other params', () => {
    const u = new URL(tagLink('https://nafaa.pk/?utm_campaign=eid&ref=1', { platform: 'X', code: 'c1' }));
    expect(u.searchParams.get('utm_campaign')).toBe('eid');
    expect(u.searchParams.get('ref')).toBe('1');
    expect(u.searchParams.get('utm_source')).toBe('x');
  });
  it('leaves non-web links alone', () => {
    expect(tagLink('mailto:a@b.c', { platform: 'X', code: 'c' })).toBe('mailto:a@b.c');
  });
  it('puts the link in the text where it is clickable, not on Instagram', () => {
    const p = { ...base, link: 'https://nafaa.pk', media: [img(1080, 1080)] };
    expect(textFor(p, 'X')).toContain('utm_source=x');
    expect(textFor(p, 'INSTAGRAM')).not.toContain('https://');
    expect(textFor({ ...p, media: [] }, 'FACEBOOK')).not.toContain('https://');
    expect(textFor(p, 'FACEBOOK')).toContain('utm_source=facebook');
  });
  it('adds hashtags not already in the caption and uses platform overrides', () => {
    const p = { ...base, caption: 'Hi #Nafaa', hashtags: ['#Nafaa', '#POS'], captions: { X: 'Short one' }, media: [] };
    expect(textFor(p, 'FACEBOOK')).toBe('Hi #Nafaa\n\n#POS');
    expect(textFor(p, 'X')).toBe('Short one\n\n#Nafaa #POS');
  });
  it('cleans hashtags', () => {
    expect(cleanHashtags(['nafaa', '#Nafaa', ' pos shop', ''])).toEqual(['#nafaa', '#pos', '#shop']);
  });
});

describe('platform validation', () => {
  const v = (o: Partial<Parameters<typeof validatePost>[0]>) => validatePost({ ...base, kind: 'POST', platforms: ['INSTAGRAM'], media: [], ...o });
  const codes = (o: Partial<Parameters<typeof validatePost>[0]>) => v(o).map((w) => `${w.platform ?? '*'}:${w.code}:${w.level}`);

  it('Instagram needs media', () => expect(codes({})).toContain('INSTAGRAM:needs_media:error'));
  it('Instagram feed ratio 4:5 to 1.91:1', () => {
    expect(codes({ media: [img(1080, 1350)] })).toEqual([]);
    expect(codes({ media: [img(1080, 1920)] })).toContain('INSTAGRAM:image_ratio:error');
    expect(codes({ media: [img(2000, 1000)] })).toContain('INSTAGRAM:image_ratio:error');
  });
  it('reels: 3 to 90 seconds, 9:16', () => {
    expect(codes({ kind: 'REEL', media: [vid(1080, 1920, 30)] })).toEqual([]);
    expect(codes({ kind: 'REEL', media: [vid(1080, 1920, 120)] })).toContain('INSTAGRAM:reel_length:error');
    expect(codes({ kind: 'REEL', media: [vid(1920, 1080, 30)] })).toContain('INSTAGRAM:reel_ratio:warning');
    expect(codes({ kind: 'REEL', media: [img(1080, 1350)] })).toContain('*:needs_video:error');
  });
  it('carousel up to 10', () => {
    expect(codes({ kind: 'CAROUSEL', media: Array.from({ length: 11 }, () => img(1080, 1080)) })).toContain('INSTAGRAM:carousel_long:error');
  });
  it('caption limits and hashtags', () => {
    expect(codes({ platforms: ['X'], caption: 'a'.repeat(281) })).toContain('X:caption_long:error');
    expect(codes({ platforms: ['X'], caption: 'a'.repeat(280) })).toEqual([]);
    expect(codes({ platforms: ['THREADS'], caption: 'a'.repeat(501) })).toContain('THREADS:caption_long:error');
    expect(codes({ media: [img(1080, 1080)], hashtags: Array.from({ length: 31 }, (_, i) => `#t${i}`) })).toContain('INSTAGRAM:hashtags_many:error');
    expect(codes({ platforms: ['LINKEDIN'], caption: 'a'.repeat(3001) })).toContain('LINKEDIN:caption_long:error');
  });
  it('video platforms need video', () => {
    expect(codes({ platforms: ['YOUTUBE'], media: [img(1, 1)] })).toContain('YOUTUBE:needs_video:error');
    expect(codes({ platforms: ['TIKTOK'] })).toContain('TIKTOK:needs_media:error');
  });
  it('no platforms is an error', () => expect(codes({ platforms: [] })).toContain('*:no_platforms:error'));
});

describe('status machine', () => {
  it('allows the review flow', () => {
    expect(canTransition('DRAFT', 'IN_REVIEW')).toBe(true);
    expect(canTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('IN_REVIEW', 'REJECTED')).toBe(true);
    expect(canTransition('APPROVED', 'SCHEDULED')).toBe(true);
    expect(canTransition('SCHEDULED', 'PUBLISHING')).toBe(true);
    expect(canTransition('PUBLISHING', 'PUBLISHED')).toBe(true);
  });
  it('blocks moves that skip or undo publishing', () => {
    expect(canTransition('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransition('REJECTED', 'APPROVED')).toBe(false);
    expect(canTransition('IDEA', 'PUBLISHING')).toBe(false);
    expect(canTransition('ARCHIVED', 'SCHEDULED')).toBe(false);
  });
  it('edits send approved posts back to review only when approval is required', () => {
    expect(statusAfterEdit('SCHEDULED', true)).toBe('IN_REVIEW');
    expect(statusAfterEdit('SCHEDULED', false)).toBe('SCHEDULED');
    expect(statusAfterEdit('REJECTED', true)).toBe('DRAFT');
    expect(statusAfterEdit('DRAFT', true)).toBe('DRAFT');
  });
  it('approval lands on SCHEDULED with a time', () => {
    expect(approvedStatus(new Date())).toBe('SCHEDULED');
    expect(approvedStatus(null)).toBe('APPROVED');
  });
});

describe('publisher', () => {
  const now = Date.parse('2026-12-01T10:00:00Z');
  const acc = (platform: string, status: string, autoPublish: boolean) => ({ platform, status, autoPublish });

  it('publishes only with a connected account and auto-publish on', () => {
    expect(dispatchFor('FACEBOOK', [acc('FACEBOOK', 'CONNECTED', true)])).toEqual({ action: 'auto' });
    expect(dispatchFor('FACEBOOK', [acc('FACEBOOK', 'CONNECTED', false)])).toEqual({ action: 'handoff' });
    expect(dispatchFor('INSTAGRAM', [])).toEqual({ action: 'handoff' });
    expect(dispatchFor('TIKTOK', [acc('TIKTOK', 'MANUAL', false)])).toEqual({ action: 'handoff' });
    expect(dispatchFor('INSTAGRAM', [acc('INSTAGRAM', 'NEEDS_RECONNECT', true)]).action).toBe('fail');
    expect(dispatchFor('FACEBOOK', [acc('FACEBOOK', 'DISCONNECTED', true)])).toEqual({ action: 'handoff' });
  });
  it('retries after 5, 15 and 60 minutes, then stops', () => {
    expect(retryAt(1, true, now)!.getTime() - now).toBe(5 * 60_000);
    expect(retryAt(2, true, now)!.getTime() - now).toBe(15 * 60_000);
    expect(retryAt(3, true, now)!.getTime() - now).toBe(60 * 60_000);
    expect(retryAt(MAX_ATTEMPTS, true, now)).toBeNull();
    expect(retryAt(1, false, now)).toBeNull();
  });
  it('picks due platforms', () => {
    const at = new Date(now - 60_000).toISOString();
    const state: PublishStateMap = {
      FACEBOOK: { status: 'PUBLISHED', attempts: 1, at },
      INSTAGRAM: { status: 'FAILED', attempts: 1, at, willRetry: true, nextAt: new Date(now - 1).toISOString() },
      X: { status: 'HANDOFF', attempts: 0, at },
    };
    expect(duePlatforms(['FACEBOOK', 'INSTAGRAM', 'X', 'TIKTOK'], state, now)).toEqual(['INSTAGRAM', 'TIKTOK']);
    state.INSTAGRAM!.nextAt = new Date(now + 60_000).toISOString();
    expect(duePlatforms(['INSTAGRAM'], state, now)).toEqual([]);
  });
  it('summarizes the post status', () => {
    const at = new Date().toISOString();
    expect(summarize(['FACEBOOK'], { FACEBOOK: { status: 'PUBLISHED', attempts: 1, at } }).status).toBe('PUBLISHED');
    expect(summarize(['FACEBOOK', 'X'], { FACEBOOK: { status: 'PUBLISHED', attempts: 1, at }, X: { status: 'HANDOFF', attempts: 0, at } })).toEqual({ status: 'PUBLISHING', nextRunAt: null });
    expect(summarize(['FACEBOOK', 'X'], { FACEBOOK: { status: 'PUBLISHED', attempts: 1, at }, X: { status: 'SKIPPED', attempts: 0, at } }).status).toBe('PUBLISHED');
    expect(summarize(['FACEBOOK', 'INSTAGRAM'], { FACEBOOK: { status: 'PUBLISHED', attempts: 1, at }, INSTAGRAM: { status: 'FAILED', attempts: 4, at } }).status).toBe('PARTIAL');
    expect(summarize(['FACEBOOK'], { FACEBOOK: { status: 'FAILED', attempts: 4, at } }).status).toBe('FAILED');
    const retry = summarize(['FACEBOOK'], { FACEBOOK: { status: 'FAILED', attempts: 1, at, willRetry: true, nextAt: '2030-01-01T00:00:00.000Z' } });
    expect(retry.status).toBe('PUBLISHING');
    expect(retry.nextRunAt?.toISOString()).toBe('2030-01-01T00:00:00.000Z');
  });
  it('does not publish posts that missed their time by a day', () => {
    expect(missedWindow(new Date(now - 25 * 3600_000), now)).toBe(true);
    expect(missedWindow(new Date(now - 3600_000), now)).toBe(false);
  });
});

describe('dates', () => {
  it('reads Pakistan time without an offset', () => {
    expect(parsePktDateTime('2026-12-01T19:30')!.toISOString()).toBe('2026-12-01T14:30:00.000Z');
    expect(parsePktDateTime('2026-12-01 09:05')!.toISOString()).toBe('2026-12-01T04:05:00.000Z');
    expect(parsePktDateTime('2026-12-01T19:30:00Z')!.toISOString()).toBe('2026-12-01T19:30:00.000Z');
    expect(parsePktDateTime('2026-12-01T19:30:00+05:00')!.toISOString()).toBe('2026-12-01T14:30:00.000Z');
    expect(parsePktDateTime('next tuesday')).toBeNull();
  });
});

describe('pack.json', () => {
  const now = Date.parse('2026-11-20T00:00:00Z');
  const files = new Set(['media/reel1.mp4', 'img/a.JPG']);

  it('parses posts and matches media by file name', () => {
    const r = parsePack({
      campaign: 'December Launch',
      posts: [
        { title: 'Reel', kind: 'reel', platforms: ['instagram', 'fb', 'tiktok'], scheduledAt: '2026-12-01T19:30', media: ['reel1.mp4'], caption: 'Hi', hashtags: ['nafaa'] },
        { title: 'Pic', platforms: ['X'], media: ['A.jpg'], captions: { twitter: 'short' } },
      ],
    }, files, now);
    expect(r.campaign).toBe('December Launch');
    expect(r.skipped).toEqual([]);
    expect(r.posts[0]).toMatchObject({ kind: 'REEL', platforms: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'], hashtags: ['#nafaa'] });
    expect(r.posts[0].scheduledAt!.toISOString()).toBe('2026-12-01T14:30:00.000Z');
    expect(r.posts[1].captions).toEqual({ X: 'short' });
  });
  it('skips bad posts with a reason', () => {
    const r = parsePack({ posts: [
      { title: 'a', platforms: ['myspace'], caption: 'x' },
      { title: 'b', platforms: ['X'], media: ['missing.png'] },
      { title: 'c', platforms: ['X'], scheduledAt: '2026-01-01T10:00', caption: 'x' },
      { title: 'd', platforms: ['X'], scheduledAt: 'soon', caption: 'x' },
      { title: 'e', platforms: ['X'] },
    ] }, files, now);
    expect(r.posts).toHaveLength(0);
    expect(r.skipped.map((s) => s.reason)).toEqual([
      'Unknown platforms: myspace.', 'Media not in the zip: missing.png.', 'scheduledAt 2026-01-01T10:00 is in the past.',
      'Unreadable scheduledAt "soon".', 'No caption and no media.',
    ]);
  });
  it('rejects a pack without posts', () => {
    expect(() => parsePack({}, files, now)).toThrow('posts');
    expect(() => parsePack([], files, now)).toThrow();
  });
  it('knows platform aliases', () => {
    expect(platformFrom('ig')).toBe('INSTAGRAM');
    expect(platformFrom('WhatsApp')).toBe('WHATSAPP_CHANNEL');
    expect(platformFrom('google-business')).toBe('GOOGLE_BUSINESS');
  });
});

describe('settings', () => {
  it('fills defaults and drops bad values', () => {
    const s = normalizeSettings({ requireApproval: false, bestTimes: { X: ['25:00', '09:00'], NOPE: ['10:00'] }, pillars: [{ label: 'Tips', color: 'red' }], adAccountId: 'act_123' });
    expect(s.requireApproval).toBe(false);
    expect(s.autoApproveAiDrafts).toBe(false);
    expect(s.paused).toBe(false);
    expect(s.bestTimes).toEqual({ X: ['09:00'] });
    expect(s.pillars).toEqual([{ key: 'tips', label: 'Tips', color: '#64748b' }]);
    expect(s.adAccountId).toBe('123');
    expect(normalizeSettings(null).requireApproval).toBe(true);
  });
});

describe('media size reading', () => {
  it('reads PNG size', () => {
    const b = new Uint8Array(32);
    b.set([0x89, 0x50, 0x4e, 0x47], 0);
    b.set([0, 0, 4, 56], 16); // 1080
    b.set([0, 0, 5, 70], 20); // 1350
    expect(readMediaInfo(b)).toMatchObject({ kind: 'image', mime: 'image/png', width: 1080, height: 1350 });
  });
  it('reads JPEG size from the SOF marker', () => {
    const b = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 17, 8, 0x07, 0x80, 0x04, 0x38, 3, 0, 0, 0, 0, 0, 0]);
    expect(readMediaInfo(b)).toMatchObject({ mime: 'image/jpeg', width: 1080, height: 1920 });
  });
  it('reads MP4 duration and size', () => {
    const box = (type: string, body: Uint8Array) => {
      const out = new Uint8Array(8 + body.length);
      new DataView(out.buffer).setUint32(0, out.length);
      out.set([...type].map((c) => c.charCodeAt(0)), 4);
      out.set(body, 8);
      return out;
    };
    const mvhd = new Uint8Array(100);
    new DataView(mvhd.buffer).setUint32(12, 1000); // timescale
    new DataView(mvhd.buffer).setUint32(16, 15_500); // duration
    const tkhd = new Uint8Array(84);
    new DataView(tkhd.buffer).setUint32(76, 1080 * 65536);
    new DataView(tkhd.buffer).setUint32(80, 1920 * 65536);
    const trak = box('trak', box('tkhd', tkhd));
    const moov = box('moov', new Uint8Array([...box('mvhd', mvhd), ...trak]));
    const ftyp = box('ftyp', new Uint8Array([...'isom'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0])));
    const file = new Uint8Array([...ftyp, ...moov]);
    expect(mp4Info(file)).toEqual({ width: 1080, height: 1920, durationSec: 15.5 });
    expect(readMediaInfo(file)).toMatchObject({ kind: 'video', mime: 'video/mp4', durationSec: 15.5 });
  });
});
