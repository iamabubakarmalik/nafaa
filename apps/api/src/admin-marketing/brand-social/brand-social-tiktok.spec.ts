/**
 * TikTok Direct Post rules: option cleaning, the checks that block a post,
 * the disclosure label and the post_info sent to TikTok.
 */
import {
  EMPTY_TIKTOK_OPTIONS, isTikTokDirect, mergePostOptions, normalizePostOptions, normalizeTikTokOptions, tiktokDisclosureLabel, tiktokOptionIssues, tiktokPostInfo,
  type TikTokCreatorLimits,
} from './brand-social-tiktok.logic';
import { tiktokSettingErrors, validatePost } from './brand-social.logic';
import type { PostMediaItem, TikTokPostOptions } from './brand-social.types';

const opts = (o: Partial<TikTokPostOptions> = {}): TikTokPostOptions => ({ ...EMPTY_TIKTOK_OPTIONS, ...o });
const creator = (o: Partial<TikTokCreatorLimits> = {}): TikTokCreatorLimits => ({
  privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'], commentDisabled: false, duetDisabled: false, stitchDisabled: false, maxVideoPostDurationSec: 600, ...o,
});
const video = { photo: false, durationSec: 30 };
const codes = (o: TikTokPostOptions | null, media = video, c?: TikTokCreatorLimits) => tiktokOptionIssues(o, media, c).map((i) => i.code);

describe('TikTok options cleaning', () => {
  it('starts with nothing chosen and every interaction off', () => {
    expect(normalizeTikTokOptions({})).toEqual(EMPTY_TIKTOK_OPTIONS);
  });
  it('drops unknown privacy levels and non-boolean flags', () => {
    expect(normalizeTikTokOptions({ privacyLevel: 'EVERYONE', allowComment: 'yes' })).toEqual(EMPTY_TIKTOK_OPTIONS);
  });
  it('brand choices only count while disclosure is on', () => {
    expect(normalizeTikTokOptions({ disclose: false, yourBrand: true, brandedContent: true })).toMatchObject({ yourBrand: false, brandedContent: false });
    expect(normalizeTikTokOptions({ disclose: true, yourBrand: true })).toMatchObject({ disclose: true, yourBrand: true, brandedContent: false });
  });
  it('unknown platform keys are dropped', () => {
    expect(normalizePostOptions({ facebook: { a: 1 } })).toEqual({});
    expect(normalizePostOptions(null)).toEqual({});
  });
  it('merge: present key replaces, missing key keeps, null clears', () => {
    const saved = { tiktok: opts({ privacyLevel: 'SELF_ONLY' }) };
    expect(mergePostOptions(saved, {})).toEqual(saved);
    expect(mergePostOptions(saved, { tiktok: { privacyLevel: 'PUBLIC_TO_EVERYONE' } }).tiktok?.privacyLevel).toBe('PUBLIC_TO_EVERYONE');
    expect(mergePostOptions(saved, { tiktok: null })).toEqual({});
    expect(mergePostOptions(saved, null)).toEqual({});
  });
});

describe('TikTok direct mode', () => {
  const acc = { platform: 'TIKTOK', status: 'CONNECTED', autoPublish: true, meta: { settings: { tiktokMode: 'DIRECT' } } };
  it('only a connected, auto-publishing account in "Post directly" mode', () => {
    expect(isTikTokDirect(acc)).toBe(true);
    expect(isTikTokDirect({ ...acc, meta: { settings: { tiktokMode: 'INBOX' } } })).toBe(false);
    expect(isTikTokDirect({ ...acc, meta: {} })).toBe(false);
    expect(isTikTokDirect({ ...acc, autoPublish: false })).toBe(false);
    expect(isTikTokDirect({ ...acc, status: 'NEEDS_RECONNECT' })).toBe(false);
  });
});

describe('TikTok checks', () => {
  it('privacy must be chosen', () => {
    expect(codes(null)).toEqual(['tiktok_privacy']);
    expect(codes(opts())).toEqual(['tiktok_privacy']);
    expect(codes(opts({ privacyLevel: 'SELF_ONLY' }))).toEqual([]);
  });
  it('disclosure on needs at least one choice', () => {
    expect(codes(opts({ privacyLevel: 'PUBLIC_TO_EVERYONE', disclose: true }))).toEqual(['tiktok_disclose_empty']);
    expect(codes(opts({ privacyLevel: 'PUBLIC_TO_EVERYONE', disclose: true, yourBrand: true }))).toEqual([]);
  });
  it('branded content cannot be Only me', () => {
    expect(codes(opts({ privacyLevel: 'SELF_ONLY', disclose: true, brandedContent: true }))).toEqual(['tiktok_branded_private']);
    expect(codes(opts({ privacyLevel: 'SELF_ONLY', disclose: true, yourBrand: true }))).toEqual([]);
    expect(codes(opts({ privacyLevel: 'FOLLOWER_OF_CREATOR', disclose: true, brandedContent: true }))).toEqual([]);
  });
  it('with creator_info: privacy must still be offered, video must fit', () => {
    expect(codes(opts({ privacyLevel: 'MUTUAL_FOLLOW_FRIENDS' }), video, creator())).toEqual(['tiktok_privacy_unavailable']);
    expect(codes(opts({ privacyLevel: 'SELF_ONLY' }), { photo: false, durationSec: 61 }, creator({ maxVideoPostDurationSec: 60 }))).toEqual(['tiktok_too_long']);
    expect(codes(opts({ privacyLevel: 'SELF_ONLY' }), { photo: true }, creator({ maxVideoPostDurationSec: 1 }))).toEqual([]);
  });
});

describe('TikTok disclosure label', () => {
  it('names the label TikTok adds', () => {
    expect(tiktokDisclosureLabel(opts(), false)).toBeNull();
    expect(tiktokDisclosureLabel(opts({ disclose: true }), false)).toBeNull();
    expect(tiktokDisclosureLabel(opts({ disclose: true, yourBrand: true }), false)).toContain('Promotional content');
    expect(tiktokDisclosureLabel(opts({ disclose: true, brandedContent: true }), true)).toBe('Your photo will be labeled as "Paid partnership".');
    expect(tiktokDisclosureLabel(opts({ disclose: true, yourBrand: true, brandedContent: true }), false)).toContain('Paid partnership');
  });
});

describe('TikTok post_info', () => {
  it('sends the chosen settings; interactions stay off unless turned on', () => {
    const r = tiktokPostInfo(opts({ privacyLevel: 'PUBLIC_TO_EVERYONE', allowComment: true }), creator(), video);
    expect(r).toEqual({ ok: true, info: {
      privacy_level: 'PUBLIC_TO_EVERYONE', disable_comment: false, disable_duet: true, disable_stitch: true, brand_content_toggle: false, brand_organic_toggle: false,
    } });
  });
  it('an interaction the creator turned off is always sent off', () => {
    const r = tiktokPostInfo(opts({ privacyLevel: 'SELF_ONLY', allowComment: true, allowDuet: true, allowStitch: true }), creator({ commentDisabled: true, stitchDisabled: true }), video);
    expect(r.ok && r.info).toMatchObject({ disable_comment: true, disable_duet: false, disable_stitch: true });
  });
  it('photos carry no duet or stitch fields', () => {
    const r = tiktokPostInfo(opts({ privacyLevel: 'SELF_ONLY', disclose: true, yourBrand: true }), creator(), { photo: true });
    expect(r.ok && r.info).toEqual({ privacy_level: 'SELF_ONLY', disable_comment: true, brand_content_toggle: false, brand_organic_toggle: true });
  });
  it('disclosure maps to the brand toggles', () => {
    const r = tiktokPostInfo(opts({ privacyLevel: 'PUBLIC_TO_EVERYONE', disclose: true, yourBrand: true, brandedContent: true }), creator(), video);
    expect(r.ok && r.info).toMatchObject({ brand_content_toggle: true, brand_organic_toggle: true });
  });
  it('stops with a plain reason when the choice is no longer allowed', () => {
    const r = tiktokPostInfo(opts({ privacyLevel: 'PUBLIC_TO_EVERYONE' }), creator({ privacyLevelOptions: ['SELF_ONLY'] }), video);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toContain('no longer offers "Everyone"');
    expect(tiktokPostInfo(null, creator(), video).ok).toBe(false);
  });
});

describe('TikTok checks in post validation', () => {
  const v: PostMediaItem = { url: 'https://x/a.mp4', kind: 'video', width: 1080, height: 1920, durationSec: 20 };
  const post = { code: 'abc123', caption: 'Hi', hashtags: [] as string[], link: null, campaign: null, captions: {}, firstComment: null, kind: 'REEL' as const, platforms: ['TIKTOK' as const], media: [v] };
  it('drafts mode needs no TikTok settings', () => {
    expect(tiktokSettingErrors(validatePost({ ...post, tiktokDirect: false }))).toEqual([]);
  });
  it('direct mode blocks until privacy is chosen', () => {
    const w = validatePost({ ...post, tiktokDirect: true });
    expect(tiktokSettingErrors(w).map((x) => x.code)).toEqual(['tiktok_privacy']);
    expect(tiktokSettingErrors(validatePost({ ...post, tiktokDirect: true, options: { tiktok: opts({ privacyLevel: 'SELF_ONLY' }) } }))).toEqual([]);
  });
});
